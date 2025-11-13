[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / SerialConnection

# Class: SerialConnection

Defined in: [src/communication/serial.ts:16](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/serial.ts#L16)

## Implements

- [`Channel`](../interfaces/Channel.md)

## Constructors

### Constructor

> **new SerialConnection**(`portName`, `baudRate`, `loggerName`): `SerialConnection`

Defined in: [src/communication/serial.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/serial.ts#L27)

#### Parameters

##### portName

`string`

##### baudRate

`number`

##### loggerName

`string` = `''`

#### Returns

`SerialConnection`

## Properties

### channelName

> `readonly` **channelName**: `string`

Defined in: [src/communication/serial.ts:25](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/serial.ts#L25)

#### Implementation of

[`Channel`](../interfaces/Channel.md).[`channelName`](../interfaces/Channel.md#channelname)

## Methods

### addOnData()

> **addOnData**(`callback`): `void`

Defined in: [src/communication/serial.ts:42](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/serial.ts#L42)

#### Parameters

##### callback

(`data`) => `void`

#### Returns

`void`

#### Implementation of

[`Channel`](../interfaces/Channel.md).[`addOnData`](../interfaces/Channel.md#addondata)

***

### close()

> **close**(`timedout?`): `Promise`\<`boolean`\>

Defined in: [src/communication/serial.ts:140](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/serial.ts#L140)

#### Parameters

##### timedout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`Channel`](../interfaces/Channel.md).[`close`](../interfaces/Channel.md#close)

***

### onDataHandler()

> `protected` **onDataHandler**(`data`): `void`

Defined in: [src/communication/serial.ts:50](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/serial.ts#L50)

#### Parameters

##### data

`Buffer`

#### Returns

`void`

***

### open()

> **open**(`timeout?`): `Promise`\<`boolean`\>

Defined in: [src/communication/serial.ts:104](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/serial.ts#L104)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`Channel`](../interfaces/Channel.md).[`open`](../interfaces/Channel.md#open)

***

### removeOnData()

> **removeOnData**(`callback`): `void`

Defined in: [src/communication/serial.ts:46](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/serial.ts#L46)

#### Parameters

##### callback

(`data`) => `void`

#### Returns

`void`

#### Implementation of

[`Channel`](../interfaces/Channel.md).[`removeOnData`](../interfaces/Channel.md#removeondata)

***

### send()

> **send**(`data`): `Promise`\<`boolean`\>

Defined in: [src/communication/serial.ts:86](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/serial.ts#L86)

#### Parameters

##### data

`string`

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`Channel`](../interfaces/Channel.md).[`send`](../interfaces/Channel.md#send)

***

### write()

> **write**(`data`, `cb?`): `boolean`

Defined in: [src/communication/serial.ts:35](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/serial.ts#L35)

#### Parameters

##### data

`any`

##### cb?

(`err?`) => `void`

#### Returns

`boolean`

#### Implementation of

[`Channel`](../interfaces/Channel.md).[`write`](../interfaces/Channel.md#write)
