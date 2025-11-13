[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / StateBinaryEncoder

# Class: StateBinaryEncoder

Defined in: [src/webassembly/old\_binary\_state\_serializer.ts:262](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/old_binary_state_serializer.ts#L262)

## Constructors

### Constructor

> **new StateBinaryEncoder**(`wasmState`): `StateBinaryEncoder`

Defined in: [src/webassembly/old\_binary\_state\_serializer.ts:264](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/old_binary_state_serializer.ts#L264)

#### Parameters

##### wasmState

[`WasmState`](WasmState.md)

#### Returns

`StateBinaryEncoder`

## Methods

### toBinary()

> **toBinary**(`maxInterruptSize`): `string`[]

Defined in: [src/webassembly/old\_binary\_state\_serializer.ts:268](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/old_binary_state_serializer.ts#L268)

#### Parameters

##### maxInterruptSize

`number` = `1024`

#### Returns

`string`[]

***

### serializeValue()

> `static` **serializeValue**(`val`, `includeType`): `string`

Defined in: [src/webassembly/old\_binary\_state\_serializer.ts:583](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/old_binary_state_serializer.ts#L583)

#### Parameters

##### val

[`WASMValueIndexed`](../interfaces/WASMValueIndexed.md)

##### includeType

`boolean` = `true`

#### Returns

`string`
