[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / UpdateWasmModuleRequest

# Class: UpdateWasmModuleRequest

Defined in: [src/runtimes/wasmito\_vm/requests/update\_module\_request.ts:8](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/update_module_request.ts#L8)

## Extends

- [`APIRequestNoSubscription`](APIRequestNoSubscription.md)\<`string`\>

## Constructors

### Constructor

> **new UpdateWasmModuleRequest**(`wasm`): `UpdateWasmModuleRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/update\_module\_request.ts:11](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/update_module_request.ts#L11)

#### Parameters

##### wasm

`Buffer`

#### Returns

`UpdateWasmModuleRequest`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`constructor`](APIRequestNoSubscription.md#constructor)

## Methods

### description()

> **description**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/update\_module\_request.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/update_module_request.ts#L17)

#### Returns

`string`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`description`](APIRequestNoSubscription.md#description)

***

### getData()

> **getData**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/update\_module\_request.ts:21](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/update_module_request.ts#L21)

#### Returns

`string`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`getData`](APIRequestNoSubscription.md#getdata)

***

### handleSubscriptionData()

> **handleSubscriptionData**(`data`): `void`

Defined in: [src/runtimes/request\_interface.ts:20](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L20)

#### Parameters

##### data

`string`

#### Returns

`void`

#### Inherited from

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`handleSubscriptionData`](APIRequestNoSubscription.md#handlesubscriptiondata)

***

### isSubscriptionClosed()

> **isSubscriptionClosed**(): `boolean`

Defined in: [src/runtimes/request\_interface.ts:21](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L21)

#### Returns

`boolean`

#### Inherited from

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`isSubscriptionClosed`](APIRequestNoSubscription.md#issubscriptionclosed)

***

### parse()

> **parse**(`input`): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/update\_module\_request.ts:29](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/update_module_request.ts#L29)

#### Parameters

##### input

`string`

#### Returns

`string`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`parse`](APIRequestNoSubscription.md#parse)
