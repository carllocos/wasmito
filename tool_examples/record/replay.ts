import path, { resolve } from 'path';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import assert from 'assert';
import { SourceCodeLocation } from '../../src/source_mappers/source_map';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { BoardBaudRate } from '../../src/util/serial_port';
import {
  ReadOnlyWasmValue,
  ReadOnlyInterrupt,
  WritableWasmValue,
} from '../../src/tool_api/interrupts';

class ReplayInstr {
  public readonly file: NonSharedBuffer;
  private records: string[][];
  private instrCnt: number;
  private generalClock: number;
  public readonly vmConnection: WasmitoBackendVM;
  constructor(filename: string, vmConnection: WasmitoBackendVM) {
    this.file = readFileSync(filename);
    this.records = parse(this.file);
    this.instrCnt = 0;
    this.generalClock = 0;
    this.vmConnection = vmConnection;
    console.log(this.records[this.generalClock]);
  }
  public checkInstr(instr: WasmInstruction, args: WritableWasmValue[]) {
    this.generalClock += 1;
    this.instrCnt += 1;
    console.log(instr.startAddress);
    console.log(this.records[this.generalClock]);

    if (this.instrCnt == parseInt(this.records[this.generalClock][0])) {
      const newArgs = this.records[this.generalClock][5].split(';');
      for (let i = 0; i < args.length; i++) {
        args[i].value = parseInt(newArgs[i]);
        console.log(`set arg ${args[i].value} to ${newArgs[i]}`);
      }
    } else {
      console.log('do an interrupt!!!');
      const pin = parseInt(
        this.records[this.generalClock][2].slice('interrupt_'.length),
      );
      this.vmConnection.simulateInterrupt(pin);
      this.instrCnt -= 1;
    }

    return args;
  }
}

async function main(): Promise<void> {
  const examplesDir = resolve('./app_examples/assemblyscript');
  const mappingsPath = path.join(examplesDir, 'toggle_led/wasm/mappings.json');
  const wasmPath = path.join(examplesDir, 'toggle_led/wasm/toggle_led.wasm');
  const langAdaptor = LanguageAdaptor.fromMappingsPath(mappingsPath, {
    // give the absolute path to the wasmModule
    newWasmPath: wasmPath,
    // allows relative paths in the debugging information
    // needed to ensure that all the CFG nodes are cosntructed
    relativePaths: true,
  });
  printMapping(langAdaptor);
  const wasmPathModule = resolve(
    './app_examples/assemblyscript/toggle_led/wasm/toggle_led.wasm',
  );
  const wasm = new WasmModule(wasmPathModule);
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
    resolve('./tool_examples/record/recording.csv'),
    vmConnection,
  );
  function checkInstr(instr: WasmInstruction, args: WritableWasmValue[]) {
    console.log(`before Mut thing: ${instr}`);
    return replayInstr.checkInstr(instr, args);
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
}

function printMapping(langAdaptor: LanguageAdaptor): void {
  const file = readFileSync(resolve('./tool_examples/record/recording.csv'));
  const records = parse(file);

  records.forEach((record) => {
    const instrCount = record[0];
    const intrpCount = record[1];
    const topic = record[2];
    const payload = record[3];
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
  const srcCodeLines = src.trim().split('\n');
  // the -1 is because line counts are mostly beginning at line 1 wheras the slice begins at 0;
  const srcCodeInstr = srcCodeLines[location.linenr - 1].slice(
    location.colnr,
    srcCodeLines[location.linenr - 1].length - 1,
  );
  return srcCodeInstr;
}

main();
