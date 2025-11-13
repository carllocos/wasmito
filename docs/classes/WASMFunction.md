[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / WASMFunction

# Class: WASMFunction

Defined in: [src/webassembly/wasm/wasm\_function.ts:18](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L18)

## Constructors

### Constructor

> **new WASMFunction**(`name`, `id`, `instructions`, `funcType`, `locals`, `exported`, `exportName?`): `WASMFunction`

Defined in: [src/webassembly/wasm/wasm\_function.ts:34](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L34)

#### Parameters

##### name

`string`

##### id

`number`

##### instructions

[`WasmInstruction`](WasmInstruction.md)[]

##### funcType

[`WasmType`](WasmType.md)

##### locals

[`WasmLocal`](../interfaces/WasmLocal.md)[]

##### exported

`boolean`

##### exportName?

`string`

#### Returns

`WASMFunction`

## Properties

### body

> `readonly` **body**: [`WasmInstruction`](WasmInstruction.md)[]

Defined in: [src/webassembly/wasm/wasm\_function.ts:31](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L31)

***

### endAddress

> **endAddress**: `number`

Defined in: [src/webassembly/wasm/wasm\_function.ts:30](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L30)

***

### exported

> `readonly` **exported**: `boolean`

Defined in: [src/webassembly/wasm/wasm\_function.ts:23](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L23)

***

### exportName

> `readonly` **exportName**: `string`

Defined in: [src/webassembly/wasm/wasm\_function.ts:24](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L24)

***

### fullName

> **fullName**: `string`

Defined in: [src/webassembly/wasm/wasm\_function.ts:20](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L20)

***

### id

> `readonly` **id**: `number`

Defined in: [src/webassembly/wasm/wasm\_function.ts:22](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L22)

***

### locals

> `readonly` **locals**: [`WasmLocal`](../interfaces/WasmLocal.md)[]

Defined in: [src/webassembly/wasm/wasm\_function.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L27)

***

### name

> `readonly` **name**: `string`

Defined in: [src/webassembly/wasm/wasm\_function.ts:19](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L19)

***

### startAddress

> **startAddress**: `number`

Defined in: [src/webassembly/wasm/wasm\_function.ts:29](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L29)

***

### type

> `readonly` **type**: [`WasmType`](WasmType.md)

Defined in: [src/webassembly/wasm/wasm\_function.ts:26](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L26)

## Accessors

### allInstructions

#### Get Signature

> **get** **allInstructions**(): [`WasmInstruction`](WasmInstruction.md)[]

Defined in: [src/webassembly/wasm/wasm\_function.ts:64](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L64)

##### Returns

[`WasmInstruction`](WasmInstruction.md)[]

## Methods

### getAllInstructions()

> **getAllInstructions**(`ints`): [`WasmInstruction`](WasmInstruction.md)[]

Defined in: [src/webassembly/wasm/wasm\_function.ts:68](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L68)

#### Parameters

##### ints

[`WasmInstruction`](WasmInstruction.md)[]

#### Returns

[`WasmInstruction`](WasmInstruction.md)[]

***

### getCallInstructions()

> **getCallInstructions**(`fID?`): [`CallInstruction`](CallInstruction.md)[]

Defined in: [src/webassembly/wasm/wasm\_function.ts:81](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L81)

#### Parameters

##### fID?

`number`

#### Returns

[`CallInstruction`](CallInstruction.md)[]

***

### getLocalGetInstructions()

> **getLocalGetInstructions**(): [`WasmInstruction`](WasmInstruction.md)[]

Defined in: [src/webassembly/wasm/wasm\_function.ts:94](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L94)

#### Returns

[`WasmInstruction`](WasmInstruction.md)[]

***

### getLocalSetInstructions()

> **getLocalSetInstructions**(): [`WasmInstruction`](WasmInstruction.md)[]

Defined in: [src/webassembly/wasm/wasm\_function.ts:104](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L104)

#### Returns

[`WasmInstruction`](WasmInstruction.md)[]

***

### isAddressInFunction()

> **isAddressInFunction**(`addr`): `boolean`

Defined in: [src/webassembly/wasm/wasm\_function.ts:114](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_function.ts#L114)

#### Parameters

##### addr

`number`

#### Returns

`boolean`
