[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / SingleStopBreakpointPolicy

# Class: SingleStopBreakpointPolicy

Defined in: [src/debugger/breakpoint\_policies.ts:178](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L178)

## Extends

- [`BreakpointPolicy`](BreakpointPolicy.md)

## Constructors

### Constructor

> **new SingleStopBreakpointPolicy**(`vm`): `SingleStopBreakpointPolicy`

Defined in: [src/debugger/breakpoint\_policies.ts:183](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L183)

#### Parameters

##### vm

[`WasmitoBackendVM`](WasmitoBackendVM.md)

#### Returns

`SingleStopBreakpointPolicy`

#### Overrides

[`BreakpointPolicy`](BreakpointPolicy.md).[`constructor`](BreakpointPolicy.md#constructor)

## Properties

### \_breakpoints

> `protected` **\_breakpoints**: [`Breakpoint`](Breakpoint.md)[]

Defined in: [src/debugger/breakpoint\_policies.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L17)

#### Inherited from

[`BreakpointPolicy`](BreakpointPolicy.md).[`_breakpoints`](BreakpointPolicy.md#_breakpoints)

***

### logger

> `readonly` **logger**: `Logger`

Defined in: [src/debugger/breakpoint\_policies.ts:179](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L179)

#### Overrides

[`BreakpointPolicy`](BreakpointPolicy.md).[`logger`](BreakpointPolicy.md#logger)

***

### MAX\_DEFAULT\_TIMEOUT

> `protected` `readonly` **MAX\_DEFAULT\_TIMEOUT**: `number` = `10000`

Defined in: [src/debugger/breakpoint\_policies.ts:14](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L14)

#### Inherited from

[`BreakpointPolicy`](BreakpointPolicy.md).[`MAX_DEFAULT_TIMEOUT`](BreakpointPolicy.md#max_default_timeout)

***

### vm

> `protected` `readonly` **vm**: [`WasmitoBackendVM`](WasmitoBackendVM.md)

Defined in: [src/debugger/breakpoint\_policies.ts:13](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L13)

#### Inherited from

[`BreakpointPolicy`](BreakpointPolicy.md).[`vm`](BreakpointPolicy.md#vm)

## Accessors

### breakpoints

#### Get Signature

> **get** **breakpoints**(): [`Breakpoint`](Breakpoint.md)[]

Defined in: [src/debugger/breakpoint\_policies.ts:28](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L28)

##### Returns

[`Breakpoint`](Breakpoint.md)[]

#### Inherited from

[`BreakpointPolicy`](BreakpointPolicy.md).[`breakpoints`](BreakpointPolicy.md#breakpoints)

## Methods

### activate()

> **activate**(`startingBreakpoints`): `void`

Defined in: [src/debugger/breakpoint\_policies.ts:190](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L190)

#### Parameters

##### startingBreakpoints

[`Breakpoint`](Breakpoint.md)[]

#### Returns

`void`

#### Overrides

[`BreakpointPolicy`](BreakpointPolicy.md).[`activate`](BreakpointPolicy.md#activate)

***

### addBreakpoint()

> **addBreakpoint**(`breakpoint`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/debugger/breakpoint\_policies.ts:211](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L211)

#### Parameters

##### breakpoint

[`Breakpoint`](Breakpoint.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Overrides

[`BreakpointPolicy`](BreakpointPolicy.md).[`addBreakpoint`](BreakpointPolicy.md#addbreakpoint)

***

### deactivate()

> **deactivate**(): `void`

Defined in: [src/debugger/breakpoint\_policies.ts:201](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L201)

#### Returns

`void`

#### Overrides

[`BreakpointPolicy`](BreakpointPolicy.md).[`deactivate`](BreakpointPolicy.md#deactivate)

***

### hasBreakpoint()

> **hasBreakpoint**(`bp`): `boolean`

Defined in: [src/debugger/breakpoint\_policies.ts:139](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L139)

#### Parameters

##### bp

[`Breakpoint`](Breakpoint.md)

#### Returns

`boolean`

#### Inherited from

[`BreakpointPolicy`](BreakpointPolicy.md).[`hasBreakpoint`](BreakpointPolicy.md#hasbreakpoint)

***

### onBreakpointAdd()

> **onBreakpointAdd**(`cb`): `void`

Defined in: [src/debugger/breakpoint\_policies.ts:131](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L131)

#### Parameters

##### cb

(`bp`) => `void`

#### Returns

`void`

#### Inherited from

[`BreakpointPolicy`](BreakpointPolicy.md).[`onBreakpointAdd`](BreakpointPolicy.md#onbreakpointadd)

***

### onBreakpointRemove()

> **onBreakpointRemove**(`cb`): `void`

Defined in: [src/debugger/breakpoint\_policies.ts:135](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L135)

#### Parameters

##### cb

(`bp`) => `void`

#### Returns

`void`

#### Inherited from

[`BreakpointPolicy`](BreakpointPolicy.md).[`onBreakpointRemove`](BreakpointPolicy.md#onbreakpointremove)

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

#### Inherited from

[`BreakpointPolicy`](BreakpointPolicy.md).[`removeBreakpoint`](BreakpointPolicy.md#removebreakpoint)

***

### toString()

> **toString**(): `string`

Defined in: [src/debugger/breakpoint\_policies.ts:207](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/debugger/breakpoint_policies.ts#L207)

#### Returns

`string`

#### Overrides

[`BreakpointPolicy`](BreakpointPolicy.md).[`toString`](BreakpointPolicy.md#tostring)
