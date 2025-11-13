[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / OutOfThingsMonitor

# Class: OutOfThingsMonitor

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:472](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L472)

## Constructors

### Constructor

> **new OutOfThingsMonitor**(`targetVM`): `OutOfThingsMonitor`

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:484](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L484)

#### Parameters

##### targetVM

[`WasmitoBackendVM`](WasmitoBackendVM.md)

#### Returns

`OutOfThingsMonitor`

## Properties

### targetVM

> `readonly` **targetVM**: [`WasmitoBackendVM`](WasmitoBackendVM.md)

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:474](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L474)

## Accessors

### breakpointPolicy

#### Get Signature

> **get** **breakpointPolicy**(): [`BreakpointPolicy`](BreakpointPolicy.md)

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:499](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L499)

##### Returns

[`BreakpointPolicy`](BreakpointPolicy.md)

***

### snapshots

#### Get Signature

> **get** **snapshots**(): [`WasmState`](WasmState.md)[]

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:503](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L503)

##### Returns

[`WasmState`](WasmState.md)[]

## Methods

### getErrorSnapshots()

> **getErrorSnapshots**(): [`WasmState`](WasmState.md)[]

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:523](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L523)

#### Returns

[`WasmState`](WasmState.md)[]

***

### onSpawn()

> **onSpawn**(`cb`): `void`

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:529](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L529)

#### Parameters

##### cb

(`vm`, `p`) => `void`

#### Returns

`void`

***

### setup()

> **setup**(): `Promise`\<`void`\>

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:507](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L507)

#### Returns

`Promise`\<`void`\>

***

### spawnDevVM()

> **spawnDevVM**(`snapshotIdx`, `config`): `Promise`\<[`OutOfPlaceVM`](OutOfPlaceVM.md)\>

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:547](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L547)

#### Parameters

##### snapshotIdx

`number`

##### config

[`OutOfThingsSpawnConfig`](../interfaces/OutOfThingsSpawnConfig.md)

#### Returns

`Promise`\<[`OutOfPlaceVM`](OutOfPlaceVM.md)\>

***

### subscribeOnSnapshot()

> **subscribeOnSnapshot**(`callback`): `void`

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:533](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L533)

#### Parameters

##### callback

(`snapshot`) => `void`

#### Returns

`void`

***

### unSubscribeOnSnapshot()

> **unSubscribeOnSnapshot**(`callback`): `void`

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:543](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L543)

#### Parameters

##### callback

(`snapshot`) => `void`

#### Returns

`void`
