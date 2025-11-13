[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / ClientSideSocket

# Class: ClientSideSocket

Defined in: [src/communication/client\_socket.ts:13](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/client_socket.ts#L13)

## Extends

- `AbstractChannel`

## Constructors

### Constructor

> **new ClientSideSocket**(`port`, `host`, `loggerName`): `ClientSideSocket`

Defined in: [src/communication/client\_socket.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/client_socket.ts#L17)

#### Parameters

##### port

`number`

##### host

`string`

##### loggerName

`string` = `''`

#### Returns

`ClientSideSocket`

#### Overrides

`AbstractChannel.constructor`

## Properties

### channelName

> `readonly` **channelName**: `string`

Defined in: [src/communication/abstract\_channel.ts:6](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/abstract_channel.ts#L6)

#### Inherited from

`AbstractChannel.channelName`

***

### connection?

> `protected` `optional` **connection**: `Socket`

Defined in: [src/communication/abstract\_channel.ts:7](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/abstract_channel.ts#L7)

#### Inherited from

`AbstractChannel.connection`

***

### logger

> `protected` **logger**: `Logger`

Defined in: [src/communication/abstract\_channel.ts:11](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/abstract_channel.ts#L11)

#### Inherited from

`AbstractChannel.logger`

## Methods

### addOnData()

> **addOnData**(`callback`): `void`

Defined in: [src/communication/abstract\_channel.ts:32](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/abstract_channel.ts#L32)

#### Parameters

##### callback

(`data`) => `void`

#### Returns

`void`

#### Inherited from

`AbstractChannel.addOnData`

***

### close()

> **close**(`timeout?`): `Promise`\<`boolean`\>

Defined in: [src/communication/client\_socket.ts:35](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/client_socket.ts#L35)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Overrides

`AbstractChannel.close`

***

### createConnection()

> **createConnection**(): `Promise`\<`Socket` \| `undefined`\>

Defined in: [src/communication/client\_socket.ts:98](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/client_socket.ts#L98)

#### Returns

`Promise`\<`Socket` \| `undefined`\>

***

### onDataHandler()

> `protected` **onDataHandler**(`data`): `void`

Defined in: [src/communication/abstract\_channel.ts:40](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/abstract_channel.ts#L40)

#### Parameters

##### data

`Buffer`

#### Returns

`void`

#### Inherited from

`AbstractChannel.onDataHandler`

***

### open()

> **open**(`timeout?`): `Promise`\<`boolean`\>

Defined in: [src/communication/client\_socket.ts:54](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/client_socket.ts#L54)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Overrides

`AbstractChannel.open`

***

### removeOnData()

> **removeOnData**(`callback`): `void`

Defined in: [src/communication/abstract\_channel.ts:36](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/abstract_channel.ts#L36)

#### Parameters

##### callback

(`data`) => `void`

#### Returns

`void`

#### Inherited from

`AbstractChannel.removeOnData`

***

### send()

> **send**(`data`): `Promise`\<`boolean`\>

Defined in: [src/communication/client\_socket.ts:44](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/client_socket.ts#L44)

#### Parameters

##### data

`string`

#### Returns

`Promise`\<`boolean`\>

#### Overrides

`AbstractChannel.send`

***

### write()

> **write**(`data`, `cb?`): `boolean`

Defined in: [src/communication/client\_socket.ts:23](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/client_socket.ts#L23)

#### Parameters

##### data

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### cb?

(`err?`) => `void`

#### Returns

`boolean`

#### Overrides

`AbstractChannel.write`
