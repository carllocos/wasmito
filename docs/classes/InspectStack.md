[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / InspectStack

# Class: InspectStack

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L28)

## Extends

- [`APIRequestNoSubscription`](APIRequestNoSubscription.md)\<[`WasmStack`](WasmStack.md)\>

## Constructors

### Constructor

> **new InspectStack**(): `InspectStack`

#### Returns

`InspectStack`

#### Inherited from

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`constructor`](APIRequestNoSubscription.md#constructor)

## Methods

### description()

> **description**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:29](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L29)

#### Returns

`string`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`description`](APIRequestNoSubscription.md#description)

***

### getData()

> **getData**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:33](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L33)

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

> **parse**(`input`): [`WasmStack`](WasmStack.md)

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:37](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L37)

#### Parameters

##### input

`string`

#### Returns

[`WasmStack`](WasmStack.md)

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`parse`](APIRequestNoSubscription.md#parse)
