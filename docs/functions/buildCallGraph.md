[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / buildCallGraph

# Function: buildCallGraph()

> **buildCallGraph**(`wasm`, `entryFuncs`, `cfgs`, `linkToFuncsWhenNoCFG`): \[[`CallGraph`](../classes/CallGraph.md), `Set`\<`number`\>\]

Defined in: [src/cfg/callgraph.ts:102](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/callgraph.ts#L102)

build a call graph for the given entry funcs in a Wasm module.
While building the callgraph we may encounter a function that has no CFG.
These functions are automatically linked to `linkToFuncsWhenNoCFG`.
This can be used to create sound call graphs.

## Parameters

### wasm

[`WasmModule`](../classes/WasmModule.md)

### entryFuncs

`number`[]

### cfgs

`Map`\<`number`, [`WasmCFG`](../interfaces/WasmCFG.md)\>

### linkToFuncsWhenNoCFG

`number`[] = `[]`

## Returns

\[[`CallGraph`](../classes/CallGraph.md), `Set`\<`number`\>\]

a tuple containing the call graph and a set of all function identities part of the callgraph
