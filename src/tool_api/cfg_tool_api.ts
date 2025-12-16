import {
  SourceCFGNode,
  sourceNodeFirstInstrStartAddr,
} from '../cfg/source_cfg_node_edge';
import { Hook } from '../hooks/hook';
import { HookOnWasmAddrMoment } from '../runtimes/wasmito_vm/requests/hook_on_wasm_addr_request';
import { WasmitoBackendVM } from '../runtimes/wasmito_vm/wasmito_vm';

export interface CFGToolAPI {
  onNodeEntry: (
    node: SourceCFGNode,
    vm: WasmitoBackendVM,
    hooks: Hook[],
    timeout: number,
  ) => Promise<boolean>;
}

async function onNodeEntry(
  node: SourceCFGNode,
  vm: WasmitoBackendVM,
  hooks: Hook[],
  timeout: number,
): Promise<boolean> {
  const addr = sourceNodeFirstInstrStartAddr(node);
  for (const h of hooks) {
    const s = await vm.addHookOnAddr(
      addr,
      h,
      HookOnWasmAddrMoment.HookBefore,
      timeout,
    );
    if (!s) return false;
  }
  return true;
}

export const CFGTOOLOperations: CFGToolAPI = {
  onNodeEntry: onNodeEntry,
};
