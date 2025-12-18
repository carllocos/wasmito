import { resolve } from 'path';
import { DeviceManager } from '../../src/device/device_manager';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import {
  ReadOnlyInterrupt,
  ReadOnlyWasmValue,
} from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { exit } from 'process';

interface LogicalClock {
  instrs: number;
  interrupts: number;
}

function copyClock(): LogicalClock {
  return {
    instrs: LogicalClock.instrs,
    interrupts: LogicalClock.interrupts,
  };
}

interface RecordInstruction {
  instrAddr: number;
  instrName: string;
  instrArgs: ReadOnlyWasmValue[];
  clock: LogicalClock;
}

interface RecordInterrupt {
  topic: string;
  payload: string;
  clock: LogicalClock;
}

type Record = RecordInterrupt | RecordInstruction;

function isRecordInterrupt(r: any): r is RecordInterrupt {
  return r.topic !== undefined;
}

function logRecord(r: Record): void {
  let s = `LC{instrs=${r.clock.instrs},interrupts=${r.clock.interrupts}}`;
  if (isRecordInterrupt(r)) {
    s += ` Interrupt{topic='${r.topic}', payload='${r.payload}'}\n`;
  } else {
    const argsStr =
      r.instrArgs.length === 0
        ? ''
        : `[${r.instrArgs.map((a) => a.value).join(', ')}]`;
    s += ` 0x${r.instrAddr.toString(16)} ${r.instrName} ${argsStr}\n`;
  }
  console.log(s);
}

function logAfter(
  instr: WasmInstruction,
  result: ReadOnlyWasmValue | undefined,
): void {
  const valStr = result === undefined ? '' : `${result.value}`;
  let s = `LC{instrs=${LogicalClock.instrs},interrupts=${LogicalClock.interrupts}} (after)`;
  s += ` 0x${instr.startAddress.toString(16)} ${instr.name} pushed on stack ${valStr}\n`;
  console.log(s);
}

const LogicalClock: LogicalClock = {
  instrs: 0,
  interrupts: 0,
};

const Records: Record[] = [];

function recordInterrupt(interrupt: ReadOnlyInterrupt): void {
  LogicalClock.interrupts += 1;
  const record: Record = {
    topic: interrupt.topic,
    payload: interrupt.payload,
    clock: copyClock(),
  };
  Records.push(record);
  logRecord(record);
}

function recordInstr(i: WasmInstruction, args: ReadOnlyWasmValue[]): void {
  LogicalClock.instrs += 1;

  const record: Record = {
    instrAddr: i.startAddress,
    instrName: i.name,
    instrArgs: args,
    clock: copyClock(),
  };
  Records.push(record);
  logRecord(record);
}

async function main(): Promise<void> {
  const wasmPath = resolve(
    './app_examples/assemblyscript/toggle_led/wasm/toggle_led.wasm',
  );
  const recordSecs = 10;
  const wasm = new WasmModule(wasmPath);
  const vmConnection = await spawnDevVM(wasm);
  const analysis = new WasmAnalysis(wasm, vmConnection);
  for (const f of wasm.functions) {
    for (const i of f.allInstructions) {
      analysis.before(i, recordInstr);
      analysis.after(i, logAfter);
    }
  }

  analysis.beforeHandlingInterrupt(recordInterrupt);
  await analysis.deploy();
  await analysis.run();
  mockInterrupts(vmConnection, 37, 5);
  stopRecording(vmConnection, analysis, recordSecs);
}

function stopRecording(
  vm: WasmitoBackendVM,
  analysis: WasmAnalysis,
  recordSecs: number,
): void {
  const ms = recordSecs * 1000; // convert to milliseconds
  setTimeout(async () => {
    await vm.pause();
    await analysis.remove();
    await vm.close();
    logRecordings();
    exit(0);
  }, ms);
}

function logRecordings(): void {
  console.log(`Recorded #${Records.length} entries`);
  for (const r of Records) {
    logRecord(r);
  }
}

function mockInterrupts(
  vm: WasmitoBackendVM,
  pin: number,
  nrOfInterrupts: number,
): void {
  if (nrOfInterrupts <= 0) return;

  const sleepTime = 1000;
  // const sleepTime = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
  setTimeout(() => {
    vm.mockPinInterrupt(pin);
    mockInterrupts(vm, pin, nrOfInterrupts - 1);
  }, sleepTime);
}

async function spawnDevVM(wasm: WasmModule): Promise<WasmitoBackendVM> {
  const dm = new DeviceManager();
  const la = LanguageAdaptor.emptyAdaptor(wasm.wasmPath);
  return await dm.spawnDevelopmentVM(la);
}

// async function spawnExitingDevVM(wasm: WasmModule): Promise<WasmitoBackendVM> {
//   const dm = new DeviceManager();
//   const la = LanguageAdaptor.emptyAdaptor(wasm.wasmPath);
//   const p = await createDevPlatform({ vmConfig: { toolPort: 8192 } });
//   return await dm.connectToExistingDevVM(la, p, 3000);
// }

main().catch(console.error);
