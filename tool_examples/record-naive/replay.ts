import path, { resolve } from 'path';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import assert from 'assert';
import { SourceCodeLocation } from '../../src/source_mappers/source_map';
import { readFileSync, writeFile, WriteFileOptions } from 'fs';
import { parse } from 'csv-parse/sync';
import { spawnMCUVM } from '../spawn_vm';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { BoardBaudRate } from '../../src/util/serial_port';
import { WritableWasmValue } from '../../src/tool_api/interrupts';
import { exit } from 'process';
import { getFileName } from '../../src';

const writeFlags: WriteFileOptions = {
  encoding: 'utf-8',
  flag: 'a',
  mode: 0o666,
};

class ReplayInstr {
  public readonly file: NonSharedBuffer;
  private records: string[][];
  private instructionCount: number;
  private interruptCount: number;
  public beginTime: number;
  private langAdaptor;
  constructor(
    private filename: string,
    public readonly vmConnection: WasmitoBackendVM,
    public readonly analysis: WasmAnalysis,
  ) {
    this.file = readFileSync(filename);
    this.records = parse(this.file);
    this.instructionCount = 0;
    this.interruptCount = 0;
    this.beginTime = 0;
    this.langAdaptor = vmConnection.languageAdaptor;
    console.log(this.records[this.instructionCount + this.interruptCount]);
  }

  public checkInstr(instr: WasmInstruction, args: WritableWasmValue[]) {
    console.log(this.records[this.interruptCount + this.instructionCount + 1]);
    const totalClock = this.interruptCount + this.instructionCount;
    if (totalClock + 1 >= this.records.length) {
      // clock is greater then the amount of recorded events...
      console.log('closing the vm');
      setImmediate(async () => {
        const endTime = performance.now();
        writeFile(
          resolve('./tool_examples/record-naive/bench-rep.csv'),
          `${this.filename},${endTime - this.beginTime}\n`,
          writeFlags,
          () => console.log('time written'),
        );
        await this.vmConnection.pause();
        await this.analysis.remove();
        await this.vmConnection.close();
        console.log(
          `replayTime in seconds: ${(endTime - this.beginTime) / 1000}`,
        );

        exit(0);
      });
      return args;
    }

    // if the instruction number matches, its an instruction, otherwise is must be an interrupt, as we now record everything naively
    const recordedInstr = this.records[totalClock + 1]; // record list
    if (this.instructionCount + 1 == parseInt(recordedInstr[0])) {
      this.instructionCount += 1;
      console.log(`${recordedInstr[4]}, ${instr.startAddress}`);
      const newArgs = recordedInstr[5].split(';');
      // assign all the recorded variables to the stack variables
      for (let i = 0; i < args.length; i++) {
        args[i].value = parseInt(newArgs[i]);
        console.log(`set arg ${args[i].value} to ${newArgs[i]}`);
      }
    } else {
      this.interruptCount += 1;
      const pin = parseInt(
        this.records[this.instructionCount + this.interruptCount][2].slice(
          'interrupt_'.length,
        ),
      );
      setImmediate(async () => {
        console.log(`do interrupt on pin ${pin}`);
        await this.vmConnection.simulateInterrupt(pin);
      });
    }

    return args;
  }
  public startTime(): void {
    this.beginTime = performance.now();
  }
}

async function main(): Promise<void> {
  const examplesDir = resolve('./app_examples/assemblyscript/');
  const mappingsPath = path.join(examplesDir, 'fib/mappings.json');
  const wasmPath = path.join(examplesDir, 'fib/wasm/fib.wasm');
  /*
  const examplesDir = resolve('./libs/WARDuino/benchmarks/tasks/catalan/wast/');
  const mappingsPath = path.join(examplesDir, 'mappings.json');
  const wasmPath = path.join(examplesDir, 'impl.wasm');
  */
  const langAdaptor = LanguageAdaptor.fromMappingsPath(mappingsPath, {
    // give the absolute path to the wasmModule
    newWasmPath: wasmPath,
    // allows relative paths in the debugging information
    // needed to ensure that all the CFG nodes are cosntructed
    relativePaths: true,
  });
  printMapping(langAdaptor);
  const wasm = new WasmModule(wasmPath);
  // const instr = wasm.getInstruction(0xee);
  // assert(instr !== undefined);
  // uncomment next to run analysis on local VM
  // const vmConnection = await spawnDevVM(wasm);
  // uncomment next to run analysis on MCU VM
  const vmConnection = await spawnMCUVM(wasm, {
    vmConfig: {
      pauseOnStart: true, // pause the VM on deploy of the Wasm module
      serialPort: '/dev/ttyUSB0',
      baudrate: BoardBaudRate.BD_115200,
      fqbn: {
        boardName: 'M5Stick-C',
        fqbn: 'm5stack:esp32:m5stick-c',
      },
    },
  });
  const analysis = new WasmAnalysis(wasm, vmConnection);
  const replayInstr = new ReplayInstr(
    resolve('./tool_examples/record-naive/recording.csv'),
    vmConnection,
    analysis,
  );
  function checkInstr(instr: WasmInstruction, args: WritableWasmValue[]) {
    args = replayInstr.checkInstr(instr, args);
    return args;
  }
  for (const func of wasm.functions) {
    for (const instr of func.allInstructions) {
      // register advice just before executing Wasm instruction i
      analysis.beforeMut(instr, checkInstr);
    }
  }

  // analysis.beforeHandlingInterrupt()
  await analysis.deploy();
  console.log('deployed');
  await analysis.run();
  replayInstr.startTime();
}

function printMapping(langAdaptor: LanguageAdaptor): void {
  const file = readFileSync(
    resolve('./tool_examples/record-naive/recording.csv'),
  );
  const records = parse(file);

  records.forEach((record) => {
    // const instrCount = record[0];
    // const intrpCount = record[1];
    const topic = record[2];
    // const payload = record[3];
    const instrAddr = record[4];
    const args = record[5];
    // console.log(record);
    if (topic != '') {
      console.log('this is an interrupt');
    } else {
      // console.log(parseInt(record[2]));
      const sourceLocations: SourceCodeLocation[] =
        langAdaptor.sourceMap.getOriginalPositionFor(parseInt(instrAddr));

      assert(sourceLocations.length <= 1);
      if (sourceLocations.length == 1) {
        const location = sourceLocations[0];
        // console.log(sourceCodeLocationToString(location));
        // console.log(getFunctionName(location));
        console.log(`${instrAddr}, `);
        if (args != '') {
          console.log(
            `${getFunctionName(location)} with arguments ${args.replace(';', ',')}`,
          );
        } else {
          console.log(`${getFunctionName(location)}`);
        }
      } else {
        console.log(`???`);
      }
    }
  });
}

function getFunctionName(location: SourceCodeLocation): string {
  // const src = readFileSync(location.source, 'utf-8');

  const src = readFileSync(
    `./app_examples/assemblyscript/${location.source}`,
    'utf-8',
  );

  const srcCodeLines = src.trim().split('\n');
  // the -1 is because line counts are mostly beginning at line 1 wheras the slice begins at 0;
  const srcCodeInstr = srcCodeLines[location.linenr - 1].slice(
    location.colnr,
    srcCodeLines[location.linenr - 1].length - 1,
  );
  return srcCodeInstr;
}

main();
