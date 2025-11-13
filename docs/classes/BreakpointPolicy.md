[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / BreakpointPolicy

# Abstract Class: BreakpointPolicy

Defined in: [src/debugger/breakpoint\_policies.ts:12](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L12)

## Extended by

- [`BreakpointDefaultPolicy`](BreakpointDefaultPolicy.md)
- [`SingleStopBreakpointPolicy`](SingleStopBreakpointPolicy.md)
- [`RemoveAndProceedBreakpointPolicy`](RemoveAndProceedBreakpointPolicy.md)

## Constructors

### Constructor

> **new BreakpointPolicy**(`vm`): `BreakpointPolicy`

Defined in: [src/debugger/breakpoint\_policies.ts:21](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L21)

#### Parameters

##### vm

[`WasmitoBackendVM`](WasmitoBackendVM.md)

#### Returns

`BreakpointPolicy`

## Properties

### \_breakpoints

> `protected` **\_breakpoints**: [`Breakpoint`](Breakpoint.md)[]

Defined in: [src/debugger/breakpoint\_policies.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L17)

***

### logger

> `abstract` `protected` `readonly` **logger**: `Logger`

Defined in: [src/debugger/breakpoint\_policies.ts:15](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L15)

***

### MAX\_DEFAULT\_TIMEOUT

> `protected` `readonly` **MAX\_DEFAULT\_TIMEOUT**: `number` = `10000`

Defined in: [src/debugger/breakpoint\_policies.ts:14](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L14)

***

### vm

> `protected` `readonly` **vm**: [`WasmitoBackendVM`](WasmitoBackendVM.md)

Defined in: [src/debugger/breakpoint\_policies.ts:13](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L13)

## Accessors

### breakpoints

#### Get Signature

> **get** **breakpoints**(): [`Breakpoint`](Breakpoint.md)[]

Defined in: [src/debugger/breakpoint\_policies.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L28)

##### Returns

[`Breakpoint`](Breakpoint.md)[]

## Methods

### activate()

> **activate**(`_`): `void`

Defined in: [src/debugger/breakpoint\_policies.ts:34](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L34)

#### Parameters

##### \_

[`Breakpoint`](Breakpoint.md)[]

#### Returns

`void`

***

### addBreakpoint()

> **addBreakpoint**(`breakpoint`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/debugger/breakpoint\_policies.ts:38](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L38)

#### Parameters

##### breakpoint

[`Breakpoint`](Breakpoint.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### deactivate()

> **deactivate**(): `void`

Defined in: [src/debugger/breakpoint\_policies.ts:36](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L36)

#### Returns

`void`

***

### hasBreakpoint()

> **hasBreakpoint**(`bp`): `boolean`

Defined in: [src/debugger/breakpoint\_policies.ts:139](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L139)

#### Parameters

##### bp

[`Breakpoint`](Breakpoint.md)

#### Returns

`boolean`

***

### onBreakpointAdd()

> **onBreakpointAdd**(`cb`): `void`

Defined in: [src/debugger/breakpoint\_policies.ts:131](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L131)

#### Parameters

##### cb

(`bp`) => `void`

#### Returns

`void`

***

### onBreakpointRemove()

> **onBreakpointRemove**(`cb`): `void`

Defined in: [src/debugger/breakpoint\_policies.ts:135](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L135)

#### Parameters

##### cb

(`bp`) => `void`

#### Returns

`void`

***

### removeBreakpoint()

> **removeBreakpoint**(`breakpoint`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/debugger/breakpoint\_policies.ts:70](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L70)

#### Parameters

##### breakpoint

[`Breakpoint`](Breakpoint.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### toString()

> `abstract` **toString**(): `string`

Defined in: [src/debugger/breakpoint\_policies.ts:32](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L32)

#### Returns

`string`
