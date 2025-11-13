import { SourceCFGNode, sourceNodeFirstInstrStartAddr } from '../cfg';
import { HookOnWasmAddrMoment, WasmitoBackendVM } from '../runtimes';
import { Hook } from '../hooks/hook';

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
