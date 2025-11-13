[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / Action

# Interface: Action\<ResultType\>

Defined in: [wasmito\_tester/shared\_interfaces.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L17)

## Type Parameters

### ResultType

`ResultType`

## Properties

### checkActionSuccess()

> **checkActionSuccess**: (`actionResult`) => `Promise`\<`boolean`\>

Defined in: [wasmito\_tester/shared\_interfaces.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L28)

#### Parameters

##### actionResult

`ResultType`

#### Returns

`Promise`\<`boolean`\>

***

### delay?

> `optional` **delay**: `number`

Defined in: [wasmito\_tester/shared\_interfaces.ts:24](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L24)

***

### description

> **description**: `string`

Defined in: [wasmito\_tester/shared\_interfaces.ts:26](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L26)

***

### doAction()

> **doAction**: (`device`) => `Promise`\<`ResultType`\>

Defined in: [wasmito\_tester/shared\_interfaces.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L27)

#### Parameters

##### device

[`WasmitoBackendVM`](../classes/WasmitoBackendVM.md)

#### Returns

`Promise`\<`ResultType`\>

***

### ifFail?

> `optional` **ifFail**: `FailureHandler`\<`ResultType`\>

Defined in: [wasmito\_tester/shared\_interfaces.ts:19](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L19)

***

### subscribeTo?

> `optional` **subscribeTo**: `string`

Defined in: [wasmito\_tester/shared\_interfaces.ts:30](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L30)

***

### timeout?

> `optional` **timeout**: `number`

Defined in: [wasmito\_tester/shared\_interfaces.ts:18](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/shared_interfaces.ts#L18)
