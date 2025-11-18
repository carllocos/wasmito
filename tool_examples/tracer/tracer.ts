import { DeviceManager } from '../../src/device/device_manager';
import { getGlobalLogger } from '../../src/logger/logger';
import { InspectStateHook } from '../../src/hooks/hook_inspect_state';
import { StateRequest } from '../../src/runtimes/wasmito_vm/requests/inspect_request';
import { exit } from 'process';
import { type WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import path from 'path';
import { BoardBaudRate } from '../../src/util/serial_port';
import {
  createArduinoPlatform,
  createDevPlatform,
} from '../../src/platforms/platformbuilder_factory';
import { PlatformTarget } from '../../src/platforms/platform_config';
import { StoreTrace } from './store_trace';
import { CFGTOOLOperations } from '../../src/tool_api/cfg_tool_api';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';

async function registerHooks(
  em: WasmitoBackendVM,
  writer: StoreTrace,
): Promise<boolean> {
  for (const n of em.languageAdaptor.sourceCFGs.allNodes()) {
    const inspectStackRequest = new StateRequest().includeStack().includePC();
    const inspectStack = new InspectStateHook(inspectStackRequest);
    inspectStack.onSubscriptionData = writer.write(n);

    const secsToWaitUntilResponse = 10000;
    const success = await CFGTOOLOperations.onNodeEntry(
      n,
      em,
      [inspectStack],
      secsToWaitUntilResponse,
    );
    if (!success) {
      return false;
    }
  }
  return true;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runTrace(
  vm: WasmitoBackendVM,
  traceTime: number,
  outputDir: string,
  nameOutputFile: string,
): Promise<boolean> {
  const bufferSizePriorWrite = 500;
  const writer = new StoreTrace(
    path.join(outputDir, nameOutputFile),
    bufferSizePriorWrite,
  );
  const registerd = await registerHooks(vm, writer);
  if (!registerd) return false;
  await vm.run();
  setTimeout(() => {
    writer.close();
    exit(1);
  }, traceTime * 1000);
  return true;
}

async function run(): Promise<void> {
  const pathToRootSource = path.resolve(
    './app_examples/assemblyscript/toggle_led/',
  );
  const wasmPath = path.resolve(pathToRootSource, 'wasm/blink.wasm');
  const mappingsPath = path.resolve(pathToRootSource, 'wasm/mappings.json');
  const la = LanguageAdaptor.fromMappingsPath(mappingsPath, {
    newWasmPath: wasmPath,
    relativePaths: true,
  });

  const recordTime = 30; // seconds
  const outputDir = './tool_examples/tracer/';
  const output = 'trace.csv';
  const monitorMode = PlatformTarget.DevVM;

  const dm = new DeviceManager();
  let vm: WasmitoBackendVM | undefined;

  if (monitorMode === PlatformTarget.DevVM) {
    const platform = await createDevPlatform();
    vm = await dm.spawnDevelopmentVM(la, platform, 8000);
  } else if (monitorMode === PlatformTarget.Arduino) {
    const platform = await createArduinoPlatform({
      vmConfig: {
        baudrate: BoardBaudRate.BD_115200,
        serialPort: '/dev/ttyUSB0',
        fqbn: {
          boardName: '',
          fqbn: 'esp32:esp32:m5stick-c',
        },
      },
    });
    vm = await dm.spawnHardwareVM(la, platform);
    await sleep(5000); // sleep to let MCU load module first
  } else {
    getGlobalLogger().error(`unsupported mode ${monitorMode}`);
    exit(1);
  }

  await runTrace(vm, recordTime, outputDir, output);
}

run().catch(console.error);
