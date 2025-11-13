[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / Channel

# Interface: Channel

Defined in: [src/communication/channel\_interface.ts:1](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/channel_interface.ts#L1)

## Properties

### addOnData()

> **addOnData**: (`callback`) => `void`

Defined in: [src/communication/channel\_interface.ts:10](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/channel_interface.ts#L10)

#### Parameters

##### callback

(`data`) => `void`

#### Returns

`void`

***

### channelName

> `readonly` **channelName**: `string`

Defined in: [src/communication/channel\_interface.ts:2](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/channel_interface.ts#L2)

***

### close()

> **close**: (`timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/communication/channel\_interface.ts:4](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/channel_interface.ts#L4)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### open()

> **open**: (`timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/communication/channel\_interface.ts:3](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/channel_interface.ts#L3)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### removeOnData()

> **removeOnData**: (`callback`) => `void`

Defined in: [src/communication/channel\_interface.ts:11](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/channel_interface.ts#L11)

#### Parameters

##### callback

(`data`) => `void`

#### Returns

`void`

***

### send()

> **send**: (`data`) => `Promise`\<`boolean`\>

Defined in: [src/communication/channel\_interface.ts:9](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/channel_interface.ts#L9)

#### Parameters

##### data

`string`

#### Returns

`Promise`\<`boolean`\>

***

### write()

> **write**: (`data`, `cb?`) => `boolean`

Defined in: [src/communication/channel\_interface.ts:5](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/communication/channel_interface.ts#L5)

#### Parameters

##### data

`any`

##### cb?

(`err?`) => `void`

#### Returns

`boolean`
