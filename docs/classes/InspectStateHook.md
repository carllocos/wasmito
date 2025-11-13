[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / InspectStateHook

# Class: InspectStateHook

Defined in: [src/hooks/hook\_inspect\_state.ts:5](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_inspect_state.ts#L5)

## Extends

- [`HookWithSubscription`](HookWithSubscription.md)\<[`WasmState`](WasmState.md)\>

## Constructors

### Constructor

> **new InspectStateHook**(`stateRequest`, `wasmAddress?`): `InspectStateHook`

Defined in: [src/hooks/hook\_inspect\_state.ts:8](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_inspect_state.ts#L8)

#### Parameters

##### stateRequest

[`StateRequest`](StateRequest.md)

##### wasmAddress?

`number`

#### Returns

`InspectStateHook`

#### Overrides

[`HookWithSubscription`](HookWithSubscription.md).[`constructor`](HookWithSubscription.md#constructor)

## Properties

### kind

> `readonly` **kind**: [`HookKind`](../enumerations/HookKind.md)

Defined in: [src/hooks/hook.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L27)

#### Inherited from

[`HookWithSubscription`](HookWithSubscription.md).[`kind`](HookWithSubscription.md#kind)

***

### logger

> `protected` **logger**: `Logger`

Defined in: [src/hooks/hook.ts:59](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L59)

#### Inherited from

[`HookWithSubscription`](HookWithSubscription.md).[`logger`](HookWithSubscription.md#logger)

***

### schedule

> **schedule**: [`HookSchedule`](HookSchedule.md)

Defined in: [src/hooks/hook.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L28)

#### Inherited from

[`HookWithSubscription`](HookWithSubscription.md).[`schedule`](HookWithSubscription.md#schedule)

***

### wasmAddress?

> `readonly` `optional` **wasmAddress**: `number`

Defined in: [src/hooks/hook\_inspect\_state.ts:7](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_inspect_state.ts#L7)

## Accessors

### stateToInspect

#### Get Signature

> **get** **stateToInspect**(): [`StateRequest`](StateRequest.md)

Defined in: [src/hooks/hook\_inspect\_state.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_inspect_state.ts#L17)

##### Returns

[`StateRequest`](StateRequest.md)

## Methods

### clearSubscriptions()

> **clearSubscriptions**(): `void`

Defined in: [src/hooks/hook.ts:85](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L85)

#### Returns

`void`

#### Inherited from

[`HookWithSubscription`](HookWithSubscription.md).[`clearSubscriptions`](HookWithSubscription.md#clearsubscriptions)

***

### description()

> **description**(): `string`

Defined in: [src/hooks/hook\_inspect\_state.ts:25](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_inspect_state.ts#L25)

#### Returns

`string`

#### Overrides

[`HookWithSubscription`](HookWithSubscription.md).[`description`](HookWithSubscription.md#description)

***

### onSubscriptionData()

> **onSubscriptionData**(`value`): `void`

Defined in: [src/hooks/hook.ts:81](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L81)

#### Parameters

##### value

[`WasmState`](WasmState.md)

#### Returns

`void`

#### Inherited from

[`HookWithSubscription`](HookWithSubscription.md).[`onSubscriptionData`](HookWithSubscription.md#onsubscriptiondata)

***

### parseSubscriptionData()

> **parseSubscriptionData**(`input`): [`WasmState`](WasmState.md)

Defined in: [src/hooks/hook\_inspect\_state.ts:29](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_inspect_state.ts#L29)

#### Parameters

##### input

`any`

#### Returns

[`WasmState`](WasmState.md)

#### Overrides

[`HookWithSubscription`](HookWithSubscription.md).[`parseSubscriptionData`](HookWithSubscription.md#parsesubscriptiondata)

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

[`HookWithSubscription`](HookWithSubscription.md).[`scheduleFor`](HookWithSubscription.md#schedulefor)

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

[`HookWithSubscription`](HookWithSubscription.md).[`scheduleOnce`](HookWithSubscription.md#scheduleonce)

***

### serializeBinary()

> **serializeBinary**(): `string`

Defined in: [src/hooks/hook\_inspect\_state.ts:21](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook_inspect_state.ts#L21)

#### Returns

`string`

#### Overrides

[`HookWithSubscription`](HookWithSubscription.md).[`serializeBinary`](HookWithSubscription.md#serializebinary)

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

#### Inherited from

[`HookWithSubscription`](HookWithSubscription.md).[`subscribe`](HookWithSubscription.md#subscribe)

***

### unSubscribe()

> **unSubscribe**(`callback`): `void`

Defined in: [src/hooks/hook.ts:77](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/hook.ts#L77)

#### Parameters

##### callback

(`data`) => `void`

#### Returns

`void`

#### Inherited from

[`HookWithSubscription`](HookWithSubscription.md).[`unSubscribe`](HookWithSubscription.md#unsubscribe)
