import path, { resolve } from 'path';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import assert from 'assert';
import { SourceCodeLocation } from '../../src/source_mappers/source_map';
import { readFileSync, writeFile, WriteFileOptions } from 'fs';
import { parse } from 'csv-parse/sync';
import { spawnMCUVM, spawnDevVM, connectToExistingDevVM } from '../spawn_vm';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { BoardBaudRate } from '../../src/util/serial_port';
import { WritableWasmValue } from '../../src/tool_api/interrupts';
import { exit } from 'process';

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
  private recordIndex: number;
  public beginTime: number;
  public readonly vmConnection: WasmitoBackendVM;
  public readonly analysis: WasmAnalysis;
  constructor(
    public filename: string,
    vmConnection: WasmitoBackendVM,
    analysis: WasmAnalysis,
  ) {
    this.file = readFileSync(filename);
    this.records = parse(this.file);
    this.instructionCount = 0;
    this.interruptCount = 0;
    this.vmConnection = vmConnection;
    this.recordIndex = 1;
    this.beginTime = 0;
    this.analysis = analysis;
    console.log(this.records[this.recordIndex]);
  }
  public checkInstr(instr: WasmInstruction, args: WritableWasmValue[]) {
    if (this.recordIndex >= this.records.length) {
      console.log('closing the vm');
      setImmediate(async () => {
        const endTime = performance.now();
        writeFile(
          resolve('./tool_examples/record-optimized/bench-rep.csv'),
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
    const currentRecord = this.records[this.recordIndex];

    if (currentRecord[2] != '') {
      // is it an interrupt
      // check the timings
      if (this.instructionCount != parseInt(currentRecord[0])) {
        this.instructionCount += 1;
        return args;
      }
      // if its an interrupt and the clock is correct.
      this.interruptCount += 1;
      const pin = parseInt(currentRecord[2].slice('interrupt_'.length));
      setImmediate(async () => {
        console.log(`do interrupt on pin ${pin}`);
        await this.vmConnection.simulateInterrupt(pin);
      });
      this.recordIndex += 1;
    } else if (this.instructionCount + 1 == parseInt(currentRecord[0])) {
      this.instructionCount += 1;
      console.log(
        `(before assert) This Record: ${currentRecord}, m5s startadress : ${instr.startAddress}\n`,
      );
      assert(parseInt(currentRecord[4]) == instr.startAddress);
      console.log('assert did not fail');

      const newArgs = this.records[this.recordIndex][5].split(';');
      // assign all the recorded variables to the stack variables
      for (let i = 0; i < args.length; i++) {
        args[i].value = parseInt(newArgs[i]);
        console.log(`set arg ${args[i].value} to ${newArgs[i]}`);
      }
      this.recordIndex += 1;
    } else {
      if (
        this.instructionCount + 1 >
        parseInt(this.records[this.recordIndex][0])
      ) {
        console.log('too late');
      }
      console.log('waiting for clock');
      this.instructionCount += 1;
    }
    console.log(`inst count ${this.instructionCount}`);
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
  const examplesDir = resolve('./libs/WARDuino/benchmarks/tasks/fac/wast/');
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
  // const vmConnection = await connectToExistingDevVM(wasm, 8000);
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

  /*
  const vmConnection = await connectToExistingMCUVM(wasm, {
    vmConfig: {
      pauseOnStart: true, // pause the VM on deploy of the Wasm module
      serialPort: '/dev/ttyUSB1',
      baudrate: BoardBaudRate.BD_115200,
      fqbn: {
        boardName: 'M5Stick-C',
        fqbn: 'm5stack:esp32:m5stick-c',
      },
    },
  });
  */
  const analysis = new WasmAnalysis(wasm, vmConnection);
  const replayInstr = new ReplayInstr(
    resolve('./tool_examples/record-optimized/recording.csv'),
    vmConnection,
    analysis,
  );
  function checkInstr(instr: WasmInstruction, args: WritableWasmValue[]) {
    args = replayInstr.checkInstr(instr, args);
    return args;
  }

  let instrumentedCount = 0;
  for (const f of wasm.functions) {
    for (const i of f.allInstructions) {
      instrumentedCount++;
      analysis.beforeMut(i, checkInstr);
    }
  }
  console.log(`#instrumented instructions ${instrumentedCount}`);

  // analysis.beforeHandlingInterrupt()
  await analysis.deploy();
  console.log('deployed');
  await analysis.run();
  replayInstr.startTime();
}

function printMapping(langAdaptor: LanguageAdaptor): void {
  const file = readFileSync(
    resolve('./tool_examples/record-optimized/recording.csv'),
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
  const src = readFileSync(
    `./app_examples/assemblyscript/${location.source}`,
    'utf-8',
  );

  // const src = readFileSync(location.source, 'utf-8');

  const srcCodeLines = src.trim().split('\n');
  // the -1 is because line counts are mostly beginning at line 1 wheras the slice begins at 0;
  const srcCodeInstr = srcCodeLines[location.linenr - 1].slice(
    location.colnr,
    srcCodeLines[location.linenr - 1].length - 1,
  );
  return srcCodeInstr;
}

main();
