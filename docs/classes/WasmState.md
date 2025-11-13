[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / WasmState

# Class: WasmState

Defined in: [src/webassembly/wasm.ts:301](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L301)

## Constructors

### Constructor

> **new WasmState**(`args`, `jsonString?`): `WasmState`

Defined in: [src/webassembly/wasm.ts:316](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L316)

#### Parameters

##### args

`any`

##### jsonString?

`string`

#### Returns

`WasmState`

## Properties

### br\_table?

> `optional` **br\_table**: [`BRTable`](../wasmito/namespaces/WASM/interfaces/BRTable.md)

Defined in: [src/webassembly/wasm.ts:309](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L309)

***

### breakpoints?

> `optional` **breakpoints**: `number`[]

Defined in: [src/webassembly/wasm.ts:303](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L303)

***

### callbacks?

> `optional` **callbacks**: [`CallbackMapping`](../wasmito/namespaces/WASM/interfaces/CallbackMapping.md)[]

Defined in: [src/webassembly/wasm.ts:310](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L310)

***

### callstack?

> `optional` **callstack**: [`Frame`](../wasmito/namespaces/WASM/interfaces/Frame.md)[]

Defined in: [src/webassembly/wasm.ts:305](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L305)

***

### events?

> `optional` **events**: [`Event`](../wasmito/namespaces/WASM/interfaces/Event.md)[]

Defined in: [src/webassembly/wasm.ts:311](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L311)

***

### exception?

> `optional` **exception**: `string`

Defined in: [src/webassembly/wasm.ts:312](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L312)

***

### globals?

> `optional` **globals**: [`WASMValueIndexed`](../interfaces/WASMValueIndexed.md)[]

Defined in: [src/webassembly/wasm.ts:306](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L306)

***

### memory?

> `optional` **memory**: [`Memory`](../wasmito/namespaces/WASM/interfaces/Memory.md)

Defined in: [src/webassembly/wasm.ts:308](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L308)

***

### pc?

> `optional` **pc**: `number`

Defined in: [src/webassembly/wasm.ts:302](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L302)

***

### stack?

> `optional` **stack**: [`WASMValueIndexed`](../interfaces/WASMValueIndexed.md)[]

Defined in: [src/webassembly/wasm.ts:304](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L304)

***

### table?

> `optional` **table**: [`Table`](../wasmito/namespaces/WASM/interfaces/Table.md)

Defined in: [src/webassembly/wasm.ts:307](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L307)

## Accessors

### callbackMappings

#### Get Signature

> **get** **callbackMappings**(): [`CallbackMapping`](../wasmito/namespaces/WASM/interfaces/CallbackMapping.md)[]

Defined in: [src/webassembly/wasm.ts:440](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L440)

##### Returns

[`CallbackMapping`](../wasmito/namespaces/WASM/interfaces/CallbackMapping.md)[]

## Methods

### asJSONString()

> **asJSONString**(): `string`

Defined in: [src/webassembly/wasm.ts:462](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L462)

#### Returns

`string`

***

### isSnapshot()

> **isSnapshot**(): `boolean`

Defined in: [src/webassembly/wasm.ts:447](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/webassembly/wasm.ts#L447)

#### Returns

`boolean`
