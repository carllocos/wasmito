[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / Breakpoint

# Class: Breakpoint

Defined in: [src/debugger/breakpoint.ts:16](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L16)

## Implements

- `ISubscription`\<[`WasmState`](WasmState.md)\>

## Constructors

### Constructor

> **new Breakpoint**(`sourceCodeLocation`, `stateOnBreakpoint?`): `Breakpoint`

Defined in: [src/debugger/breakpoint.ts:26](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L26)

#### Parameters

##### sourceCodeLocation

[`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)

##### stateOnBreakpoint?

[`StateRequest`](StateRequest.md)

#### Returns

`Breakpoint`

## Properties

### fanOutToListeners()

> `protected` `readonly` **fanOutToListeners**: (`state`) => `void`

Defined in: [src/debugger/breakpoint.ts:23](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L23)

#### Parameters

##### state

[`WasmState`](WasmState.md)

#### Returns

`void`

***

### logger

> `protected` **logger**: `Logger`

Defined in: [src/debugger/breakpoint.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L17)

***

### sourceCodeLocation

> `readonly` **sourceCodeLocation**: [`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)

Defined in: [src/debugger/breakpoint.ts:19](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L19)

## Accessors

### hooks

#### Get Signature

> **get** **hooks**(): [`Hook`](Hook.md)[]

Defined in: [src/debugger/breakpoint.ts:102](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L102)

##### Returns

[`Hook`](Hook.md)[]

#### Set Signature

> **set** **hooks**(`newHooks`): `void`

Defined in: [src/debugger/breakpoint.ts:106](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L106)

##### Parameters

###### newHooks

[`Hook`](Hook.md)[]

##### Returns

`void`

***

### wasmAddress

#### Get Signature

> **get** **wasmAddress**(): `number`

Defined in: [src/debugger/breakpoint.ts:40](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L40)

##### Returns

`number`

## Methods

### clearSubscriptions()

> **clearSubscriptions**(): `void`

Defined in: [src/debugger/breakpoint.ts:97](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L97)

#### Returns

`void`

#### Implementation of

`ISubscription.clearSubscriptions`

***

### createRequests()

> **createRequests**(): [`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md)[]

Defined in: [src/debugger/breakpoint.ts:126](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L126)

#### Returns

[`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md)[]

***

### equals()

> **equals**(`other`): `boolean`

Defined in: [src/debugger/breakpoint.ts:116](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L116)

#### Parameters

##### other

`Breakpoint`

#### Returns

`boolean`

***

### onSubscriptionData()

> **onSubscriptionData**(`value`): `void`

Defined in: [src/debugger/breakpoint.ts:82](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L82)

#### Parameters

##### value

[`WasmState`](WasmState.md)

#### Returns

`void`

#### Implementation of

`ISubscription.onSubscriptionData`

***

### parseSubscriptionData()

> **parseSubscriptionData**(`_input`): [`WasmState`](WasmState.md)

Defined in: [src/debugger/breakpoint.ts:64](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L64)

#### Parameters

##### \_input

`any`

#### Returns

[`WasmState`](WasmState.md)

#### Implementation of

`ISubscription.parseSubscriptionData`

***

### subscribe()

> **subscribe**(`callback`): `void`

Defined in: [src/debugger/breakpoint.ts:68](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L68)

#### Parameters

##### callback

(`data`) => `void`

#### Returns

`void`

#### Implementation of

`ISubscription.subscribe`

***

### toString()

> **toString**(): `string`

Defined in: [src/debugger/breakpoint.ts:122](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L122)

Returns a string representation of an object.

#### Returns

`string`

***

### unSubscribe()

> **unSubscribe**(`callback`): `void`

Defined in: [src/debugger/breakpoint.ts:78](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint.ts#L78)

#### Parameters

##### callback

(`data`) => `void`

#### Returns

`void`

#### Implementation of

`ISubscription.unSubscribe`
