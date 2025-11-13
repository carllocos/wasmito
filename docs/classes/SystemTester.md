[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / SystemTester

# Class: SystemTester

Defined in: [wasmito\_tester/system\_tester.ts:26](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_tester.ts#L26)

## Constructors

### Constructor

> **new SystemTester**(`setup`): `SystemTester`

Defined in: [wasmito\_tester/system\_tester.ts:35](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_tester.ts#L35)

#### Parameters

##### setup

[`DevicesLab`](../interfaces/DevicesLab.md)

#### Returns

`SystemTester`

## Accessors

### logger

#### Get Signature

> **get** **logger**(): `Logger`

Defined in: [wasmito\_tester/system\_tester.ts:42](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_tester.ts#L42)

##### Returns

`Logger`

## Methods

### addTestScenario()

> **addTestScenario**(`scenario`, `targetDeviceID`): `void`

Defined in: [wasmito\_tester/system\_tester.ts:46](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_tester.ts#L46)

#### Parameters

##### scenario

[`TestScenario`](../interfaces/TestScenario.md)

##### targetDeviceID

`string`

#### Returns

`void`

***

### runTests()

> **runTests**(): `Promise`\<[`TestScenarioResult`](../interfaces/TestScenarioResult.md)[]\>

Defined in: [wasmito\_tester/system\_tester.ts:115](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/wasmito_tester/system_tester.ts#L115)

#### Returns

`Promise`\<[`TestScenarioResult`](../interfaces/TestScenarioResult.md)[]\>
