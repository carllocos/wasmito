import path from 'path';
import { WasmitoDevVM } from '../../src/runtimes/wasmito_vm/dev_vm';
import { DeviceManager } from '../../src/device/device_manager';
import {
  createArduinoPlatform,
  createDevPlatform,
} from '../../src/platforms/platformbuilder_factory';
import { sourceCodeLocationToString } from '../../src/source_mappers/source_map';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { CFGTOOLOperations } from '../../src/tool_api/cfg_tool_api';
import { SourceCFGs } from '../../src/cfg/source_cfg';
import { LexicalScopeRequest } from '../../src/source_mappers/state_mappings';
import { MCUWasmitoVM } from '../../src/runtimes/wasmito_vm/mcu_vm';
import { BoardBaudRate } from '../../src/util/serial_port';
import { exit } from 'process';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';

export async function warduinoOnMCU(
  languageAdaptor: LanguageAdaptor,
): Promise<MCUWasmitoVM> {
  const dm = new DeviceManager();
  const platform = await createArduinoPlatform({
    vmConfig: {
      baudrate: BoardBaudRate.BD_115200,
      serialPort: '/dev/cu.usbserial-8952FFEE8B',
      pauseOnStart: true,
      fqbn: {
        boardName: 'BlinkM5StickC',
        fqbn: 'm5stack:esp32:m5stick-c',
      },
    },
  });
  return await dm.spawnHardwareVM(languageAdaptor, platform);
}

async function warduinoOnDesktop(
  languageAdaptor: LanguageAdaptor,
): Promise<WasmitoDevVM> {
  const dm = new DeviceManager();
  const platform = await createDevPlatform();
  return await dm.spawnDevelopmentVM(languageAdaptor, platform, 8000);
}

export async function monitorAllNodes(
  scfgs: SourceCFGs,
  monitorTimeSecs: number,
  vm: WasmitoBackendVM,
): Promise<void> {
  // register the hooks of interest
  for (const node of scfgs.allNodes()) {
    const state = new LexicalScopeRequest(scfgs.sourceMap);
    state.includeSourceLocation();
    state.subscribe((lexicalScope) => {
      const loc = lexicalScope.sourceLocation;
      console.log(`Reached (${loc.source}, ${loc.linenr}, ${loc.colnr})`);
    });

    const secsToWaitUntilResponse = 10000;
    const s = await CFGTOOLOperations.onNodeEntry(
      node,
      vm,
      [state],
      secsToWaitUntilResponse,
    );
    if (!s) {
      throw new Error(
        `failed to hook on node ${sourceCodeLocationToString(node.sourceLocation)}`,
      );
    }
  }

  // run the Wasm execution on the VM
  await vm.run();
  setTimeout(() => {
    vm.close();
    exit(0);
  }, monitorTimeSecs * 1000);
}

async function exampleMonitorAllNodesOnDevVM(
  langAdaptor: LanguageAdaptor,
): Promise<void> {
  const vm = await warduinoOnDesktop(langAdaptor);
  await monitorAllNodes(langAdaptor.sourceCFGs, monitorTimeSecs, vm);
}

async function exampleMonitorAllNodesOnMCU(
  langAdaptor: LanguageAdaptor,
): Promise<void> {
  const vm = await warduinoOnMCU(langAdaptor);
  await monitorAllNodes(langAdaptor.sourceCFGs, monitorTimeSecs, vm);
}

const appDir = path.resolve('./app_examples/assemblyscript/toggle-led/');
const wasmPath = path.resolve(appDir, 'wasm/toggle_led.wasm');
const mappingsPath = path.resolve(appDir, 'wasm/mappings.json');
const monitorTimeSecs = 30; // seconds

const langAdaptor = LanguageAdaptor.fromMappingsPath(mappingsPath, {
  newWasmPath: wasmPath,
  relativePaths: true,
});

exampleMonitorAllNodesOnDevVM(langAdaptor).catch(console.error);
exampleMonitorAllNodesOnMCU(langAdaptor).catch(console.error);
