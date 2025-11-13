[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / HookWithoutSubscription

# Abstract Class: HookWithoutSubscription

Defined in: [src/hooks/hook.ts:52](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L52)

## Extends

- [`Hook`](Hook.md)

## Extended by

- [`RemoteCallHook`](RemoteCallHook.md)
- [`ChangeRunningStateHook`](ChangeRunningStateHook.md)
- [`ValueSubstitution`](ValueSubstitution.md)

## Constructors

### Constructor

> **new HookWithoutSubscription**(`kind`): `HookWithoutSubscription`

Defined in: [src/hooks/hook.ts:29](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L29)

#### Parameters

##### kind

[`HookKind`](../enumerations/HookKind.md)

#### Returns

`HookWithoutSubscription`

#### Inherited from

[`Hook`](Hook.md).[`constructor`](Hook.md#constructor)

## Properties

### kind

> `readonly` **kind**: [`HookKind`](../enumerations/HookKind.md)

Defined in: [src/hooks/hook.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L27)

#### Inherited from

[`Hook`](Hook.md).[`kind`](Hook.md#kind)

***

### schedule

> **schedule**: [`HookSchedule`](HookSchedule.md)

Defined in: [src/hooks/hook.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L28)

#### Inherited from

[`Hook`](Hook.md).[`schedule`](Hook.md#schedule)

## Methods

### description()

> `abstract` **description**(): `string`

Defined in: [src/hooks/hook.ts:48](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L48)

#### Returns

`string`

#### Inherited from

[`Hook`](Hook.md).[`description`](Hook.md#description)

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

[`Hook`](Hook.md).[`scheduleFor`](Hook.md#schedulefor)

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

[`Hook`](Hook.md).[`scheduleOnce`](Hook.md#scheduleonce)

***

### serializeBinary()

> `abstract` **serializeBinary**(): `string`

Defined in: [src/hooks/hook.ts:49](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L49)

#### Returns

`string`

#### Inherited from

[`Hook`](Hook.md).[`serializeBinary`](Hook.md#serializebinary)
