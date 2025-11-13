[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / WasmModule

# Class: WasmModule

Defined in: [src/webassembly/wasm/wasm\_module.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L27)

## Constructors

### Constructor

> **new WasmModule**(`wasmPath`): `WasmModule`

Defined in: [src/webassembly/wasm/wasm\_module.ts:43](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L43)

#### Parameters

##### wasmPath

`string`

#### Returns

`WasmModule`

## Properties

### \_functions

> `readonly` **\_functions**: [`WASMFunction`](WASMFunction.md)[]

Defined in: [src/webassembly/wasm/wasm\_module.ts:33](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L33)

***

### elements

> `readonly` **elements**: [`ModuleElement`](../interfaces/ModuleElement.md)[]

Defined in: [src/webassembly/wasm/wasm\_module.ts:41](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L41)

***

### globals

> `readonly` **globals**: [`WasmGlobal`](../interfaces/WasmGlobal.md)[]

Defined in: [src/webassembly/wasm/wasm\_module.ts:32](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L32)

***

### importFuncs

> `readonly` **importFuncs**: [`WASMFunction`](WASMFunction.md)[]

Defined in: [src/webassembly/wasm/wasm\_module.ts:31](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L31)

***

### tableExports

> `readonly` **tableExports**: [`TableExport`](../interfaces/TableExport.md)[]

Defined in: [src/webassembly/wasm/wasm\_module.ts:40](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L40)

***

### tableImports

> `readonly` **tableImports**: [`ModuleTableImport`](../interfaces/ModuleTableImport.md)[]

Defined in: [src/webassembly/wasm/wasm\_module.ts:39](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L39)

***

### types

> `readonly` **types**: [`WasmType`](WasmType.md)[]

Defined in: [src/webassembly/wasm/wasm\_module.ts:30](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L30)

***

### wasmBuffer

> `readonly` **wasmBuffer**: `Buffer`

Defined in: [src/webassembly/wasm/wasm\_module.ts:35](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L35)

***

### wasmPath

> `readonly` **wasmPath**: `string`

Defined in: [src/webassembly/wasm/wasm\_module.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L28)

## Accessors

### functions

#### Get Signature

> **get** **functions**(): [`WASMFunction`](WASMFunction.md)[]

Defined in: [src/webassembly/wasm/wasm\_module.ts:72](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L72)

get the functions defined in the module.
These functions exclude the imported functions.
To access the imported functions do `importFuncs`

##### Returns

[`WASMFunction`](WASMFunction.md)[]

***

### instructions

#### Get Signature

> **get** **instructions**(): [`WasmInstruction`](WasmInstruction.md)[]

Defined in: [src/webassembly/wasm/wasm\_module.ts:76](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L76)

##### Returns

[`WasmInstruction`](WasmInstruction.md)[]

***

### locals

#### Get Signature

> **get** **locals**(): [`WasmLocal`](../interfaces/WasmLocal.md)[]

Defined in: [src/webassembly/wasm/wasm\_module.ts:80](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L80)

##### Returns

[`WasmLocal`](../interfaces/WasmLocal.md)[]

## Methods

### allExportedFuncs()

> **allExportedFuncs**(): [`WASMFunction`](WASMFunction.md)[]

Defined in: [src/webassembly/wasm/wasm\_module.ts:240](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L240)

#### Returns

[`WASMFunction`](WASMFunction.md)[]

***

### getFunction()

> **getFunction**(`id`): [`WASMFunction`](WASMFunction.md) \| `undefined`

Defined in: [src/webassembly/wasm/wasm\_module.ts:196](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L196)

#### Parameters

##### id

`number`

#### Returns

[`WASMFunction`](WASMFunction.md) \| `undefined`

***

### getFunctionFromAddr()

> **getFunctionFromAddr**(`addr`): [`WASMFunction`](WASMFunction.md) \| `undefined`

Defined in: [src/webassembly/wasm/wasm\_module.ts:216](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L216)

#### Parameters

##### addr

`number`

#### Returns

[`WASMFunction`](WASMFunction.md) \| `undefined`

***

### getFunctionOrError()

> **getFunctionOrError**(`id`): [`WASMFunction`](WASMFunction.md)

Defined in: [src/webassembly/wasm/wasm\_module.ts:208](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L208)

#### Parameters

##### id

`number`

#### Returns

[`WASMFunction`](WASMFunction.md)

***

### getGlobalFromAddress()

> **getGlobalFromAddress**(`addr`): [`WasmGlobal`](../interfaces/WasmGlobal.md) \| `undefined`

Defined in: [src/webassembly/wasm/wasm\_module.ts:190](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L190)

#### Parameters

##### addr

`number`

#### Returns

[`WasmGlobal`](../interfaces/WasmGlobal.md) \| `undefined`

***

### getGlobalFromIndex()

> **getGlobalFromIndex**(`index`): [`WasmGlobal`](../interfaces/WasmGlobal.md) \| `undefined`

Defined in: [src/webassembly/wasm/wasm\_module.ts:184](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L184)

#### Parameters

##### index

`number`

#### Returns

[`WasmGlobal`](../interfaces/WasmGlobal.md) \| `undefined`

***

### getInstruction()

> **getInstruction**(`addr`): [`WasmInstruction`](WasmInstruction.md) \| `undefined`

Defined in: [src/webassembly/wasm/wasm\_module.ts:86](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L86)

#### Parameters

##### addr

`number`

#### Returns

[`WasmInstruction`](WasmInstruction.md) \| `undefined`

***

### getMainFunctions()

> **getMainFunctions**(): [`WASMFunction`](WASMFunction.md)[]

Defined in: [src/webassembly/wasm/wasm\_module.ts:224](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L224)

#### Returns

[`WASMFunction`](WASMFunction.md)[]

***

### instructionFromAddress()

> **instructionFromAddress**(`addr`): [`WasmInstruction`](WasmInstruction.md) \| `undefined`

Defined in: [src/webassembly/wasm/wasm\_module.ts:103](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L103)

#### Parameters

##### addr

`number`

#### Returns

[`WasmInstruction`](WasmInstruction.md) \| `undefined`

***

### sectionFromAddress()

> **sectionFromAddress**(`addr`): [`Section`](../interfaces/Section.md) \| `undefined`

Defined in: [src/webassembly/wasm/wasm\_module.ts:97](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L97)

#### Parameters

##### addr

`number`

#### Returns

[`Section`](../interfaces/Section.md) \| `undefined`

***

### toJSON()

> **toJSON**(): `object`

Defined in: [src/webassembly/wasm/wasm\_module.ts:313](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm/wasm_module.ts#L313)

#### Returns

`object`
