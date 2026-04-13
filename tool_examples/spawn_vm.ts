import { DeviceManager } from '../src/device/device_manager';
import { LanguageAdaptor } from '../src/language_adaptors/language_adaptor';
import {
  createArduinoPlatform,
  createDevPlatform,
  FactoryArgs,
} from '../src/platforms/platformbuilder_factory';
import { WasmitoBackendVM } from '../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmModule } from '../src/webassembly/wasm/wasm_module';

/**
 * spawn a local vm running wasm module `wasm`
 * @param wasm the Wasm module that needs to run
 * @returns
 */
export async function spawnDevVM(
  wasm: WasmModule | LanguageAdaptor,
): Promise<WasmitoBackendVM> {
  const dm = new DeviceManager();
  if (wasm instanceof LanguageAdaptor) return await dm.spawnDevelopmentVM(wasm);

  const la = LanguageAdaptor.emptyAdaptor(wasm.wasmPath);
  return await dm.spawnDevelopmentVM(la);
}

/**
 * Connect to local VM that was already spawned.
 * @param wasm the Wasm module running on the spawned VM
 * @returns
 */
export async function connectToExistingDevVM(
  wasm: WasmModule,
  toolPort: number,
): Promise<WasmitoBackendVM> {
  const dm = new DeviceManager();
  const la = LanguageAdaptor.emptyAdaptor(wasm.wasmPath);
  const p = await createDevPlatform({ vmConfig: { toolPort: toolPort } });
  return await dm.connectToExistingDevVM(la, p, 3000);
}

/**
 * Deploy a WARDuino VM onto a ESP32, deploy on it Wasm module `wasm`
 * @param wasm the Wasm module to deploy or the LanguageAdaptor
 * @param vmArgs
 * @returns
 */
export async function spawnMCUVM(
  wasm: WasmModule | LanguageAdaptor,
  vmArgs: FactoryArgs,
): Promise<WasmitoBackendVM> {
  const la =
    wasm instanceof LanguageAdaptor
      ? wasm
      : LanguageAdaptor.emptyAdaptor(wasm.wasmPath);
  const dm = new DeviceManager();
  const platform = await createArduinoPlatform(vmArgs);
  return dm.spawnHardwareVM(la, platform);
}
