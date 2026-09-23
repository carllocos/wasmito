/**
 * This file is meant to declare the type of an imported WasmModule and to implement minimal Wasi support.
 * For benchmarking purposes, the Wasi is minimal to only enable the import of Wasm
 * libraries provided by Whamm.
 *
 * By mannually declaring the WebAssembly types we avoid adding "DOM" to `compilerOptions.lib`
 * in tsconfig.json, which do provide unnecessary broad type declarations (e.g. browser specific constructs
 * such as `window`, `document`, etc.) thus polluting this project.
 *
 * By implementing a portion of the Wasi interface we avoid importing Node's built-in
 * Wasi which is marked experimental
 **/
import * as fs from 'fs';

const WASI_MODULE = 'wasi_snapshot_preview1';

type CompiledModule = object;
type Exports = Record<string, unknown>;
declare const WebAssembly: {
  compile(bytes: Uint8Array): Promise<CompiledModule>;
  instantiate(
    module: CompiledModule,
    imports: Record<string, Record<string, unknown>>,
  ): Promise<{ exports: Exports }>;
  Module: {
    imports(module: CompiledModule): { module: string; name: string }[];
  };
};

export async function loadWasiLibrary(path: string): Promise<Exports> {
  const module = await WebAssembly.compile(fs.readFileSync(path));

  const lib: { memory?: { buffer: ArrayBuffer } } = {};
  const view = () => new DataView(lib.memory!.buffer);

  const emptyList = (countPtr: number, bufSizePtr: number): number => {
    view().setUint32(countPtr, 0, true);
    view().setUint32(bufSizePtr, 0, true);
    return 0;
  };
  const wasi: Record<string, (...args: number[]) => number | void> = {
    args_sizes_get: emptyList,
    args_get: () => 0,
    environ_sizes_get: emptyList,
    environ_get: () => 0,
    proc_exit: (code) => {
      throw new Error(`library '${path}' called proc_exit(${code})`);
    },
    fd_write: (fd, iovs, iovsLen, nwrittenPtr) => {
      let written = 0;
      for (let i = 0; i < iovsLen; i++) {
        const ptr = view().getUint32(iovs + i * 8, true);
        const len = view().getUint32(iovs + i * 8 + 4, true);
        const bytes = new Uint8Array(lib.memory!.buffer, ptr, len);
        (fd === 2 ? process.stderr : process.stdout).write(bytes);
        written += len;
      }
      view().setUint32(nwrittenPtr, written, true);
      return 0;
    },
  };
  for (const imp of WebAssembly.Module.imports(module)) {
    if (imp.module !== WASI_MODULE) {
      throw new Error(
        `library '${path}' imports '${imp.module}.${imp.name}' which is not supported`,
      );
    }
    wasi[imp.name] ??= () => {
      throw new Error(
        `library '${path}' called unsupported WASI function '${imp.name}'`,
      );
    };
  }

  const instance = await WebAssembly.instantiate(module, {
    [WASI_MODULE]: wasi,
  });
  lib.memory = instance.exports.memory as { buffer: ArrayBuffer };
  if (typeof instance.exports._initialize === 'function') {
    instance.exports._initialize();
  }
  return instance.exports;
}
