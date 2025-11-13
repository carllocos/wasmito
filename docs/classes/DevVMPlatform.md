[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / DevVMPlatform

# Class: DevVMPlatform

Defined in: [src/platforms/dev\_vm\_platform.ts:4](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/dev_vm_platform.ts#L4)

## Extends

- [`Platform`](Platform.md)

## Constructors

### Constructor

> **new DevVMPlatform**(`config`, `outputDir`): `DevVMPlatform`

Defined in: [src/platforms/dev\_vm\_platform.ts:5](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/dev_vm_platform.ts#L5)

#### Parameters

##### config

[`PlatformConfig`](PlatformConfig.md)

##### outputDir

`string` = `''`

#### Returns

`DevVMPlatform`

#### Overrides

[`Platform`](Platform.md).[`constructor`](Platform.md#constructor)

## Properties

### config

> `readonly` **config**: [`PlatformConfig`](PlatformConfig.md)

Defined in: [src/platforms/platform.ts:16](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L16)

#### Inherited from

[`Platform`](Platform.md).[`config`](Platform.md#config)

***

### logger

> `protected` `readonly` **logger**: `Logger`

Defined in: [src/platforms/platform.ts:15](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L15)

#### Inherited from

[`Platform`](Platform.md).[`logger`](Platform.md#logger)

***

### outputDirectory

> `protected` `readonly` **outputDirectory**: `string`

Defined in: [src/platforms/platform.ts:19](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L19)

#### Inherited from

[`Platform`](Platform.md).[`outputDirectory`](Platform.md#outputdirectory)

***

### sdkPath

> `protected` `readonly` **sdkPath**: `string`

Defined in: [src/platforms/platform.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L17)

#### Inherited from

[`Platform`](Platform.md).[`sdkPath`](Platform.md#sdkpath)

***

### tmpDirPrefix

> `protected` `readonly` **tmpDirPrefix**: `string`

Defined in: [src/platforms/platform.ts:18](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L18)

#### Inherited from

[`Platform`](Platform.md).[`tmpDirPrefix`](Platform.md#tmpdirprefix)

## Accessors

### compilationOutputPath

#### Get Signature

> **get** **compilationOutputPath**(): `string`

Defined in: [src/platforms/platform.ts:43](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform.ts#L43)

##### Returns

`string`

#### Inherited from

[`Platform`](Platform.md).[`compilationOutputPath`](Platform.md#compilationoutputpath)

## Methods

### buildForPlatform()

> **buildForPlatform**(`_wasmPath`, `_maxWaitTime?`): `Promise`\<`number`\>

Defined in: [src/platforms/dev\_vm\_platform.ts:9](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/dev_vm_platform.ts#L9)

#### Parameters

##### \_wasmPath

`string`

##### \_maxWaitTime?

`number`

#### Returns

`Promise`\<`number`\>

#### Overrides

[`Platform`](Platform.md).[`buildForPlatform`](Platform.md#buildforplatform)

***

### getUploadedWasm()

> **getUploadedWasm**(): `Promise`\<`string` \| `undefined`\>

Defined in: [src/platforms/dev\_vm\_platform.ts:20](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/dev_vm_platform.ts#L20)

#### Returns

`Promise`\<`string` \| `undefined`\>

#### Overrides

[`Platform`](Platform.md).[`getUploadedWasm`](Platform.md#getuploadedwasm)

***

### upload()

> **upload**(): `Promise`\<`number`\>

Defined in: [src/platforms/dev\_vm\_platform.ts:16](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/dev_vm_platform.ts#L16)

#### Returns

`Promise`\<`number`\>

#### Overrides

[`Platform`](Platform.md).[`upload`](Platform.md#upload)
