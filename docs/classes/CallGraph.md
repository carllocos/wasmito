[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / CallGraph

# Class: CallGraph

Defined in: [src/cfg/callgraph.ts:13](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/callgraph.ts#L13)

## Constructors

### Constructor

> **new CallGraph**(`entryNodes`, `nodes`): `CallGraph`

Defined in: [src/cfg/callgraph.ts:19](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/callgraph.ts#L19)

#### Parameters

##### entryNodes

[`CallGraphNode`](../interfaces/CallGraphNode.md)[]

##### nodes

`Map`\<`number`, [`CallGraphNode`](../interfaces/CallGraphNode.md)\>

#### Returns

`CallGraph`

## Properties

### nodes

> `readonly` **nodes**: `Map`\<`number`, [`CallGraphNode`](../interfaces/CallGraphNode.md)\>

Defined in: [src/cfg/callgraph.ts:15](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/callgraph.ts#L15)

## Accessors

### allNodes

#### Get Signature

> **get** **allNodes**(): [`CallGraphNode`](../interfaces/CallGraphNode.md)[]

Defined in: [src/cfg/callgraph.ts:31](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/callgraph.ts#L31)

##### Returns

[`CallGraphNode`](../interfaces/CallGraphNode.md)[]

***

### entryNodes

#### Get Signature

> **get** **entryNodes**(): [`CallGraphNode`](../interfaces/CallGraphNode.md)[]

Defined in: [src/cfg/callgraph.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/callgraph.ts#L27)

##### Returns

[`CallGraphNode`](../interfaces/CallGraphNode.md)[]

## Methods

### toDot()

> **toDot**(`outputFile?`): `string`

Defined in: [src/cfg/callgraph.ts:56](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/callgraph.ts#L56)

#### Parameters

##### outputFile?

`string`

#### Returns

`string`
