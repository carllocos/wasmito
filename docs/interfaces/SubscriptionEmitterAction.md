[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / SubscriptionEmitterAction

# Interface: SubscriptionEmitterAction\<ActionResultType, SubscriptionType, HookType\>

Defined in: [wasmito\_tester/shared\_interfaces.ts:84](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L84)

## Type Parameters

### ActionResultType

`ActionResultType`

### SubscriptionType

`SubscriptionType`

### HookType

`HookType` *extends* [`HookWithSubscription`](../classes/HookWithSubscription.md)\<`SubscriptionType`\>

## Properties

### checkSetupSuccess()

> **checkSetupSuccess**: (`actionResult`) => `Promise`\<`boolean`\>

Defined in: [wasmito\_tester/shared\_interfaces.ts:94](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L94)

#### Parameters

##### actionResult

`ActionResultType`

#### Returns

`Promise`\<`boolean`\>

***

### description

> **description**: `string`

Defined in: [wasmito\_tester/shared\_interfaces.ts:90](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L90)

***

### ifFail?

> `optional` **ifFail**: `FailureHandler`\<`ActionResultType`\>

Defined in: [wasmito\_tester/shared\_interfaces.ts:95](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L95)

***

### setupSubscription()

> **setupSubscription**: (`device`) => `Promise`\<[`SubActReturn`](../type-aliases/SubActReturn.md)\<`ActionResultType`, `SubscriptionType`, `HookType`\>\>

Defined in: [wasmito\_tester/shared\_interfaces.ts:91](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L91)

#### Parameters

##### device

[`WasmitoBackendVM`](../classes/WasmitoBackendVM.md)

#### Returns

`Promise`\<[`SubActReturn`](../type-aliases/SubActReturn.md)\<`ActionResultType`, `SubscriptionType`, `HookType`\>\>

***

### store?

> `optional` **store**: `boolean`

Defined in: [wasmito\_tester/shared\_interfaces.ts:106](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L106)

stores every newly emitted value
uses it on the first subscriber and removes it then.

This is usefull for situations when there is a small
time window between the value gets emitted and the subscriber
registering for such value

***

### subscriptionID

> **subscriptionID**: `string`

Defined in: [wasmito\_tester/shared\_interfaces.ts:89](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L89)

***

### timeout?

> `optional` **timeout**: `number`

Defined in: [wasmito\_tester/shared\_interfaces.ts:96](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L96)
