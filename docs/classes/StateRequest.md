[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / StateRequest

# Class: StateRequest

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:49](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L49)

## Extends

- [`APIRequestNoSubscription`](APIRequestNoSubscription.md)\<[`WasmState`](WasmState.md)\>

## Constructors

### Constructor

> **new StateRequest**(): `StateRequest`

#### Returns

`StateRequest`

#### Inherited from

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`constructor`](APIRequestNoSubscription.md#constructor)

## Methods

### description()

> **description**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:134](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L134)

#### Returns

`string`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`description`](APIRequestNoSubscription.md#description)

***

### generateInterrupt()

> **generateInterrupt**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:122](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L122)

#### Returns

`string`

***

### getData()

> **getData**(): `string`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:138](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L138)

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

### includeAll()

> **includeAll**(): `StateRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:52](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L52)

#### Returns

`StateRequest`

***

### includeBranchingTable()

> **includeBranchingTable**(): `StateRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:97](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L97)

#### Returns

`StateRequest`

***

### includeBreakpoints()

> **includeBreakpoints**(): `StateRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:102](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L102)

#### Returns

`StateRequest`

***

### includeCallbackMappings()

> **includeCallbackMappings**(): `StateRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:107](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L107)

#### Returns

`StateRequest`

***

### includeCallstack()

> **includeCallstack**(): `StateRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:77](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L77)

#### Returns

`StateRequest`

***

### includeEvents()

> **includeEvents**(): `StateRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:112](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L112)

#### Returns

`StateRequest`

***

### includeException()

> **includeException**(): `StateRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:117](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L117)

#### Returns

`StateRequest`

***

### includeGlobals()

> **includeGlobals**(): `StateRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:82](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L82)

#### Returns

`StateRequest`

***

### includeMemory()

> **includeMemory**(): `StateRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:87](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L87)

#### Returns

`StateRequest`

***

### includePC()

> **includePC**(): `StateRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:67](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L67)

#### Returns

`StateRequest`

***

### includeStack()

> **includeStack**(): `StateRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:72](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L72)

#### Returns

`StateRequest`

***

### includeTable()

> **includeTable**(): `StateRequest`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:92](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L92)

#### Returns

`StateRequest`

***

### isRequestEmpty()

> **isRequestEmpty**(): `boolean`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:63](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L63)

#### Returns

`boolean`

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

> **parse**(`line`): `any`

Defined in: [src/runtimes/wasmito\_vm/requests/inspect\_request.ts:149](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/inspect_request.ts#L149)

#### Parameters

##### line

`any`

#### Returns

`any`

#### Overrides

[`APIRequestNoSubscription`](APIRequestNoSubscription.md).[`parse`](APIRequestNoSubscription.md#parse)
