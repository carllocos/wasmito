[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / SystemDeployer

# Class: SystemDeployer

Defined in: [wasmito\_tester/system\_deployer.ts:25](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_deployer.ts#L25)

## Constructors

### Constructor

> **new SystemDeployer**(`setup`): `SystemDeployer`

Defined in: [wasmito\_tester/system\_deployer.ts:37](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_deployer.ts#L37)

#### Parameters

##### setup

[`DevicesLab`](../interfaces/DevicesLab.md)

#### Returns

`SystemDeployer`

## Properties

### MAX\_WAIT\_TIME\_DevVM\_SPAWN

> **MAX\_WAIT\_TIME\_DevVM\_SPAWN**: `number`

Defined in: [wasmito\_tester/system\_deployer.ts:34](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_deployer.ts#L34)

## Accessors

### logger

#### Get Signature

> **get** **logger**(): `Logger`

Defined in: [wasmito\_tester/system\_deployer.ts:56](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_deployer.ts#L56)

##### Returns

`Logger`

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [wasmito\_tester/system\_deployer.ts:82](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_deployer.ts#L82)

#### Returns

`Promise`\<`void`\>

***

### deployOnDevice()

> **deployOnDevice**(`scenario`, `deviceID`): `Promise`\<`void`\>

Defined in: [wasmito\_tester/system\_deployer.ts:91](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_deployer.ts#L91)

#### Parameters

##### scenario

[`TestScenario`](../interfaces/TestScenario.md)

##### deviceID

`string`

#### Returns

`Promise`\<`void`\>

***

### device()

> **device**(`id`): [`DeviceSetup`](../interfaces/DeviceSetup.md) \| `undefined`

Defined in: [wasmito\_tester/system\_deployer.ts:64](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_deployer.ts#L64)

#### Parameters

##### id

`string`

#### Returns

[`DeviceSetup`](../interfaces/DeviceSetup.md) \| `undefined`

***

### devices()

> **devices**(): [`DeviceSetup`](../interfaces/DeviceSetup.md)[]

Defined in: [wasmito\_tester/system\_deployer.ts:60](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_deployer.ts#L60)

#### Returns

[`DeviceSetup`](../interfaces/DeviceSetup.md)[]

***

### deviceVM()

> **deviceVM**(`id`): [`WasmitoBackendVM`](WasmitoBackendVM.md)

Defined in: [wasmito\_tester/system\_deployer.ts:74](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_deployer.ts#L74)

#### Parameters

##### id

`string`

#### Returns

[`WasmitoBackendVM`](WasmitoBackendVM.md)

***

### hasVMDevice()

> **hasVMDevice**(`id`): `boolean`

Defined in: [wasmito\_tester/system\_deployer.ts:70](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_deployer.ts#L70)

#### Parameters

##### id

`string`

#### Returns

`boolean`
