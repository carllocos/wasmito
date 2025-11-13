[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / ProxyCallRequest

# Class: ProxyCallRequest

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:105](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L105)

## Extends

- [`FunCallRequest`](FunCallRequest.md)\<[`ProxyCallResponse`](../type-aliases/ProxyCallResponse.md)\>

## Constructors

### Constructor

> **new ProxyCallRequest**(`funcToCall`, `args`): `ProxyCallRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:106](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L106)

#### Parameters

##### funcToCall

`number`

##### args

[`Value`](../wasmito/namespaces/WASM/interfaces/Value.md)[]

#### Returns

`ProxyCallRequest`

#### Overrides

[`FunCallRequest`](FunCallRequest.md).[`constructor`](FunCallRequest.md#constructor)

## Methods

### decodeErrorResponseHexaString()

> **decodeErrorResponseHexaString**(`hexaInput`): [`ProxyCallFailedRequest`](../interfaces/ProxyCallFailedRequest.md) \| `undefined`

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:190](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L190)

#### Parameters

##### hexaInput

`string`

#### Returns

[`ProxyCallFailedRequest`](../interfaces/ProxyCallFailedRequest.md) \| `undefined`

***

### decodeHexaStringResponse()

> **decodeHexaStringResponse**(`hexaInput`): [`ProxyCallResponse`](../type-aliases/ProxyCallResponse.md) \| `undefined`

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:118](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L118)

#### Parameters

##### hexaInput

`string`

#### Returns

[`ProxyCallResponse`](../type-aliases/ProxyCallResponse.md) \| `undefined`

***

### decodeSuccessfulResponseHexaString()

> **decodeSuccessfulResponseHexaString**(`hexaInput`): [`ProxyCallSuccessfulResponse`](../interfaces/ProxyCallSuccessfulResponse.md) \| `undefined`

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:144](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L144)

#### Parameters

##### hexaInput

`string`

#### Returns

[`ProxyCallSuccessfulResponse`](../interfaces/ProxyCallSuccessfulResponse.md) \| `undefined`

***

### description()

> **description**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L28)

#### Returns

`string`

#### Inherited from

[`FunCallRequest`](FunCallRequest.md).[`description`](FunCallRequest.md#description)

***

### encodeRemoteCallRequest()

> **encodeRemoteCallRequest**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:48](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L48)

#### Returns

`string`

#### Inherited from

[`FunCallRequest`](FunCallRequest.md).[`encodeRemoteCallRequest`](FunCallRequest.md#encoderemotecallrequest)

***

### getData()

> **getData**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:38](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L38)

#### Returns

`string`

#### Inherited from

[`FunCallRequest`](FunCallRequest.md).[`getData`](FunCallRequest.md#getdata)

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

[`FunCallRequest`](FunCallRequest.md).[`handleSubscriptionData`](FunCallRequest.md#handlesubscriptiondata)

***

### isSubscriptionClosed()

> **isSubscriptionClosed**(): `boolean`

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:42](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L42)

#### Returns

`boolean`

#### Inherited from

[`FunCallRequest`](FunCallRequest.md).[`isSubscriptionClosed`](FunCallRequest.md#issubscriptionclosed)

***

### parse()

> **parse**(`input`): [`ProxyCallResponse`](../type-aliases/ProxyCallResponse.md)

Defined in: [src/runtimes/wasmito\_vm/requests/fun\_call\_request.ts:110](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/fun_call_request.ts#L110)

#### Parameters

##### input

`string`

#### Returns

[`ProxyCallResponse`](../type-aliases/ProxyCallResponse.md)

#### Overrides

[`FunCallRequest`](FunCallRequest.md).[`parse`](FunCallRequest.md#parse)
