[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / Platform

# Abstract Class: Platform

Defined in: [src/platforms/platform.ts:14](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L14)

## Extended by

- [`ArduinoBoardBuilder`](ArduinoBoardBuilder.md)
- [`DevVMPlatform`](DevVMPlatform.md)

## Constructors

### Constructor

> **new Platform**(`config`, `outputDir`): `Platform`

Defined in: [src/platforms/platform.ts:21](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L21)

#### Parameters

##### config

[`PlatformConfig`](PlatformConfig.md)

##### outputDir

`string` = `''`

#### Returns

`Platform`

## Properties

### config

> `readonly` **config**: [`PlatformConfig`](PlatformConfig.md)

Defined in: [src/platforms/platform.ts:16](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L16)

***

### logger

> `protected` `readonly` **logger**: `Logger`

Defined in: [src/platforms/platform.ts:15](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L15)

***

### outputDirectory

> `protected` `readonly` **outputDirectory**: `string`

Defined in: [src/platforms/platform.ts:19](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L19)

***

### sdkPath

> `protected` `readonly` **sdkPath**: `string`

Defined in: [src/platforms/platform.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L17)

***

### tmpDirPrefix

> `protected` `readonly` **tmpDirPrefix**: `string`

Defined in: [src/platforms/platform.ts:18](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L18)

## Accessors

### compilationOutputPath

#### Get Signature

> **get** **compilationOutputPath**(): `string`

Defined in: [src/platforms/platform.ts:43](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L43)

##### Returns

`string`

## Methods

### buildForPlatform()

> `abstract` **buildForPlatform**(`wasmPath`, `maxWaitTime?`): `Promise`\<`number`\>

Defined in: [src/platforms/platform.ts:47](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L47)

#### Parameters

##### wasmPath

`string`

##### maxWaitTime?

`number`

#### Returns

`Promise`\<`number`\>

***

### getUploadedWasm()

> `abstract` **getUploadedWasm**(): `Promise`\<`string` \| `undefined`\>

Defined in: [src/platforms/platform.ts:54](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L54)

#### Returns

`Promise`\<`string` \| `undefined`\>

***

### upload()

> `abstract` **upload**(): `Promise`\<`number`\>

Defined in: [src/platforms/platform.ts:52](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L52)

#### Returns

`Promise`\<`number`\>
