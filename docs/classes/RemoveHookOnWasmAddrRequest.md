[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / RemoveHookOnWasmAddrRequest

# Class: RemoveHookOnWasmAddrRequest

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:195](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L195)

## Extends

- [`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md)

## Constructors

### Constructor

> **new RemoveHookOnWasmAddrRequest**(`wasmAddr`): `RemoveHookOnWasmAddrRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:196](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L196)

#### Parameters

##### wasmAddr

`number`

#### Returns

`RemoveHookOnWasmAddrRequest`

#### Overrides

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md).[`constructor`](HookOnWasmAddrRequest.md#constructor)

## Properties

### hooks

> `readonly` **hooks**: [`Hook`](Hook.md)[]

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:50](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L50)

#### Inherited from

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md).[`hooks`](HookOnWasmAddrRequest.md#hooks)

***

### isaddRequest

> `protected` **isaddRequest**: `boolean`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:53](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L53)

#### Inherited from

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md).[`isaddRequest`](HookOnWasmAddrRequest.md#isaddrequest)

***

### wasmAddr

> `readonly` **wasmAddr**: `number`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:49](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L49)

#### Inherited from

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md).[`wasmAddr`](HookOnWasmAddrRequest.md#wasmaddr)

## Methods

### addHook()

> **addHook**(`hook`): [`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md)

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:77](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L77)

#### Parameters

##### hook

[`Hook`](Hook.md)

#### Returns

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md)

#### Inherited from

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md).[`addHook`](HookOnWasmAddrRequest.md#addhook)

***

### after()

> **after**(): [`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md)

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:72](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L72)

#### Returns

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md)

#### Inherited from

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md).[`after`](HookOnWasmAddrRequest.md#after)

***

### before()

> **before**(): [`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md)

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:67](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L67)

#### Returns

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md)

#### Inherited from

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md).[`before`](HookOnWasmAddrRequest.md#before)

***

### closeSubscription()

> **closeSubscription**(): `void`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:129](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L129)

#### Returns

`void`

#### Inherited from

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md).[`closeSubscription`](HookOnWasmAddrRequest.md#closesubscription)

***

### description()

> **description**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:86](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L86)

#### Returns

`string`

#### Inherited from

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md).[`description`](HookOnWasmAddrRequest.md#description)

***

### getData()

> **getData**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:94](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L94)

#### Returns

`string`

#### Inherited from

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md).[`getData`](HookOnWasmAddrRequest.md#getdata)

***

### handleSubscriptionData()

> **handleSubscriptionData**(`data`): `void`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:133](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L133)

#### Parameters

##### data

`string`

#### Returns

`void`

#### Inherited from

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md).[`handleSubscriptionData`](HookOnWasmAddrRequest.md#handlesubscriptiondata)

***

### isSubscriptionClosed()

> **isSubscriptionClosed**(): `boolean`

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:201](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L201)

#### Returns

`boolean`

#### Overrides

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md).[`isSubscriptionClosed`](HookOnWasmAddrRequest.md#issubscriptionclosed)

***

### parse()

> **parse**(`input`): [`HookOnWasmAddrResponse`](../interfaces/HookOnWasmAddrResponse.md)

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:107](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L107)

#### Parameters

##### input

`string`

#### Returns

[`HookOnWasmAddrResponse`](../interfaces/HookOnWasmAddrResponse.md)

#### Inherited from

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md).[`parse`](HookOnWasmAddrRequest.md#parse)
