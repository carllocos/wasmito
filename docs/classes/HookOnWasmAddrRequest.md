[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / HookOnWasmAddrRequest

# Class: HookOnWasmAddrRequest

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:47](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L47)

## Extends

- [`APIRequest`](APIRequest.md)\<[`HookOnWasmAddrResponse`](../interfaces/HookOnWasmAddrResponse.md)\>

## Extended by

- [`RemoveHookOnWasmAddrRequest`](RemoveHookOnWasmAddrRequest.md)

## Constructors

### Constructor

> **new HookOnWasmAddrRequest**(`wasmAddr`, `moment?`): `HookOnWasmAddrRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:56](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L56)

#### Parameters

##### wasmAddr

`number`

##### moment?

[`HookOnWasmAddrMoment`](../enumerations/HookOnWasmAddrMoment.md)

#### Returns

`HookOnWasmAddrRequest`

#### Overrides

[`APIRequest`](APIRequest.md).[`constructor`](APIRequest.md#constructor)

## Properties

### hooks

> `readonly` **hooks**: [`Hook`](Hook.md)[]

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:50](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L50)

***

### isaddRequest

> `protected` **isaddRequest**: `boolean`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:53](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L53)

***

### wasmAddr

> `readonly` **wasmAddr**: `number`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:49](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L49)

## Methods

### addHook()

> **addHook**(`hook`): `HookOnWasmAddrRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:77](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L77)

#### Parameters

##### hook

[`Hook`](Hook.md)

#### Returns

`HookOnWasmAddrRequest`

***

### after()

> **after**(): `HookOnWasmAddrRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:72](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L72)

#### Returns

`HookOnWasmAddrRequest`

***

### before()

> **before**(): `HookOnWasmAddrRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:67](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L67)

#### Returns

`HookOnWasmAddrRequest`

***

### closeSubscription()

> **closeSubscription**(): `void`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:129](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L129)

#### Returns

`void`

***

### description()

> **description**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:86](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L86)

#### Returns

`string`

#### Overrides

[`APIRequest`](APIRequest.md).[`description`](APIRequest.md#description)

***

### getData()

> **getData**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:94](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L94)

#### Returns

`string`

#### Overrides

[`APIRequest`](APIRequest.md).[`getData`](APIRequest.md#getdata)

***

### handleSubscriptionData()

> **handleSubscriptionData**(`data`): `void`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:133](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L133)

#### Parameters

##### data

`string`

#### Returns

`void`

#### Overrides

[`APIRequest`](APIRequest.md).[`handleSubscriptionData`](APIRequest.md#handlesubscriptiondata)

***

### isSubscriptionClosed()

> **isSubscriptionClosed**(): `boolean`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:125](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L125)

#### Returns

`boolean`

#### Overrides

[`APIRequest`](APIRequest.md).[`isSubscriptionClosed`](APIRequest.md#issubscriptionclosed)

***

### parse()

> **parse**(`input`): [`HookOnWasmAddrResponse`](../interfaces/HookOnWasmAddrResponse.md)

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:107](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L107)

#### Parameters

##### input

`string`

#### Returns

[`HookOnWasmAddrResponse`](../interfaces/HookOnWasmAddrResponse.md)

#### Overrides

[`APIRequest`](APIRequest.md).[`parse`](APIRequest.md#parse)
