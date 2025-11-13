[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / AgnosticNode

# Class: AgnosticNode

Defined in: [src/language\_adaptors/agnostic\_node.ts:19](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/agnostic_node.ts#L19)

## Constructors

### Constructor

> **new AgnosticNode**(`node`, `src`): `AgnosticNode`

Defined in: [src/language\_adaptors/agnostic\_node.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/agnostic_node.ts#L28)

#### Parameters

##### node

`Node`

##### src

`string`

#### Returns

`AgnosticNode`

## Accessors

### endPosition

#### Get Signature

> **get** **endPosition**(): [`ASTNodeSourceLocation`](../interfaces/ASTNodeSourceLocation.md)

Defined in: [src/language\_adaptors/agnostic\_node.ts:45](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/agnostic_node.ts#L45)

##### Returns

[`ASTNodeSourceLocation`](../interfaces/ASTNodeSourceLocation.md)

***

### node

#### Get Signature

> **get** **node**(): `Node`

Defined in: [src/language\_adaptors/agnostic\_node.ts:37](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/agnostic_node.ts#L37)

##### Returns

`Node`

***

### source

#### Get Signature

> **get** **source**(): `string`

Defined in: [src/language\_adaptors/agnostic\_node.ts:49](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/agnostic_node.ts#L49)

##### Returns

`string`

***

### startPosition

#### Get Signature

> **get** **startPosition**(): [`ASTNodeSourceLocation`](../interfaces/ASTNodeSourceLocation.md)

Defined in: [src/language\_adaptors/agnostic\_node.ts:41](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/agnostic_node.ts#L41)

##### Returns

[`ASTNodeSourceLocation`](../interfaces/ASTNodeSourceLocation.md)

## Methods

### addMapping()

> **addMapping**(`m`): `void`

Defined in: [src/language\_adaptors/agnostic\_node.ts:53](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/agnostic_node.ts#L53)

#### Parameters

##### m

[`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)

#### Returns

`void`

***

### getPositionHelper()

> **getPositionHelper**(`point`): [`ASTNodeSourceLocation`](../interfaces/ASTNodeSourceLocation.md)

Defined in: [src/language\_adaptors/agnostic\_node.ts:61](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/agnostic_node.ts#L61)

#### Parameters

##### point

`Point`

#### Returns

[`ASTNodeSourceLocation`](../interfaces/ASTNodeSourceLocation.md)
