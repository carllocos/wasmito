import { type DestinationSCFGNode } from '../language_adaptors/debug_operations';
import { type WASMFunction } from '../webassembly';
import { buildCallGraph } from './callgraph';
import { type SourceCFGs, type BinaryLiftedCFG } from './source_cfg';
import assert from 'assert';
import { sourceNodeFirstInstrStartAddr } from './source_cfg_node_edge';

/**
 * An interface associated to a callback of a Wasm module
 * A Callback is a function with id `callbackId` that is executed by the environment.
 * In the context of MCUs, these callbacks are executed upon interrupts.
 * To enable tooling support that for instance halts execution upon
 * a callback as needed by a debugger.
 * This interface keeps track of the `entryNodes` that if reached imply that
 * callback `callbackId` got executed.
 * The `SCFGs` is an array pointing to the SCFGs associated with the `entryNodes`.
 * The field `otherReachableCallbacks` contain the entry nodes of other callbacks
 * that can be called by `callbackID` or an interrupt.
 * These nodes are derived from the call graph of `callbackId`.
 *
 * Be aware that the `entryNodes` may not correspond to source level
 * nodes of `callbackID`.
 * This can happen in situation where `callbackId` has no associated source level function.
 * But call other functions that do have source level nodes.
 * Therefore to stop the execution once `callbackId` is executed we can halt
 * `entryNodes`.
 */
export interface CallbackSCFG {
  callbackId: number;
  SCFGs: BinaryLiftedCFG[];
  entryNodes: DestinationSCFGNode[];
  otherReachableCallbacks: DestinationSCFGNode[];
}

/**
 * It searches for the SCFGs associated to the callbacks that
 * can be triggered due to interrupts.
 *
 * To identify the callbacks this function considers two scenarios:
 * (1) The module has a main function. In this case, the main function
 * is the one responsible to register the callbacks that can be called by the environment due to interrupts.
 * Using the callgraph of the main function it selects all the Wasm functions that are
 * not reachable by the main function.
 * As these functions are the ones that one can consider as callback.
 * This is not a sound approach but rather an educated guess.
 * Interrupt callbacks typically are triggered by an external event and not executed by the main.
 *
 * (2) The module has no main. In that case, only the exported functions of the module can be accessed
 * by the outside word. Thus can serve as callback.
 *
 * Using the selected functions either through (1) or (2). This function:
 * (i) computes the first SCFG nodes that would be reached if the selected function would be called.
 * (ii) computes the call graph starting from the selected function
 * (iii) from the call graph accesses all the functions that are callbacks
 * (iv) for each callback in the call graph computes their entry nodes
 * @param SCFGs The source CFGs for which we need to identify the Callbacks
 * @returns
 */
export function searchCallbacksCFGs(SCFGs: SourceCFGs): CallbackSCFG[] {
  // TODO handle the case of loops!
  // TODO if no main and only exports are considered
  // it could be that the exported function registers
  // non exported functions for interrupts
  const graphs = SCFGs.wasmCFGs.graphs;
  const wasm = SCFGs.sourceMap.wasm;

  const entryFuncs = wasm.getMainFunctions().map((f) => f.id);
  const funcs: WASMFunction[] = [];
  if (entryFuncs.length > 0) {
    const [, funcsInGraphs] = buildCallGraph(wasm, entryFuncs, graphs);
    funcs.push(...wasm.functions.filter((f) => !funcsInGraphs.has(f.id)));
  } else {
    funcs.push(...wasm.allExportedFuncs());
  }

  // no main function so use all exported functions
  // if one exported function A that gets triggered by interrupts
  // calls another exported function B that could get triggered by interrupts
  // the debugger once reaching A and stepping out will stop execution at B
  // because breakpoints are added to all callbacks
  // So when reaching A the debugger should remove breakpoints of B.
  const callbacksSCFGs: CallbackSCFG[] = [];
  for (const f of funcs) {
    const [callGraph, funcsInGraph] = buildCallGraph(wasm, [f.id], graphs);

    assert(
      callGraph.entryNodes.length === 1,
      `Callgraph has more than one entry (${callGraph.entryNodes.length}) for func '${f.id}'`,
    );
    const entryFunc = callGraph.entryNodes[0].fid;
    assert(
      f.id === entryFunc,
      `Callgraph entry func '${entryFunc}' !== expected function id '${f.id}'`,
    );

    const next = SCFGs.nextReachableSourceNodesFromFunction(f.id);
    if (next.length === 0) {
      // the exported function and the
      // functions called by the exported function
      // have no associated SCFGs.
      // This exported function is thus likely no callback associated to an interrupt
      continue;
    }

    // compute all reachable nodes from f
    // i.e., the entryNodes of each node in
    // the callgraph of f
    // if there were no entry nodes
    // then only consider the exported functions
    const onlyExportedFuncs = entryFuncs.length === 0;
    const allReachableNodes: DestinationSCFGNode[] = Array.from(funcsInGraph)
      .filter((otherFunc) => {
        return (
          otherFunc !== f.id &&
          SCFGs.getFunctionSourceCFG(otherFunc) !== undefined &&
          (!onlyExportedFuncs || wasm.getFunctionOrError(otherFunc).exported)
        );
      })
      .flatMap((otherFunc) => {
        return SCFGs.getFunctionSourceCFGOrError(otherFunc).entryNodes;
      })
      .map((n) => {
        return [n, sourceNodeFirstInstrStartAddr(n)];
      });

    const scfgs: BinaryLiftedCFG[] = [];
    const addedSCFGs = new Set<number>();
    next.forEach(([node]) => {
      if (!addedSCFGs.has(node.wasmFunOwner)) {
        const scfg = SCFGs.getFunctionSourceCFGOrError(node.wasmFunOwner);
        scfgs.push(scfg);
        addedSCFGs.add(node.wasmFunOwner);
      }
    });
    callbacksSCFGs.push({
      callbackId: f.id,
      SCFGs: scfgs,
      entryNodes: next,
      otherReachableCallbacks: allReachableNodes,
    });
  }

  return callbacksSCFGs;
}
