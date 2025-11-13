[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / HookWithSubscription

# Abstract Class: HookWithSubscription\<SubscriptionType\>

Defined in: [src/hooks/hook.ts:54](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L54)

## Extends

- [`Hook`](Hook.md)

## Extended by

- [`InspectStateHook`](InspectStateHook.md)

## Type Parameters

### SubscriptionType

`SubscriptionType`

## Implements

- [`SubscriptionHook`](../type-aliases/SubscriptionHook.md)\<`SubscriptionType`\>

## Constructors

### Constructor

> **new HookWithSubscription**\<`SubscriptionType`\>(`kind`, `logger?`): `HookWithSubscription`\<`SubscriptionType`\>

Defined in: [src/hooks/hook.ts:61](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L61)

#### Parameters

##### kind

[`HookKind`](../enumerations/HookKind.md)

##### logger?

`Logger`

#### Returns

`HookWithSubscription`\<`SubscriptionType`\>

#### Overrides

[`Hook`](Hook.md).[`constructor`](Hook.md#constructor)

## Properties

### kind

> `readonly` **kind**: [`HookKind`](../enumerations/HookKind.md)

Defined in: [src/hooks/hook.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L27)

#### Inherited from

[`Hook`](Hook.md).[`kind`](Hook.md#kind)

***

### logger

> `protected` **logger**: `Logger`

Defined in: [src/hooks/hook.ts:59](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L59)

***

### schedule

> **schedule**: [`HookSchedule`](HookSchedule.md)

Defined in: [src/hooks/hook.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L28)

#### Inherited from

[`Hook`](Hook.md).[`schedule`](Hook.md#schedule)

## Methods

### clearSubscriptions()

> **clearSubscriptions**(): `void`

Defined in: [src/hooks/hook.ts:85](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L85)

#### Returns

`void`

#### Implementation of

`SubscriptionHook.clearSubscriptions`

***

### description()

> `abstract` **description**(): `string`

Defined in: [src/hooks/hook.ts:48](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L48)

#### Returns

`string`

#### Inherited from

[`Hook`](Hook.md).[`description`](Hook.md#description)

***

### onSubscriptionData()

> **onSubscriptionData**(`value`): `void`

Defined in: [src/hooks/hook.ts:81](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L81)

#### Parameters

##### value

`SubscriptionType`

#### Returns

`void`

#### Implementation of

`SubscriptionHook.onSubscriptionData`

***

### parseSubscriptionData()

> `abstract` **parseSubscriptionData**(`input`): `SubscriptionType`

Defined in: [src/hooks/hook.ts:89](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L89)

#### Parameters

##### input

`any`

#### Returns

`SubscriptionType`

#### Implementation of

`SubscriptionHook.parseSubscriptionData`

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

***

### subscribe()

> **subscribe**(`callback`, `oneTimeSubscription`): `void`

Defined in: [src/hooks/hook.ts:70](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L70)

#### Parameters

##### callback

(`data`) => `void`

##### oneTimeSubscription

`boolean` = `false`

#### Returns

`void`

#### Implementation of

`SubscriptionHook.subscribe`

***

### unSubscribe()

> **unSubscribe**(`callback`): `void`

Defined in: [src/hooks/hook.ts:77](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L77)

#### Parameters

##### callback

(`data`) => `void`

#### Returns

`void`

#### Implementation of

`SubscriptionHook.unSubscribe`
