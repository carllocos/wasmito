[**wasmito v1.0.0**](../../../../README.md)

***

[wasmito](../../../../globals.md) / [CFGOperations](../README.md) / isCallNode

# Function: isCallNode()

> **isCallNode**(`n`): `boolean`

Defined in: [src/tool\_api/cfg\_util.ts:9](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/tool_api/cfg_util.ts#L9)

Predicate to check if at least one of the underlying Wasm instructions associated to `n` performs a function call.

## Parameters

### n

[`SourceCFGNode`](../../../../interfaces/SourceCFGNode.md)

The SCFG node

## Returns

`boolean`

True if a call is performed
