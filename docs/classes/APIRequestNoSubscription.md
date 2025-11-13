[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / APIRequestNoSubscription

# Abstract Class: APIRequestNoSubscription\<R\>

Defined in: [src/runtimes/request\_interface.ts:18](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L18)

## Extends

- [`APIRequest`](APIRequest.md)\<`R`\>

## Extended by

- [`AroundFunctionRequest`](AroundFunctionRequest.md)
- [`InspectStack`](InspectStack.md)
- [`StateRequest`](StateRequest.md)
- [`LoadStateRequest`](LoadStateRequest.md)
- [`PauseRequest`](PauseRequest.md)
- [`ProxifyRequest`](ProxifyRequest.md)
- [`ResolveEventRequest`](ResolveEventRequest.md)
- [`RunRequest`](RunRequest.md)
- [`StepRequest`](StepRequest.md)
- [`UpdateWasmModuleRequest`](UpdateWasmModuleRequest.md)
- [`FunCallRequest`](FunCallRequest.md)

## Type Parameters

### R

`R`

## Constructors

### Constructor

> **new APIRequestNoSubscription**\<`R`\>(): `APIRequestNoSubscription`\<`R`\>

#### Returns

`APIRequestNoSubscription`\<`R`\>

#### Inherited from

[`APIRequest`](APIRequest.md).[`constructor`](APIRequest.md#constructor)

## Methods

### description()

> `abstract` **description**(): `string`

Defined in: [src/runtimes/request\_interface.ts:11](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L11)

#### Returns

`string`

#### Inherited from

[`APIRequest`](APIRequest.md).[`description`](APIRequest.md#description)

***

### getData()

> `abstract` **getData**(): `string`

Defined in: [src/runtimes/request\_interface.ts:12](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L12)

#### Returns

`string`

#### Inherited from

[`APIRequest`](APIRequest.md).[`getData`](APIRequest.md#getdata)

***

### handleSubscriptionData()

> **handleSubscriptionData**(`data`): `void`

Defined in: [src/runtimes/request\_interface.ts:20](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L20)

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

Defined in: [src/runtimes/request\_interface.ts:21](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L21)

#### Returns

`boolean`

#### Overrides

[`APIRequest`](APIRequest.md).[`isSubscriptionClosed`](APIRequest.md#issubscriptionclosed)

***

### parse()

> `abstract` **parse**(`input`): `R`

Defined in: [src/runtimes/request\_interface.ts:13](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L13)

#### Parameters

##### input

`string`

#### Returns

`R`

#### Inherited from

[`APIRequest`](APIRequest.md).[`parse`](APIRequest.md#parse)
