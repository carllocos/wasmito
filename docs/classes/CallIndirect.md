[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / CallIndirect

# Class: CallIndirect

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:346](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L346)

## Extends

- [`WasmInstruction`](WasmInstruction.md)

## Constructors

### Constructor

> **new CallIndirect**(`signature`): `CallIndirect`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:350](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L350)

#### Parameters

##### signature

[`WasmType`](WasmType.md)

#### Returns

`CallIndirect`

#### Overrides

[`WasmInstruction`](WasmInstruction.md).[`constructor`](WasmInstruction.md#constructor)

## Properties

### args

> **args**: `string`[]

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:30](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L30)

#### Inherited from

[`WasmInstruction`](WasmInstruction.md).[`args`](WasmInstruction.md#args)

***

### endAddress

> **endAddress**: `number`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:33](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L33)

#### Inherited from

[`WasmInstruction`](WasmInstruction.md).[`endAddress`](WasmInstruction.md#endaddress)

***

### immediate?

> `optional` **immediate**: `number`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L28)

#### Inherited from

[`WasmInstruction`](WasmInstruction.md).[`immediate`](WasmInstruction.md#immediate)

***

### name

> `readonly` **name**: `string`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L27)

#### Inherited from

[`WasmInstruction`](WasmInstruction.md).[`name`](WasmInstruction.md#name)

***

### opcodeNr

> `readonly` **opcodeNr**: `number`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:25](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L25)

#### Inherited from

[`WasmInstruction`](WasmInstruction.md).[`opcodeNr`](WasmInstruction.md#opcodenr)

***

### startAddress

> **startAddress**: `number`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:32](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L32)

#### Inherited from

[`WasmInstruction`](WasmInstruction.md).[`startAddress`](WasmInstruction.md#startaddress)

***

### subOpcode

> `readonly` **subOpcode**: `number` \| `undefined`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:26](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L26)

#### Inherited from

[`WasmInstruction`](WasmInstruction.md).[`subOpcode`](WasmInstruction.md#subopcode)

## Accessors

### allSubInstructions

#### Get Signature

> **get** **allSubInstructions**(): [`WasmInstruction`](WasmInstruction.md)[]

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:83](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L83)

##### Returns

[`WasmInstruction`](WasmInstruction.md)[]

#### Inherited from

[`WasmInstruction`](WasmInstruction.md).[`allSubInstructions`](WasmInstruction.md#allsubinstructions)

***

### signature

#### Get Signature

> **get** **signature**(): [`WasmType`](WasmType.md)

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:87](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L87)

##### Returns

[`WasmType`](WasmType.md)

#### Set Signature

> **set** **signature**(`type`): `void`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:91](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L91)

##### Parameters

###### type

[`WasmType`](WasmType.md)

##### Returns

`void`

#### Inherited from

[`WasmInstruction`](WasmInstruction.md).[`signature`](WasmInstruction.md#signature)

***

### subInstructions

#### Get Signature

> **get** **subInstructions**(): [`WasmInstruction`](WasmInstruction.md)[]

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:69](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L69)

##### Returns

[`WasmInstruction`](WasmInstruction.md)[]

#### Set Signature

> **set** **subInstructions**(`ins`): `void`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:73](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L73)

##### Parameters

###### ins

[`WasmInstruction`](WasmInstruction.md)[]

##### Returns

`void`

#### Inherited from

[`WasmInstruction`](WasmInstruction.md).[`subInstructions`](WasmInstruction.md#subinstructions)

***

### tableIndex

#### Get Signature

> **get** **tableIndex**(): `number`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:370](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L370)

##### Returns

`number`

#### Set Signature

> **set** **tableIndex**(`i`): `void`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:374](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L374)

##### Parameters

###### i

`number`

##### Returns

`void`

***

### targetFuncs

#### Get Signature

> **get** **targetFuncs**(): `number`[]

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:362](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L362)

##### Returns

`number`[]

#### Set Signature

> **set** **targetFuncs**(`nt`): `void`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:366](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L366)

##### Parameters

###### nt

`number`[]

##### Returns

`void`

## Methods

### getArgs()

> **getArgs**(): `string`[]

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:97](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L97)

#### Returns

`string`[]

#### Inherited from

[`WasmInstruction`](WasmInstruction.md).[`getArgs`](WasmInstruction.md#getargs)

***

### hasTableIndex()

> **hasTableIndex**(): `boolean`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:378](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L378)

#### Returns

`boolean`

***

### toJSON()

> **toJSON**(): `string`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:114](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L114)

#### Returns

`string`

#### Inherited from

[`WasmInstruction`](WasmInstruction.md).[`toJSON`](WasmInstruction.md#tojson)

***

### toJSONObj()

> **toJSONObj**(): `object`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:382](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L382)

#### Returns

`object`

#### Overrides

[`WasmInstruction`](WasmInstruction.md).[`toJSONObj`](WasmInstruction.md#tojsonobj)
