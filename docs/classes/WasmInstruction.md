[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / WasmInstruction

# Class: WasmInstruction

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:24](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L24)

## Extended by

- [`BranchIf`](BranchIf.md)
- [`Branch`](Branch.md)
- [`BranchTable`](BranchTable.md)
- [`ReturnBranch`](ReturnBranch.md)
- [`IfInstruction`](IfInstruction.md)
- [`BlockInstruction`](BlockInstruction.md)
- [`CallInstruction`](CallInstruction.md)
- [`CallIndirect`](CallIndirect.md)
- [`LoopInstruction`](LoopInstruction.md)
- [`ConstInstr`](ConstInstr.md)

## Constructors

### Constructor

> **new WasmInstruction**(`opcodeName`, `opcodeNr`, `immediate?`, `opcodeLabels?`, `signature?`): `WasmInstruction`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:37](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L37)

#### Parameters

##### opcodeName

`string`

##### opcodeNr

`number` | `number`[]

##### immediate?

`number`

##### opcodeLabels?

`string`[]

##### signature?

[`WasmType`](WasmType.md)

#### Returns

`WasmInstruction`

## Properties

### args

> **args**: `string`[]

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:30](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L30)

***

### endAddress

> **endAddress**: `number`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:33](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L33)

***

### immediate?

> `optional` **immediate**: `number`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L28)

***

### name

> `readonly` **name**: `string`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L27)

***

### opcodeNr

> `readonly` **opcodeNr**: `number`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:25](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L25)

***

### startAddress

> **startAddress**: `number`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:32](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L32)

***

### subOpcode

> `readonly` **subOpcode**: `number` \| `undefined`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:26](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L26)

## Accessors

### allSubInstructions

#### Get Signature

> **get** **allSubInstructions**(): `WasmInstruction`[]

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:83](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L83)

##### Returns

`WasmInstruction`[]

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

***

### subInstructions

#### Get Signature

> **get** **subInstructions**(): `WasmInstruction`[]

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:69](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L69)

##### Returns

`WasmInstruction`[]

#### Set Signature

> **set** **subInstructions**(`ins`): `void`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:73](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L73)

##### Parameters

###### ins

`WasmInstruction`[]

##### Returns

`void`

## Methods

### getArgs()

> **getArgs**(): `string`[]

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:97](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L97)

#### Returns

`string`[]

***

### toJSON()

> **toJSON**(): `string`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:114](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L114)

#### Returns

`string`

***

### toJSONObj()

> **toJSONObj**(): `object`

Defined in: [src/webassembly/wasm/wasm\_instruction.ts:101](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_instruction.ts#L101)

#### Returns

`object`
