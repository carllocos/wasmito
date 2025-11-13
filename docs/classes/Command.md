[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / Command

# Class: Command\<T\>

Defined in: [src/communication/command.ts:5](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/command.ts#L5)

## Type Parameters

### T

`T`

## Constructors

### Constructor

> **new Command**\<`T`\>(`connection`, `request`, `timeout?`): `Command`\<`T`\>

Defined in: [src/communication/command.ts:15](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/command.ts#L15)

#### Parameters

##### connection

[`Channel`](../interfaces/Channel.md)

##### request

[`APIRequest`](APIRequest.md)\<`T`\>

##### timeout?

`number`

#### Returns

`Command`\<`T`\>

## Methods

### execute()

> **execute**(): `Promise`\<`T`\>

Defined in: [src/communication/command.ts:61](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/command.ts#L61)

#### Returns

`Promise`\<`T`\>

***

### timedout()

> **timedout**(): `void`

Defined in: [src/communication/command.ts:46](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/command.ts#L46)

#### Returns

`void`

***

### update()

> **update**(`data`): `void`

Defined in: [src/communication/command.ts:34](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/command.ts#L34)

#### Parameters

##### data

`string`

#### Returns

`void`
