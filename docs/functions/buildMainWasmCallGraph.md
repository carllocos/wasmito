[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / buildMainWasmCallGraph

# Function: buildMainWasmCallGraph()

> **buildMainWasmCallGraph**(`wasm`, `cfgs`, `linkToExportsWhenNoCFG?`): [`CallGraph`](../classes/CallGraph.md)

Defined in: [src/cfg/callgraph.ts:65](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/callgraph.ts#L65)

## Parameters

### wasm

[`WasmModule`](../classes/WasmModule.md)

### cfgs

`Map`\<`number`, [`WasmCFG`](../interfaces/WasmCFG.md)\>

### linkToExportsWhenNoCFG?

`boolean`

## Returns

[`CallGraph`](../classes/CallGraph.md)
