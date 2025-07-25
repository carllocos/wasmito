import { DeviceManager } from '../../src/device/device_manager';
import { getGlobalLogger } from '../../src/logger/logger';
import { InspectStateHook } from '../../src/hooks/hook_inspect_state';
import { StateRequest } from '../../src/runtimes/wasmito_vm/requests/inspect_request';
import { exit } from 'process';
import { type WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import path from 'path';
import { BoardBaudRate } from '../../src/util/serial_port';
import { TargetLanguage } from '../../src/compilers/prog_language_selection';
import {
  createArduinoPlatform,
  createDevPlatform,
} from '../../src/platforms/platformbuilder_factory';
import { PlatformTarget } from '../../src/platforms/platform_config';
import {
  DefaultSourceOffsetStart,
  ReadSourceSpec,
  SourceMapConfig,
} from '../../src/source_mappers/source_map_builder';
import { WasmCompilerArgs } from '../../src/compilers/wasm_compiler';
import { StoreTrace } from './store_trace';

async function registerHooks(
  em: WasmitoBackendVM,
  writer: StoreTrace,
): Promise<boolean> {
  for (const n of em.languageAdaptor.sourceCFGs.allNodes()) {
    const inspectStackRequest = new StateRequest().includeStack().includePC();
    const inspectStack = new InspectStateHook(inspectStackRequest);
    inspectStack.onSubscriptionData = writer.write(n);
    const success = await em.addHookBeforeSrcNode(n, inspectStack);
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
    './test/data/assemblyscript_examples/blink/',
  );
  const wasmApp = path.resolve(pathToRootSource, 'blink.wasm');
  const sourcePath = path.resolve(pathToRootSource, 'blink.ts');
  const debugInfo = path.resolve(pathToRootSource, 'blink.wasm.map');
  const srcFileMapper = new Map<string, string>([
    ['blink/blink.ts', sourcePath],
  ]);
  const sourceMapConfig: SourceMapConfig = {
    srcToAbsPath: srcFileMapper,
  };
  const recordTime = 30; // seconds
  const outputDir = './tool_examples/tracer/';
  const output = 'trace.csv';
  const monitorMode = PlatformTarget.DevVM;

  const dm = new DeviceManager();
  let vm: WasmitoBackendVM | undefined;
  const compilationArgs: WasmCompilerArgs = {
    wasmPath: wasmApp,
    mappingsJSON: await ReadSourceSpec(
      debugInfo,
      wasmApp,
      DefaultSourceOffsetStart,
      sourceMapConfig,
    ),
  };

  if (monitorMode === PlatformTarget.DevVM) {
    const platform = await createDevPlatform({
      selectedLanguage: {
        targetLanguage: TargetLanguage.Wasm,
      },
    });
    vm = await dm.spawnDevelopmentVM(platform, compilationArgs, 8000);
  } else if (monitorMode === PlatformTarget.Arduino) {
    const platform = await createArduinoPlatform({
      selectedLanguage: {
        targetLanguage: TargetLanguage.Wasm,
      },
      vmConfig: {
        baudrate: BoardBaudRate.BD_115200,
        serialPort: '/dev/ttyUSB0',
        fqbn: {
          boardName: '',
          fqbn: 'esp32:esp32:m5stick-c',
        },
      },
    });
    vm = await dm.spawnHardwareVM(platform, compilationArgs);
    await sleep(5000); // sleep to let MCU load module first
  } else {
    getGlobalLogger().error(`unsupported mode ${monitorMode}`);
    exit(1);
  }

  await runTrace(vm, recordTime, outputDir, output);
}

run().catch(console.error);
