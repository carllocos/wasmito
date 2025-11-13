[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / EmptyValueSubstitution

# Class: EmptyValueSubstitution

Defined in: [src/hooks/hook\_value\_substitution.ts:30](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_value_substitution.ts#L30)

## Extends

- [`ValueSubstitution`](ValueSubstitution.md)

## Constructors

### Constructor

> **new EmptyValueSubstitution**(): `EmptyValueSubstitution`

Defined in: [src/hooks/hook\_value\_substitution.ts:31](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_value_substitution.ts#L31)

#### Returns

`EmptyValueSubstitution`

#### Overrides

[`ValueSubstitution`](ValueSubstitution.md).[`constructor`](ValueSubstitution.md#constructor)

## Properties

### kind

> `readonly` **kind**: [`HookKind`](../enumerations/HookKind.md)

Defined in: [src/hooks/hook.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L27)

#### Inherited from

[`ValueSubstitution`](ValueSubstitution.md).[`kind`](ValueSubstitution.md#kind)

***

### schedule

> **schedule**: [`HookSchedule`](HookSchedule.md)

Defined in: [src/hooks/hook.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L28)

#### Inherited from

[`ValueSubstitution`](ValueSubstitution.md).[`schedule`](ValueSubstitution.md#schedule)

***

### value?

> `readonly` `optional` **value**: [`Value`](../wasmito/namespaces/WASM/interfaces/Value.md)

Defined in: [src/hooks/hook\_value\_substitution.ts:5](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_value_substitution.ts#L5)

#### Inherited from

[`ValueSubstitution`](ValueSubstitution.md).[`value`](ValueSubstitution.md#value)

## Methods

### description()

> **description**(): `string`

Defined in: [src/hooks/hook\_value\_substitution.ts:25](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_value_substitution.ts#L25)

#### Returns

`string`

#### Inherited from

[`ValueSubstitution`](ValueSubstitution.md).[`description`](ValueSubstitution.md#description)

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

[`ValueSubstitution`](ValueSubstitution.md).[`scheduleFor`](ValueSubstitution.md#schedulefor)

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

[`ValueSubstitution`](ValueSubstitution.md).[`scheduleOnce`](ValueSubstitution.md#scheduleonce)

***

### serializeBinary()

> **serializeBinary**(): `string`

Defined in: [src/hooks/hook\_value\_substitution.ts:11](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_value_substitution.ts#L11)

#### Returns

`string`

#### Inherited from

[`ValueSubstitution`](ValueSubstitution.md).[`serializeBinary`](ValueSubstitution.md#serializebinary)
