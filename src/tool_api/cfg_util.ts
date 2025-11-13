import {
  getCallInstructions,
  SourceCFGNode,
  SourceCFGs,
} from '../cfg/source_cfg';
import {
  instructionToString,
  isCallIndirect,
  isCallInstruction,
} from '../webassembly/wasm/wasm_instruction';

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

  /**
   * If `n` is a call node, it returns the entry nodes of all the SCFG associated with the functions called by `n`
   * @param SCFGs - All the SCFGs
   * @param n - The SCFG call node
   * @returns The entry nodes of the called functions
   */
  export function calledFunctionsEntryNodes(
    SCFGs: SourceCFGs,
    n: SourceCFGNode,
  ): SourceCFGNode[] {
    const entryNodes: SourceCFGNode[] = [];
    const alreadyAdded = new Set<number>();
    if (CFGOperations.isCallNode(n)) {
      const callInstr = getCallInstructions(n);
      for (const i of callInstr) {
        if (isCallInstruction(i)) {
          const entryNodes = SCFGs.getFunctionEntryNodes(i.funIdx);
          if (entryNodes.length === 0) {
            // this can happen if funIDX is an imported env fun
            // or a function for which no source file is available
            continue;
          }
          entryNodes.forEach((n) => {
            if (!alreadyAdded.has(n.nodeId)) {
              entryNodes.push(n);
              alreadyAdded.add(n.nodeId);
            }
          });
        } else if (isCallIndirect(i)) {
          throw new Error('callindirect todo');
        } else {
          throw new Error(
            `instruction ${instructionToString(i)} is not a call function`,
          );
        }
      }
    }
    return entryNodes;
  }
}
