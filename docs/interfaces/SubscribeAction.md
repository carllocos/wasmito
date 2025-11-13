[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / SubscribeAction

# Interface: SubscribeAction\<ResultType, _Hook\>

Defined in: [wasmito\_tester/shared\_interfaces.ts:52](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L52)

## Type Parameters

### ResultType

`ResultType`

### _Hook

`_Hook` *extends* [`HookWithSubscription`](../classes/HookWithSubscription.md)\<`ResultType`\>

## Properties

### checkSubscription()

> **checkSubscription**: (`v`) => `Promise`\<`boolean`\>

Defined in: [wasmito\_tester/shared\_interfaces.ts:59](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L59)

#### Parameters

##### v

`ResultType`

#### Returns

`Promise`\<`boolean`\>

***

### description

> **description**: `string`

Defined in: [wasmito\_tester/shared\_interfaces.ts:56](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L56)

***

### ifFail?

> `optional` **ifFail**: `FailureHandler`\<`ResultType`\>

Defined in: [wasmito\_tester/shared\_interfaces.ts:60](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L60)

***

### subscribeToID

> **subscribeToID**: `string`

Defined in: [wasmito\_tester/shared\_interfaces.ts:58](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L58)

***

### timeout?

> `optional` **timeout**: `number`

Defined in: [wasmito\_tester/shared\_interfaces.ts:57](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L57)
