[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / Hook

# Abstract Class: Hook

Defined in: [src/hooks/hook.ts:26](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L26)

## Extended by

- [`HookWithoutSubscription`](HookWithoutSubscription.md)
- [`HookWithSubscription`](HookWithSubscription.md)

## Constructors

### Constructor

> **new Hook**(`kind`): `Hook`

Defined in: [src/hooks/hook.ts:29](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L29)

#### Parameters

##### kind

[`HookKind`](../enumerations/HookKind.md)

#### Returns

`Hook`

## Properties

### kind

> `readonly` **kind**: [`HookKind`](../enumerations/HookKind.md)

Defined in: [src/hooks/hook.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L27)

***

### schedule

> **schedule**: [`HookSchedule`](HookSchedule.md)

Defined in: [src/hooks/hook.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L28)

## Methods

### description()

> `abstract` **description**(): `string`

Defined in: [src/hooks/hook.ts:48](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L48)

#### Returns

`string`

***

### scheduleFor()

> **scheduleFor**(`newSchedule`): `Hook`

Defined in: [src/hooks/hook.ts:34](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L34)

#### Parameters

##### newSchedule

[`HookSchedule`](HookSchedule.md)

#### Returns

`Hook`

***

### scheduleOnce()

> **scheduleOnce**(`logicalClock?`): `Hook`

Defined in: [src/hooks/hook.ts:39](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L39)

#### Parameters

##### logicalClock?

[`LogicalClock`](../type-aliases/LogicalClock.md)

#### Returns

`Hook`

***

### serializeBinary()

> `abstract` **serializeBinary**(): `string`

Defined in: [src/hooks/hook.ts:49](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L49)

#### Returns

`string`
