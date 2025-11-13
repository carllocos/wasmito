[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / RemoteCallHook

# Class: RemoteCallHook

Defined in: [src/hooks/hook\_remote\_call.ts:4](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_remote_call.ts#L4)

## Extends

- [`HookWithoutSubscription`](HookWithoutSubscription.md)

## Constructors

### Constructor

> **new RemoteCallHook**(`targetfidx`): `RemoteCallHook`

Defined in: [src/hooks/hook\_remote\_call.ts:6](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_remote_call.ts#L6)

#### Parameters

##### targetfidx

`number`

#### Returns

`RemoteCallHook`

#### Overrides

[`HookWithoutSubscription`](HookWithoutSubscription.md).[`constructor`](HookWithoutSubscription.md#constructor)

## Properties

### kind

> `readonly` **kind**: [`HookKind`](../enumerations/HookKind.md)

Defined in: [src/hooks/hook.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L27)

#### Inherited from

[`HookWithoutSubscription`](HookWithoutSubscription.md).[`kind`](HookWithoutSubscription.md#kind)

***

### schedule

> **schedule**: [`HookSchedule`](HookSchedule.md)

Defined in: [src/hooks/hook.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L28)

#### Inherited from

[`HookWithoutSubscription`](HookWithoutSubscription.md).[`schedule`](HookWithoutSubscription.md#schedule)

***

### targetfidx

> `readonly` **targetfidx**: `number`

Defined in: [src/hooks/hook\_remote\_call.ts:5](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_remote_call.ts#L5)

## Methods

### description()

> **description**(): `string`

Defined in: [src/hooks/hook\_remote\_call.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_remote_call.ts#L17)

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

Defined in: [src/hooks/hook\_remote\_call.ts:11](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_remote_call.ts#L11)

#### Returns

`string`

#### Overrides

[`HookWithoutSubscription`](HookWithoutSubscription.md).[`serializeBinary`](HookWithoutSubscription.md#serializebinary)
