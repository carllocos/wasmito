[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / FunCallRequest

# Abstract Class: FunCallRequest\<R\>

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:12](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L12)

## Extends

- [`APIRequestNoSubscription`](APIRequestNoSubscription.md)\<`R`\>

## Extended by

- [`ProxyCallRequest`](ProxyCallRequest.md)

## Type Parameters

### R

`R`

## Constructors

### Constructor

> **new FunCallRequest**\<`R`\>(`funcToCall`, `args`, `isProxyCall`): `FunCallRequest`\<`R`\>

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L17)

#### Parameters

##### funcToCall

`number`

##### args

[`Value`](../wasmito/namespaces/WASM/interfaces/Value.md)[]

##### isProxyCall

`boolean` = `false`

#### Returns

`FunCallRequest`\<`R`\>

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`constructor`](APIRequestNoSubscription.md#constructor)

## Methods

### description()

> **description**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L28)

#### Returns

`string`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`description`](APIRequestNoSubscription.md#description)

***

### encodeRemoteCallRequest()

> **encodeRemoteCallRequest**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:48](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L48)

#### Returns

`string`

***

### getData()

> **getData**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:38](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L38)

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

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:42](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L42)

#### Returns

`boolean`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`isSubscriptionClosed`](APIRequestNoSubscription.md#issubscriptionclosed)

***

### parse()

> `abstract` **parse**(`input`): `R`

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:46](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L46)

#### Parameters

##### input

`string`

#### Returns

`R`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`parse`](APIRequestNoSubscription.md#parse)
