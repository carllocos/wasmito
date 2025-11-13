[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / PlaceholderType

# Class: PlaceholderType

Defined in: [src/webassembly/wasm/opcode\_type.ts:77](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L77)

## Extends

- [`WasmType`](WasmType.md)

## Constructors

### Constructor

> **new PlaceholderType**(): `PlaceholderType`

Defined in: [src/webassembly/wasm/opcode\_type.ts:78](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L78)

#### Returns

`PlaceholderType`

#### Overrides

[`WasmType`](WasmType.md).[`constructor`](WasmType.md#constructor)

## Properties

### id?

> `readonly` `optional` **id**: `number`

Defined in: [src/webassembly/wasm/opcode\_type.ts:8](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L8)

#### Inherited from

[`WasmType`](WasmType.md).[`id`](WasmType.md#id)

## Accessors

### args

#### Get Signature

> **get** **args**(): [`Type`](../wasmito/namespaces/WASM/enumerations/Type.md)[]

Defined in: [src/webassembly/wasm/opcode\_type.ts:18](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L18)

##### Returns

[`Type`](../wasmito/namespaces/WASM/enumerations/Type.md)[]

#### Set Signature

> **set** **args**(`a`): `void`

Defined in: [src/webassembly/wasm/opcode\_type.ts:22](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L22)

##### Parameters

###### a

[`Type`](../wasmito/namespaces/WASM/enumerations/Type.md)[]

##### Returns

`void`

#### Inherited from

[`WasmType`](WasmType.md).[`args`](WasmType.md#args)

***

### nrArgs

#### Get Signature

> **get** **nrArgs**(): `number`

Defined in: [src/webassembly/wasm/opcode\_type.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L27)

##### Returns

`number`

#### Inherited from

[`WasmType`](WasmType.md).[`nrArgs`](WasmType.md#nrargs)

***

### nrResults

#### Get Signature

> **get** **nrResults**(): `number`

Defined in: [src/webassembly/wasm/opcode\_type.ts:31](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L31)

##### Returns

`number`

#### Inherited from

[`WasmType`](WasmType.md).[`nrResults`](WasmType.md#nrresults)

***

### returnTypes

#### Get Signature

> **get** **returnTypes**(): [`Type`](../wasmito/namespaces/WASM/enumerations/Type.md)[]

Defined in: [src/webassembly/wasm/opcode\_type.ts:35](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L35)

##### Returns

[`Type`](../wasmito/namespaces/WASM/enumerations/Type.md)[]

#### Set Signature

> **set** **returnTypes**(`a`): `void`

Defined in: [src/webassembly/wasm/opcode\_type.ts:39](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L39)

##### Parameters

###### a

[`Type`](../wasmito/namespaces/WASM/enumerations/Type.md)[]

##### Returns

`void`

#### Inherited from

[`WasmType`](WasmType.md).[`returnTypes`](WasmType.md#returntypes)

## Methods

### equals()

> **equals**(`other`): `boolean`

Defined in: [src/webassembly/wasm/opcode\_type.ts:48](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L48)

#### Parameters

##### other

[`WasmType`](WasmType.md)

#### Returns

`boolean`

#### Inherited from

[`WasmType`](WasmType.md).[`equals`](WasmType.md#equals)

***

### hasResult()

> **hasResult**(): `boolean`

Defined in: [src/webassembly/wasm/opcode\_type.ts:44](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L44)

#### Returns

`boolean`

#### Inherited from

[`WasmType`](WasmType.md).[`hasResult`](WasmType.md#hasresult)

***

### toJSONObj()

> **toJSONObj**(): `object`

Defined in: [src/webassembly/wasm/opcode\_type.ts:66](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L66)

#### Returns

`object`

#### Inherited from

[`WasmType`](WasmType.md).[`toJSONObj`](WasmType.md#tojsonobj)
