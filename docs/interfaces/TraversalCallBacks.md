[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / TraversalCallBacks

# Interface: TraversalCallBacks

Defined in: [src/cfg/traversals\_cfg.ts:8](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/traversals_cfg.ts#L8)

## Properties

### onEdge()?

> `optional` **onEdge**: (`from`, `fromInstruction`, `to`, `toInstruction`) => `void`

Defined in: [src/cfg/traversals\_cfg.ts:10](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/traversals_cfg.ts#L10)

#### Parameters

##### from

[`CFGNode`](CFGNode.md)

##### fromInstruction

[`WasmInstruction`](../classes/WasmInstruction.md)

##### to

[`CFGNode`](CFGNode.md)

##### toInstruction

[`WasmInstruction`](../classes/WasmInstruction.md)

#### Returns

`void`

***

### onNode()?

> `optional` **onNode**: (`n`) => `void`

Defined in: [src/cfg/traversals\_cfg.ts:9](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/traversals_cfg.ts#L9)

#### Parameters

##### n

[`CFGNode`](CFGNode.md)

#### Returns

`void`
