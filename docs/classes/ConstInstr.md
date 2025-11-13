[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / ConstInstr

# Class: ConstInstr

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:472](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L472)

## Extends

- [`WasmInstruction`](WasmInstruction.md)

## Constructors

### Constructor

> **new ConstInstr**(`opcode`, `value`, `high?`): `ConstInstr`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:483](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L483)

high is only used in combination with a I64Const
and denotes the high bit of a 64bit numbers as explained in
https://www.npmjs.com/package/@xtuc/long/v/4.2.2
it is needed because JS can only handle 54bit numbers

#### Parameters

##### opcode

`number`

##### value

`number`

##### high?

`number`

#### Returns

`ConstInstr`

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

***

### type

> `readonly` **type**: [`Type`](../wasmito/namespaces/WASM/enumerations/Type.md)

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:473](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L473)

***

### value

> `readonly` **value**: `number`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:474](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L474)

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

## Methods

### getArgs()

> **getArgs**(): `string`[]

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:97](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L97)

#### Returns

`string`[]

#### Inherited from

[`WasmInstruction`](WasmInstruction.md).[`getArgs`](WasmInstruction.md#getargs)

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

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:490](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L490)

#### Returns

`object`

#### Overrides

[`WasmInstruction`](WasmInstruction.md).[`toJSONObj`](WasmInstruction.md#tojsonobj)
