[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / ShareChannel

# Class: ShareChannel

Defined in: [src/communication/share\_channel.ts:15](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/share_channel.ts#L15)

## Implements

- [`Channel`](../interfaces/Channel.md)

## Constructors

### Constructor

> **new ShareChannel**(`channelToShare`, `serverPort?`): `ShareChannel`

Defined in: [src/communication/share\_channel.ts:25](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/share_channel.ts#L25)

#### Parameters

##### channelToShare

[`Channel`](../interfaces/Channel.md)

##### serverPort?

`number`

#### Returns

`ShareChannel`

## Properties

### channelName

> `readonly` **channelName**: `string`

Defined in: [src/communication/share\_channel.ts:23](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/share_channel.ts#L23)

#### Implementation of

[`Channel`](../interfaces/Channel.md).[`channelName`](../interfaces/Channel.md#channelname)

***

### channelToShare

> `readonly` **channelToShare**: [`Channel`](../interfaces/Channel.md)

Defined in: [src/communication/share\_channel.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/share_channel.ts#L17)

## Accessors

### serverPort

#### Get Signature

> **get** **serverPort**(): `number`

Defined in: [src/communication/share\_channel.ts:39](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/share_channel.ts#L39)

##### Returns

`number`

## Methods

### addOnData()

> **addOnData**(`callback`): `void`

Defined in: [src/communication/share\_channel.ts:62](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/share_channel.ts#L62)

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

Defined in: [src/communication/share\_channel.ts:47](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/share_channel.ts#L47)

#### Parameters

##### timedout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`Channel`](../interfaces/Channel.md).[`close`](../interfaces/Channel.md#close)

***

### closeServer()

> **closeServer**(`timeout?`): `Promise`\<`boolean`\>

Defined in: [src/communication/share\_channel.ts:96](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/share_channel.ts#L96)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### open()

> **open**(): `Promise`\<`boolean`\>

Defined in: [src/communication/share\_channel.ts:43](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/share_channel.ts#L43)

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`Channel`](../interfaces/Channel.md).[`open`](../interfaces/Channel.md#open)

***

### removeOnData()

> **removeOnData**(`callback`): `void`

Defined in: [src/communication/share\_channel.ts:66](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/share_channel.ts#L66)

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

Defined in: [src/communication/share\_channel.ts:58](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/share_channel.ts#L58)

#### Parameters

##### data

`string`

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`Channel`](../interfaces/Channel.md).[`send`](../interfaces/Channel.md#send)

***

### startServer()

> **startServer**(): `Promise`\<`boolean`\>

Defined in: [src/communication/share\_channel.ts:70](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/share_channel.ts#L70)

#### Returns

`Promise`\<`boolean`\>

***

### write()

> **write**(`data`, `cb?`): `boolean`

Defined in: [src/communication/share\_channel.ts:51](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/share_channel.ts#L51)

#### Parameters

##### data

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### cb?

(`err?`) => `void`

#### Returns

`boolean`

#### Implementation of

[`Channel`](../interfaces/Channel.md).[`write`](../interfaces/Channel.md#write)
