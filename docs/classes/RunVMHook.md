[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / RunVMHook

# Class: RunVMHook

Defined in: [src/hooks/hook\_run\_pause.ts:35](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_run_pause.ts#L35)

## Extends

- [`ChangeRunningStateHook`](ChangeRunningStateHook.md)

## Constructors

### Constructor

> **new RunVMHook**(): `RunVMHook`

Defined in: [src/hooks/hook\_run\_pause.ts:36](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_run_pause.ts#L36)

#### Returns

`RunVMHook`

#### Overrides

[`ChangeRunningStateHook`](ChangeRunningStateHook.md).[`constructor`](ChangeRunningStateHook.md#constructor)

## Properties

### kind

> `readonly` **kind**: [`HookKind`](../enumerations/HookKind.md)

Defined in: [src/hooks/hook.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L27)

#### Inherited from

[`ChangeRunningStateHook`](ChangeRunningStateHook.md).[`kind`](ChangeRunningStateHook.md#kind)

***

### runState

> `readonly` **runState**: [`WARDuinoRunState`](../enumerations/WARDuinoRunState.md)

Defined in: [src/hooks/hook\_run\_pause.ts:9](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_run_pause.ts#L9)

#### Inherited from

[`ChangeRunningStateHook`](ChangeRunningStateHook.md).[`runState`](ChangeRunningStateHook.md#runstate)

***

### schedule

> **schedule**: [`HookSchedule`](HookSchedule.md)

Defined in: [src/hooks/hook.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L28)

#### Inherited from

[`ChangeRunningStateHook`](ChangeRunningStateHook.md).[`schedule`](ChangeRunningStateHook.md#schedule)

## Methods

### description()

> **description**(): `string`

Defined in: [src/hooks/hook\_run\_pause.ts:20](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_run_pause.ts#L20)

#### Returns

`string`

#### Inherited from

[`ChangeRunningStateHook`](ChangeRunningStateHook.md).[`description`](ChangeRunningStateHook.md#description)

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

[`ChangeRunningStateHook`](ChangeRunningStateHook.md).[`scheduleFor`](ChangeRunningStateHook.md#schedulefor)

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

[`ChangeRunningStateHook`](ChangeRunningStateHook.md).[`scheduleOnce`](ChangeRunningStateHook.md#scheduleonce)

***

### serializeBinary()

> **serializeBinary**(): `string`

Defined in: [src/hooks/hook\_run\_pause.ts:15](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_run_pause.ts#L15)

#### Returns

`string`

#### Inherited from

[`ChangeRunningStateHook`](ChangeRunningStateHook.md).[`serializeBinary`](ChangeRunningStateHook.md#serializebinary)
