import { resolve, join } from 'path';
import assert from 'assert';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WritableWasmValue } from '../../src/tool_api/interrupts';
import { CallInstruction } from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';

import { BoardBaudRate } from '../../src/util/serial_port';

/**
 * In this example, we increase the sleep time between each blink with 500 ms
 * until the sleep time becomes 7000 ms.
 * Normally, the sleep time is 1000 ms
 *
 */
async function main(): Promise<void> {
  const examplesDir = resolve('./app_examples/rust/');
  const wasmPath = join(examplesDir, 'blink/wasm/blink.wasm');

  const wasm = new WasmModule(wasmPath);
  //uncomment next to run analysis on local VM
  //   const vmConnection = await spawnDevVM(wasm);
  // uncomment next to run analysis on MCU VM
  const vmConnection = await spawnMCUVM(wasm, {
    vmConfig: {
      pauseOnStart: true, // pause the VM on deploy of the Wasm module
      serialPort: '/dev/cu.usbserial-8952FFEE8B',
      baudrate: BoardBaudRate.BD_115200,
      fqbn: {
        boardName: 'M5Stick-C',
        fqbn: 'm5stack:esp32:m5stick-c',
      },
    },
  });

  const analysis = new WasmAnalysis(wasm, vmConnection);
  let newDelay = 0;
  const delayIncreaseMS = 500;
  const maxDelayMS = 7000;
  const delayCalls = wasm.getCallInstructions('delay');
  assert(delayCalls.length === 2); // in the blink there are two delay calls
  for (const call of delayCalls) {
    analysis.beforeMut(
      call,
      (
        _call: CallInstruction,
        args: WritableWasmValue[],
      ): WritableWasmValue[] => {
        // args[0].value is always 1000 so increase at each call
        newDelay += args[0].value + delayIncreaseMS;
        if (newDelay > maxDelayMS) {
          // reset the delay
          newDelay = 0;
        }
        args[0].value = newDelay;
        console.log(`delay called with arg ${args[0].value}`);
        return args;
      },
    );
  }

  await analysis.deploy();
  await analysis.run();
}

main().catch(console.error);
