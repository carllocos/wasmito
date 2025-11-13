[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / VMConfiguration

# Class: VMConfiguration

Defined in: [src/device/vm\_config.ts:47](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L47)

## Constructors

### Constructor

> **new VMConfiguration**(`args`): `VMConfiguration`

Defined in: [src/device/vm\_config.ts:73](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L73)

#### Parameters

##### args

[`VMConfigArgs`](../interfaces/VMConfigArgs.md)

#### Returns

`VMConfiguration`

## Accessors

### baudrate

#### Get Signature

> **get** **baudrate**(): `number`

Defined in: [src/device/vm\_config.ts:182](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L182)

##### Returns

`number`

***

### disableStrictModuleLoad

#### Get Signature

> **get** **disableStrictModuleLoad**(): `boolean`

Defined in: [src/device/vm\_config.ts:198](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L198)

##### Returns

`boolean`

***

### fqbn

#### Get Signature

> **get** **fqbn**(): [`BoardFQBN`](../interfaces/BoardFQBN.md)

Defined in: [src/device/vm\_config.ts:191](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L191)

##### Returns

[`BoardFQBN`](../interfaces/BoardFQBN.md)

***

### mockHostIP

#### Get Signature

> **get** **mockHostIP**(): `string`

Defined in: [src/device/vm\_config.ts:137](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L137)

##### Returns

`string`

***

### mockPort

#### Get Signature

> **get** **mockPort**(): `number`

Defined in: [src/device/vm\_config.ts:146](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L146)

##### Returns

`number`

***

### pauseOnStart

#### Get Signature

> **get** **pauseOnStart**(): `boolean`

Defined in: [src/device/vm\_config.ts:128](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L128)

##### Returns

`boolean`

***

### program

#### Get Signature

> **get** **program**(): `string`

Defined in: [src/device/vm\_config.ts:95](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L95)

##### Returns

`string`

#### Set Signature

> **set** **program**(`newProgram`): `void`

Defined in: [src/device/vm\_config.ts:102](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L102)

##### Parameters

###### newProgram

`string`

##### Returns

`void`

***

### proxyHostIP

#### Get Signature

> **get** **proxyHostIP**(): `string`

Defined in: [src/device/vm\_config.ts:155](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L155)

##### Returns

`string`

***

### proxyPort

#### Get Signature

> **get** **proxyPort**(): `number`

Defined in: [src/device/vm\_config.ts:164](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L164)

##### Returns

`number`

***

### serialPort

#### Get Signature

> **get** **serialPort**(): `string`

Defined in: [src/device/vm\_config.ts:173](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L173)

##### Returns

`string`

***

### toolHostIP

#### Get Signature

> **get** **toolHostIP**(): `string`

Defined in: [src/device/vm\_config.ts:119](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L119)

##### Returns

`string`

***

### toolPort

#### Get Signature

> **get** **toolPort**(): `number`

Defined in: [src/device/vm\_config.ts:106](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L106)

##### Returns

`number`

#### Set Signature

> **set** **toolPort**(`newPort`): `void`

Defined in: [src/device/vm\_config.ts:115](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L115)

##### Parameters

###### newPort

`number`

##### Returns

`void`

## Methods

### hasBaudRate()

> **hasBaudRate**(): `boolean`

Defined in: [src/device/vm\_config.ts:214](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L214)

#### Returns

`boolean`

***

### hasSerialPort()

> **hasSerialPort**(): `boolean`

Defined in: [src/device/vm\_config.ts:202](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L202)

#### Returns

`boolean`

***

### hasToolHostIPAddr()

> **hasToolHostIPAddr**(): `boolean`

Defined in: [src/device/vm\_config.ts:210](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L210)

#### Returns

`boolean`

***

### hasToolPort()

> **hasToolPort**(): `boolean`

Defined in: [src/device/vm\_config.ts:206](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L206)

#### Returns

`boolean`

***

### hasWasmPath()

> **hasWasmPath**(): `boolean`

Defined in: [src/device/vm\_config.ts:218](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L218)

#### Returns

`boolean`

***

### fromArgs()

> `static` **fromArgs**(`args`): `Promise`\<`VMConfiguration`\>

Defined in: [src/device/vm\_config.ts:222](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/device/vm_config.ts#L222)

#### Parameters

##### args

`any`

#### Returns

`Promise`\<`VMConfiguration`\>
