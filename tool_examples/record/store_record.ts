import * as fs from 'fs';
import {
  isRecordInterrupt,
  Record,
  RecordInstruction,
  RecordInterrupt,
  sortRecords,
} from './record_item';
import { getGlobalLogger } from '../../src/logger/logger';
import assert from 'assert';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WASM } from '../../src/webassembly/wasm';
import { LogicalClock } from './logical_clock';

const CSVHeader = [
  'lcins',
  'lcint',
  'topic',
  'payload',
  'addr',
  'name',
  'args',
];

function wasmValueToString(v: ReadOnlyWasmValue): string {
  const typeHex = WASM.typeToHex.get(v.type);
  assert(typeHex !== undefined);
  return `${typeHex}_${v.value}`;
}

function wasmValuesToString(values: ReadOnlyWasmValue[]): string {
  // args are seperated with ;
  return values.map(wasmValueToString).join(';');
}

function stringToWasmValue(s: string): ReadOnlyWasmValue {
  const parsed = s.split('_');
  assert(
    parsed.length === 2,
    `the arg has not the expected structure type_value. Given '${s}'`,
  );
  const [typeUnparsed, valueUnparsed] = parsed;
  const type = WASM.hexToType.get(typeUnparsed);
  assert(type !== undefined, `arg type is invalid given '${typeUnparsed}'`);
  const value = Number(valueUnparsed);
  assert(
    !isNaN(value),
    `arg value could not be converted to number given '${valueUnparsed}'`,
  );
  const wasmValue: WASM.Value = {
    type,
    value,
  };
  return new ReadOnlyWasmValue(wasmValue.type, wasmValue.value);
}

function stringToWasmValues(values: string): ReadOnlyWasmValue[] {
  if (values === '') return [];
  return values.split(';').map(stringToWasmValue);
}

export class RecordWriter {
  private readonly maxBuffer: number;
  private readonly filepath: string;
  private firstWrite: boolean;
  private records: Record[];

  constructor(filepath: string, maxBuffer: number = 300) {
    this.filepath = filepath;
    this.maxBuffer = maxBuffer;
    this.firstWrite = true;
    this.records = [];
  }

  writeRecord(record: Record): void {
    this.records.push(record);
    if (this.records.length > this.maxBuffer) {
      const preprendNewline = !this.firstWrite;
      this.write(preprendNewline);
    }
  }
  private recordToRow(r: Record): string {
    const row: string[] = [];
    row.push(`${r.clock.instrs}`);
    row.push(`${r.clock.interrupts}`);
    if (isRecordInterrupt(r)) {
      row.push(r.topic, r.payload, '', '', '');
    } else {
      row.push(
        '',
        '',
        `${r.instrAddr}`,
        r.instrName,
        wasmValuesToString(r.instrArgs),
      );
    }
    return row.join(',');
  }

  private write(preprendNewline: boolean): void {
    // transform to promise
    const rows: string[] = [];
    if (this.firstWrite) {
      rows.push(CSVHeader.join(','));
      this.firstWrite = false;
    }
    rows.push(...this.records.map(this.recordToRow));
    let data = rows.join('\n');
    if (preprendNewline) {
      data = `\n${data}`;
    }
    try {
      fs.appendFileSync(this.filepath, data, 'utf-8');
      this.records.length = 0;
    } catch (err) {
      getGlobalLogger().error(`Error writing to file ${this.filepath}. ${err}`);
    }
  }

  async close(): Promise<void> {
    this.write(true);
  }
}

export function loadRecords(filePath: string): Record[] {
  const content: Buffer = fs.readFileSync(filePath);
  const lines = content.toString().split('\n');
  const records: Record[] = [];
  for (let idx = 0; idx < lines.length; idx++) {
    // skip header
    if (idx === 0) continue;

    const row = lines[idx].trim().split(',');
    assert(
      row.length === CSVHeader.length,
      `the csv row does not match the header length. Expected ${CSVHeader.length} Given ${row.length}. Row ${row}`,
    );
    const [lcins, lcint, topic, payload, addr, name, args] = row;
    const lc = parseLogicalClock(lcins, lcint);
    if (topic !== '') records.push(parseRecordInterrupt(lc, topic, payload));
    else records.push(parseRecordInstr(lc, addr, name, args));
  }
  return sortRecords(records);
}

function parseLogicalClock(
  lcInstr: string,
  lcInterrupts: string,
): LogicalClock {
  const instrs = Number(lcInstr);
  const interrupts = Number(lcInterrupts);
  assert(
    !isNaN(instrs) && !isNaN(interrupts),
    `Given a non number LogicalClock. Given LC{instrs='${lcInstr},interrupts=${lcInterrupts}}'`,
  );
  return {
    instrs: instrs,
    interrupts: interrupts,
  };
}

function parseRecordInterrupt(
  lc: LogicalClock,
  topic: string,
  payload: string,
): RecordInterrupt {
  assert(
    topic !== '',
    `Given an invalid interrupt. Topic should be non empty. Interrupt{topic='${topic},payload='${payload}'}`,
  );
  return {
    payload,
    topic,
    pin: WASM.interruptTopicToPinNumber(topic),
    clock: lc,
  };
}

function parseRecordInstr(
  lc: LogicalClock,
  addrStr: string,
  nameStr: string,
  argsStr: string,
): RecordInstruction {
  const addr = Number(addrStr);
  assert(
    !isNaN(addr),
    `Given Instr addr is not a number. Given addr='${addrStr}'`,
  );
  const args = stringToWasmValues(argsStr);
  return {
    clock: lc,
    instrAddr: addr,
    instrName: nameStr,
    instrArgs: args,
  };
}
