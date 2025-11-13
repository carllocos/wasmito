[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / AroundFunctionRequest

# Class: AroundFunctionRequest

Defined in: [src/runtimes/wasmito\_vm/requests/around\_function\_request.ts:70](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/around_function_request.ts#L70)

## Extends

- [`APIRequestNoSubscription`](APIRequestNoSubscription.md)\<[`AroundHookResponse`](../interfaces/AroundHookResponse.md)\>

## Constructors

### Constructor

> **new AroundFunctionRequest**(`fidx`): `AroundFunctionRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/around\_function\_request.ts:75](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/around_function_request.ts#L75)

#### Parameters

##### fidx

`number`

#### Returns

`AroundFunctionRequest`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`constructor`](APIRequestNoSubscription.md#constructor)

## Properties

### function\_idx

> `readonly` **function\_idx**: `number`

Defined in: [src/runtimes/wasmito\_vm/requests/around\_function\_request.ts:71](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/around_function_request.ts#L71)

***

### hooks

> `readonly` **hooks**: [`Hook`](Hook.md)[]

Defined in: [src/runtimes/wasmito\_vm/requests/around\_function\_request.ts:72](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/around_function_request.ts#L72)

## Methods

### addHook()

> **addHook**(`hook`): `AroundFunctionRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/around\_function\_request.ts:96](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/around_function_request.ts#L96)

#### Parameters

##### hook

[`Hook`](Hook.md)

#### Returns

`AroundFunctionRequest`

***

### addRequest()

> **addRequest**(): `AroundFunctionRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/around\_function\_request.ts:91](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/around_function_request.ts#L91)

#### Returns

`AroundFunctionRequest`

***

### description()

> **description**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/around\_function\_request.ts:82](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/around_function_request.ts#L82)

#### Returns

`string`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`description`](APIRequestNoSubscription.md#description)

***

### getData()

> **getData**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/around\_function\_request.ts:107](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/around_function_request.ts#L107)

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

> **parse**(`input`): [`AroundHookResponse`](../interfaces/AroundHookResponse.md)

Defined in: [src/runtimes/wasmito\_vm/requests/around\_function\_request.ts:120](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/around_function_request.ts#L120)

#### Parameters

##### input

`string`

#### Returns

[`AroundHookResponse`](../interfaces/AroundHookResponse.md)

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`parse`](APIRequestNoSubscription.md#parse)

***

### removeRequest()

> **removeRequest**(): `AroundFunctionRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/around\_function\_request.ts:86](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/around_function_request.ts#L86)

#### Returns

`AroundFunctionRequest`
