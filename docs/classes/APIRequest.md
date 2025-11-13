[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / APIRequest

# Abstract Class: APIRequest\<R\>

Defined in: [src/runtimes/request\_interface.ts:10](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L10)

## Extended by

- [`APIRequestNoSubscription`](APIRequestNoSubscription.md)
- [`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md)

## Type Parameters

### R

`R`

## Constructors

### Constructor

> **new APIRequest**\<`R`\>(): `APIRequest`\<`R`\>

#### Returns

`APIRequest`\<`R`\>

## Methods

### description()

> `abstract` **description**(): `string`

Defined in: [src/runtimes/request\_interface.ts:11](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L11)

#### Returns

`string`

***

### getData()

> `abstract` **getData**(): `string`

Defined in: [src/runtimes/request\_interface.ts:12](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L12)

#### Returns

`string`

***

### handleSubscriptionData()

> `abstract` **handleSubscriptionData**(`data`): `void`

Defined in: [src/runtimes/request\_interface.ts:14](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L14)

#### Parameters

##### data

`string`

#### Returns

`void`

***

### isSubscriptionClosed()

> `abstract` **isSubscriptionClosed**(): `boolean`

Defined in: [src/runtimes/request\_interface.ts:15](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L15)

#### Returns

`boolean`

***

### parse()

> `abstract` **parse**(`input`): `R`

Defined in: [src/runtimes/request\_interface.ts:13](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L13)

#### Parameters

##### input

`string`

#### Returns

`R`
