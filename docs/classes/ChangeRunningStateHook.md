[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / ChangeRunningStateHook

# Class: ChangeRunningStateHook

Defined in: [src/hooks/hook\_run\_pause.ts:8](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_run_pause.ts#L8)

## Extends

- [`HookWithoutSubscription`](HookWithoutSubscription.md)

## Extended by

- [`PauseVMHook`](PauseVMHook.md)
- [`RunVMHook`](RunVMHook.md)

## Constructors

### Constructor

> **new ChangeRunningStateHook**(`runState`): `ChangeRunningStateHook`

Defined in: [src/hooks/hook\_run\_pause.ts:10](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_run_pause.ts#L10)

#### Parameters

##### runState

[`WARDuinoRunState`](../enumerations/WARDuinoRunState.md)

#### Returns

`ChangeRunningStateHook`

#### Overrides

[`HookWithoutSubscription`](HookWithoutSubscription.md).[`constructor`](HookWithoutSubscription.md#constructor)

## Properties

### kind

> `readonly` **kind**: [`HookKind`](../enumerations/HookKind.md)

Defined in: [src/hooks/hook.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L27)

#### Inherited from

[`HookWithoutSubscription`](HookWithoutSubscription.md).[`kind`](HookWithoutSubscription.md#kind)

***

### runState

> `readonly` **runState**: [`WARDuinoRunState`](../enumerations/WARDuinoRunState.md)

Defined in: [src/hooks/hook\_run\_pause.ts:9](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_run_pause.ts#L9)

***

### schedule

> **schedule**: [`HookSchedule`](HookSchedule.md)

Defined in: [src/hooks/hook.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L28)

#### Inherited from

[`HookWithoutSubscription`](HookWithoutSubscription.md).[`schedule`](HookWithoutSubscription.md#schedule)

## Methods

### description()

> **description**(): `string`

Defined in: [src/hooks/hook\_run\_pause.ts:20](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_run_pause.ts#L20)

#### Returns

`string`

#### Overrides

[`HookWithoutSubscription`](HookWithoutSubscription.md).[`description`](HookWithoutSubscription.md#description)

***

### scheduleFor()

> **scheduleFor**(`newSchedule`): [`Hook`](Hook.md)

Defined in: [src/hooks/hook.ts:34](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L34)

#### Parameters

##### newSchedule

[`HookSchedule`](HookSchedule.md)

#### Returns

[`Hook`](Hook.md)

#### Inherited from

[`HookWithoutSubscription`](HookWithoutSubscription.md).[`scheduleFor`](HookWithoutSubscription.md#schedulefor)

***

### scheduleOnce()

> **scheduleOnce**(`logicalClock?`): [`Hook`](Hook.md)

Defined in: [src/hooks/hook.ts:39](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L39)

#### Parameters

##### logicalClock?

[`LogicalClock`](../type-aliases/LogicalClock.md)

#### Returns

[`Hook`](Hook.md)

#### Inherited from

[`HookWithoutSubscription`](HookWithoutSubscription.md).[`scheduleOnce`](HookWithoutSubscription.md#scheduleonce)

***

### serializeBinary()

> **serializeBinary**(): `string`

Defined in: [src/hooks/hook\_run\_pause.ts:15](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_run_pause.ts#L15)

#### Returns

`string`

#### Overrides

[`HookWithoutSubscription`](HookWithoutSubscription.md).[`serializeBinary`](HookWithoutSubscription.md#serializebinary)
