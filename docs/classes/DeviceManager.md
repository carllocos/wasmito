[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / DeviceManager

# Class: DeviceManager

Defined in: [src/device/device\_manager.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/device_manager.ts#L28)

## Constructors

### Constructor

> **new DeviceManager**(): `DeviceManager`

Defined in: [src/device/device\_manager.ts:33](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/device_manager.ts#L33)

#### Returns

`DeviceManager`

## Properties

### localprocesses

> **localprocesses**: \[[`WasmitoDevVM`](WasmitoDevVM.md), `ChildProcess`?\][]

Defined in: [src/device/device\_manager.ts:30](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/device_manager.ts#L30)

***

### logger

> **logger**: `Logger`

Defined in: [src/device/device\_manager.ts:29](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/device_manager.ts#L29)

## Methods

### closeVM()

> **closeVM**(`vm`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/device/device\_manager.ts:179](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/device_manager.ts#L179)

#### Parameters

##### vm

[`WasmitoBackendVM`](WasmitoBackendVM.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### connectToExistingDevVM()

> **connectToExistingDevVM**(`languageAdaptor`, `platform`, `maxWaitTime`): `Promise`\<[`WasmitoDevVM`](WasmitoDevVM.md)\>

Defined in: [src/device/device\_manager.ts:49](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/device_manager.ts#L49)

#### Parameters

##### languageAdaptor

[`LanguageAdaptor`](LanguageAdaptor.md)

##### platform

[`DevVMPlatform`](DevVMPlatform.md)

##### maxWaitTime

`number`

#### Returns

`Promise`\<[`WasmitoDevVM`](WasmitoDevVM.md)\>

***

### connectToExistingMCUVM()

> **connectToExistingMCUVM**(`languageAdaptor`, `platform`): `Promise`\<[`MCUWasmitoVM`](MCUWasmitoVM.md)\>

Defined in: [src/device/device\_manager.ts:145](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/device_manager.ts#L145)

#### Parameters

##### languageAdaptor

[`LanguageAdaptor`](LanguageAdaptor.md)

##### platform

[`ArduinoBoardBuilder`](ArduinoBoardBuilder.md)

#### Returns

`Promise`\<[`MCUWasmitoVM`](MCUWasmitoVM.md)\>

***

### createOutOfThingsMonitor()

> **createOutOfThingsMonitor**(`targetVM`): [`OutOfThingsMonitor`](OutOfThingsMonitor.md)

Defined in: [src/device/device\_manager.ts:112](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/device_manager.ts#L112)

#### Parameters

##### targetVM

[`WasmitoBackendVM`](WasmitoBackendVM.md)

#### Returns

[`OutOfThingsMonitor`](OutOfThingsMonitor.md)

***

### setupAlreadySpawnedVMForOutOfPlaceVM()

> **setupAlreadySpawnedVMForOutOfPlaceVM**(`toolPort`, `targetVM`, `serverPortForProxyCalls?`, `maxWaitTime?`, `buildOutputDir?`): `Promise`\<[`OutOfPlaceVM`](OutOfPlaceVM.md)\>

Defined in: [src/device/device\_manager.ts:122](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/device_manager.ts#L122)

#### Parameters

##### toolPort

`number`

##### targetVM

[`WasmitoBackendVM`](WasmitoBackendVM.md)

##### serverPortForProxyCalls?

`number`

##### maxWaitTime?

`number`

##### buildOutputDir?

`string`

#### Returns

`Promise`\<[`OutOfPlaceVM`](OutOfPlaceVM.md)\>

***

### spawnDevelopmentVM()

> **spawnDevelopmentVM**(`langAdaptor`, `platform?`, `maxWaitTime?`): `Promise`\<[`WasmitoDevVM`](WasmitoDevVM.md)\>

Defined in: [src/device/device\_manager.ts:74](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/device_manager.ts#L74)

#### Parameters

##### langAdaptor

[`LanguageAdaptor`](LanguageAdaptor.md)

##### platform?

[`DevVMPlatform`](DevVMPlatform.md)

##### maxWaitTime?

`number`

#### Returns

`Promise`\<[`WasmitoDevVM`](WasmitoDevVM.md)\>

***

### spawnHardwareVM()

> **spawnHardwareVM**(`languageAdaptor`, `platform`): `Promise`\<[`MCUWasmitoVM`](MCUWasmitoVM.md)\>

Defined in: [src/device/device\_manager.ts:163](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/device_manager.ts#L163)

#### Parameters

##### languageAdaptor

[`LanguageAdaptor`](LanguageAdaptor.md)

##### platform

[`ArduinoBoardBuilder`](ArduinoBoardBuilder.md)

#### Returns

`Promise`\<[`MCUWasmitoVM`](MCUWasmitoVM.md)\>

***

### spawnOutOfPlaceVM()

> **spawnOutOfPlaceVM**(`targetVM`, `targetInputMode`, `maxWaitTime?`, `buildOutputDir?`): `Promise`\<[`OutOfPlaceVM`](OutOfPlaceVM.md)\>

Defined in: [src/device/device\_manager.ts:91](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/device_manager.ts#L91)

#### Parameters

##### targetVM

[`WasmitoBackendVM`](WasmitoBackendVM.md)

##### targetInputMode

[`InputMode`](../enumerations/InputMode.md)

##### maxWaitTime?

`number`

##### buildOutputDir?

`string`

#### Returns

`Promise`\<[`OutOfPlaceVM`](OutOfPlaceVM.md)\>

***

### subscribeOnNewDevice()

> **subscribeOnNewDevice**(`cb`): `void`

Defined in: [src/device/device\_manager.ts:39](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/device_manager.ts#L39)

#### Parameters

##### cb

(`dev`) => `void`

#### Returns

`void`
