[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / WasmCFGs

# Class: WasmCFGs

Defined in: [src/cfg/wasm\_cfg.ts:87](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/wasm_cfg.ts#L87)

## Constructors

### Constructor

> **new WasmCFGs**(`wasm`): `WasmCFGs`

Defined in: [src/cfg/wasm\_cfg.ts:93](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/wasm_cfg.ts#L93)

#### Parameters

##### wasm

[`WasmModule`](WasmModule.md)

#### Returns

`WasmCFGs`

## Accessors

### callgraph

#### Get Signature

> **get** **callgraph**(): [`CallGraph`](CallGraph.md)

Defined in: [src/cfg/wasm\_cfg.ts:101](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/wasm_cfg.ts#L101)

##### Returns

[`CallGraph`](CallGraph.md)

***

### graphs

#### Get Signature

> **get** **graphs**(): [`WasmFuncToWasmCFG`](../type-aliases/WasmFuncToWasmCFG.md)

Defined in: [src/cfg/wasm\_cfg.ts:105](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/wasm_cfg.ts#L105)

##### Returns

[`WasmFuncToWasmCFG`](../type-aliases/WasmFuncToWasmCFG.md)

## Methods

### callSites()

> **callSites**(`funID`): `Set`\<`number`\>

Defined in: [src/cfg/wasm\_cfg.ts:121](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/wasm_cfg.ts#L121)

#### Parameters

##### funID

`number`

#### Returns

`Set`\<`number`\>

***

### getCFG()

> **getCFG**(`funID`): [`WasmCFG`](../interfaces/WasmCFG.md) \| `undefined`

Defined in: [src/cfg/wasm\_cfg.ts:109](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/wasm_cfg.ts#L109)

#### Parameters

##### funID

`number`

#### Returns

[`WasmCFG`](../interfaces/WasmCFG.md) \| `undefined`

***

### getCFGFromAddr()

> **getCFGFromAddr**(`instructionAddr`): [`WasmCFG`](../interfaces/WasmCFG.md) \| `undefined`

Defined in: [src/cfg/wasm\_cfg.ts:113](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/wasm_cfg.ts#L113)

#### Parameters

##### instructionAddr

`number`

#### Returns

[`WasmCFG`](../interfaces/WasmCFG.md) \| `undefined`

***

### getCFGNodeFromAddr()

> **getCFGNodeFromAddr**(`instructionAddr`): [`CFGNode`](../interfaces/CFGNode.md) \| `undefined`

Defined in: [src/cfg/wasm\_cfg.ts:133](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/wasm_cfg.ts#L133)

#### Parameters

##### instructionAddr

`number`

#### Returns

[`CFGNode`](../interfaces/CFGNode.md) \| `undefined`

***

### getCFGOrError()

> **getCFGOrError**(`funID`): [`WasmCFG`](../interfaces/WasmCFG.md)

Defined in: [src/cfg/wasm\_cfg.ts:125](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/wasm_cfg.ts#L125)

#### Parameters

##### funID

`number`

#### Returns

[`WasmCFG`](../interfaces/WasmCFG.md)

***

### serializeToDot()

> **serializeToDot**(`outputDir`, `funIds`): `string`[]

Defined in: [src/cfg/wasm\_cfg.ts:138](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/wasm_cfg.ts#L138)

#### Parameters

##### outputDir

`string`

##### funIds

`number`[] = `[]`

#### Returns

`string`[]

***

### toJSON()

> **toJSON**(`outputDir?`): `string`

Defined in: [src/cfg/wasm\_cfg.ts:153](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/wasm_cfg.ts#L153)

#### Parameters

##### outputDir?

`string`

#### Returns

`string`
