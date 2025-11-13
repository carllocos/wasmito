[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / WasmValuesBuilder

# Class: WasmValuesBuilder

Defined in: [src/webassembly/wasm\_value\_array\_builder.ts:3](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm_value_array_builder.ts#L3)

## Constructors

### Constructor

> **new WasmValuesBuilder**(): `WasmValuesBuilder`

Defined in: [src/webassembly/wasm\_value\_array\_builder.ts:5](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm_value_array_builder.ts#L5)

#### Returns

`WasmValuesBuilder`

## Accessors

### values

#### Get Signature

> **get** **values**(): [`Value`](../wasmito/namespaces/WASM/interfaces/Value.md)[]

Defined in: [src/webassembly/wasm\_value\_array\_builder.ts:9](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm_value_array_builder.ts#L9)

##### Returns

[`Value`](../wasmito/namespaces/WASM/interfaces/Value.md)[]

## Methods

### addI32Value()

> **addI32Value**(`value`): `WasmValuesBuilder`

Defined in: [src/webassembly/wasm\_value\_array\_builder.ts:21](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm_value_array_builder.ts#L21)

#### Parameters

##### value

`number`

#### Returns

`WasmValuesBuilder`

***

### addValue()

> **addValue**(`type`, `value`): `WasmValuesBuilder`

Defined in: [src/webassembly/wasm\_value\_array\_builder.ts:13](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm_value_array_builder.ts#L13)

#### Parameters

##### type

[`Type`](../wasmito/namespaces/WASM/enumerations/Type.md)

##### value

`number`

#### Returns

`WasmValuesBuilder`
