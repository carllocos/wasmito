[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / WasmType

# Class: WasmType

Defined in: [src/webassembly/wasm/opcode\_type.ts:3](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L3)

## Extended by

- [`PlaceholderType`](PlaceholderType.md)

## Constructors

### Constructor

> **new WasmType**(`nrArgs`, `nrResults`, `id?`): `WasmType`

Defined in: [src/webassembly/wasm/opcode\_type.ts:10](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L10)

#### Parameters

##### nrArgs

`number`

##### nrResults

`number`

##### id?

`number`

#### Returns

`WasmType`

## Properties

### id?

> `readonly` `optional` **id**: `number`

Defined in: [src/webassembly/wasm/opcode\_type.ts:8](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L8)

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

***

### nrArgs

#### Get Signature

> **get** **nrArgs**(): `number`

Defined in: [src/webassembly/wasm/opcode\_type.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L27)

##### Returns

`number`

***

### nrResults

#### Get Signature

> **get** **nrResults**(): `number`

Defined in: [src/webassembly/wasm/opcode\_type.ts:31](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L31)

##### Returns

`number`

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

## Methods

### equals()

> **equals**(`other`): `boolean`

Defined in: [src/webassembly/wasm/opcode\_type.ts:48](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L48)

#### Parameters

##### other

`WasmType`

#### Returns

`boolean`

***

### hasResult()

> **hasResult**(): `boolean`

Defined in: [src/webassembly/wasm/opcode\_type.ts:44](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L44)

#### Returns

`boolean`

***

### toJSONObj()

> **toJSONObj**(): `object`

Defined in: [src/webassembly/wasm/opcode\_type.ts:66](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/opcode_type.ts#L66)

#### Returns

`object`
