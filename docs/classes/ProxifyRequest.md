[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / ProxifyRequest

# Class: ProxifyRequest

Defined in: [src/runtimes/wasmito\_vm/requests/proxify\_request.ts:7](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/proxify_request.ts#L7)

## Extends

- [`APIRequestNoSubscription`](APIRequestNoSubscription.md)\<`string`\>

## Constructors

### Constructor

> **new ProxifyRequest**(): `ProxifyRequest`

#### Returns

`ProxifyRequest`

#### Inherited from

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`constructor`](APIRequestNoSubscription.md#constructor)

## Methods

### description()

> **description**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/proxify\_request.ts:12](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/proxify_request.ts#L12)

#### Returns

`string`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`description`](APIRequestNoSubscription.md#description)

***

### getData()

> **getData**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/proxify\_request.ts:8](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/proxify_request.ts#L8)

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

Defined in: [src/runtimes/wasmito\_vm/requests/proxify\_request.ts:16](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/proxify_request.ts#L16)

#### Parameters

##### input

`string`

#### Returns

`string`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`parse`](APIRequestNoSubscription.md#parse)
