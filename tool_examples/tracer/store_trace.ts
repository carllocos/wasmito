import { type WasmState } from '../../src/webassembly/wasm';
import * as fs from 'fs';
import { type WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { PlaceholderType } from '../../src/webassembly/wasm/opcode_type';
import { SourceCFGNode } from '../../src/cfg/source_cfg';
import { getGlobalLogger } from '../../src/logger/logger';
import path from 'path';

class WriteCSV {
    private readonly maxBuffer: number;
    private readonly filepath: string;
    private content: string[] = [];
    private firstWrite: boolean;
    private readonly header: string[];

    constructor(filepath: string, maxBuffer: number, header: string[]) {
        this.filepath = filepath;
        this.maxBuffer = maxBuffer;
        this.header = header;
        this.firstWrite = true;
    }

    public write(row: string[]): void {
        if (row.length !== this.header.length) {
            throw new Error(`Row length ${row.length} does not match header length ${this.header.length}`);
        }
        if (this.firstWrite) {
            const headerStr = `${this.header.join(",")}\n`;
            fs.writeFileSync(this.filepath, headerStr, 'utf-8');
            this.firstWrite = false;
        }

        this.content.push(row.join(","));
        this.writeBuffer();
    }

    private writeBuffer(force: boolean = false): void {
        if (this.content.length >= this.maxBuffer || force) {
            const data = this.content.join('\n');
            fs.appendFile(this.filepath, data, 'utf-8', (err) => {
                if (err !== null) {
                    getGlobalLogger().error(`Error writing to file ${this.filepath}`);
                }
            });
            this.content = [];
        }
    }

    public close(): void {
        const force = true;
        this.writeBuffer(force);
    }
}

export class StoreTrace {
    private readonly writer: WriteCSV;
    private readonly befores: Map<
        number,
        [number, WasmInstruction, string, number[]]
    >;

    constructor(output: string, bufferSize: number) {
        this.writer = new WriteCSV(
            output,
            bufferSize,
            ['source', 'linenr', 'colnr', 'addr', 'opcode', 'labels', 'operands']
        );
        this.befores = new Map();
    }

    private addBefore(addr: number, instruction: WasmInstruction): void {
        this.befores.set(addr, [
            addr,
            instruction,
            instruction.getArgs().join(' '),
            [],
        ]);
    }

    private writeBefore(
        n: SourceCFGNode,
        state: WasmState,
    ): void {
        const address = n.sourceLocation.address;
        const val = this.befores.get(address);
        if (val === undefined) {
            getGlobalLogger().error(`No before saved for address ${address}`);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [addr, opcode, labels, _args] = val;
        const opcodeType = opcode.signature;
        if (opcodeType instanceof PlaceholderType) {
            getGlobalLogger().error(
                `Opcode Type still needs to be determined for opcode: ${opcode.name} at addr ${address}`,
            );
            return;
        }
        const operands: number[] = [];
        if (opcode.immediate !== undefined) {
            operands.push(opcode.immediate);
        }

        if (state.pc !== address) {
            getGlobalLogger().error(
                `Monitored before addr does not match monitored pc: expected ${address} got ${state.pc}`,
            );
        } else if (state.stack !== undefined) {
            if (state.stack.length < opcodeType.nrArgs) {
                getGlobalLogger().error(
                    `Stack contains insufficient values for to be used as arguments for opcode ${opcode.name} ${labels}. Opcode expects #${opcode.signature.nrArgs} stack has size #${state.stack.length}`,
                );
            } else if (opcodeType.nrArgs > 0) {
                const ops = state.stack.slice(
                    state.stack.length - opcode.signature.nrArgs,
                    state.stack.length,
                );
                ops.forEach((o) => {
                    operands.push(o.value);
                });
                this.befores.set(address, [addr, opcode, labels, operands]);
            }
        } else {
            getGlobalLogger().error(
                `Stack is undefined for ${opcode.name} ${labels} address #${address}`,
            );
        }
        const sl = n.sourceLocation;
        const source = path.basename(sl.source);
        const row = [source, `${sl.linenr}`, `${sl.colnr}`, `${sl.address}`, opcode.name, labels, operands.join(' ')]
        this.writer.write(row);
    }

    close() {
        this.writer.close();
    }

    write(n: SourceCFGNode): (state: WasmState) => void {
        this.addBefore(n.sourceLocation.address, n.instructions[0]);
        const w = (state: WasmState) => {
            this.writeBefore(n, state);
        };
        w.bind(this);
        return w;
    }
}

