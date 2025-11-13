[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / PlatformConfig

# Class: PlatformConfig

Defined in: [src/platforms/platform\_config.ts:69](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform_config.ts#L69)

## Constructors

### Constructor

> **new PlatformConfig**(`target`, `deviceIdentity`, `vmConfig`): `PlatformConfig`

Defined in: [src/platforms/platform\_config.ts:74](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform_config.ts#L74)

#### Parameters

##### target

[`PlatformTarget`](../enumerations/PlatformTarget.md)

##### deviceIdentity

[`DeviceIdentity`](DeviceIdentity.md)

##### vmConfig

[`VMConfiguration`](VMConfiguration.md)

#### Returns

`PlatformConfig`

## Properties

### deviceIdentity

> `readonly` **deviceIdentity**: [`DeviceIdentity`](DeviceIdentity.md)

Defined in: [src/platforms/platform\_config.ts:72](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform_config.ts#L72)

***

### target

> `readonly` **target**: [`PlatformTarget`](../enumerations/PlatformTarget.md)

Defined in: [src/platforms/platform\_config.ts:70](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform_config.ts#L70)

***

### vmConfig

> `readonly` **vmConfig**: [`VMConfiguration`](VMConfiguration.md)

Defined in: [src/platforms/platform\_config.ts:71](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform_config.ts#L71)

## Methods

### configuredForNetwork()

> **configuredForNetwork**(): `boolean`

Defined in: [src/platforms/platform\_config.ts:96](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform_config.ts#L96)

#### Returns

`boolean`

***

### configuredForSerial()

> **configuredForSerial**(): `boolean`

Defined in: [src/platforms/platform\_config.ts:88](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform_config.ts#L88)

#### Returns

`boolean`

***

### fromConfigArgs()

> `static` **fromConfigArgs**(`target`, `vmConfigArgs?`, `deviceIdentityArgs?`): `Promise`\<`PlatformConfig`\>

Defined in: [src/platforms/platform\_config.ts:104](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/platforms/platform_config.ts#L104)

#### Parameters

##### target

[`PlatformTarget`](../enumerations/PlatformTarget.md)

##### vmConfigArgs?

[`VMConfigArgs`](../interfaces/VMConfigArgs.md)

##### deviceIdentityArgs?

[`DeviceIdentityArgs`](../interfaces/DeviceIdentityArgs.md)

#### Returns

`Promise`\<`PlatformConfig`\>
