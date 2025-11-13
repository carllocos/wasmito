import { getCallInstructions, SourceCFGNode } from '../cfg/source_cfg';

export namespace CFGOperations {
  /**
   * Predicate to check if at least one of the underlying Wasm instructions associated to `n` performs a function call.
   * @param n - The SCFG node
   * @returns True if a call is performed
   */
  export function isCallNode(n: SourceCFGNode): boolean {
    // TODO improve speed
    return getCallInstructions(n).length > 0;
  }
}
