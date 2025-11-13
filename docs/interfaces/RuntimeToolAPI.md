[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / RuntimeToolAPI

# Interface: RuntimeToolAPI

Defined in: [src/runtimes/runtime\_api.ts:12](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L12)

## Properties

### addBreakpoint()

> **addBreakpoint**: (`breakpoint`, `timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/runtimes/runtime\_api.ts:23](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L23)

#### Parameters

##### breakpoint

[`Breakpoint`](../classes/Breakpoint.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### addHookAfter()

> **addHookAfter**: (`sourceCodeLocation`, `hook`, `timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/runtimes/runtime\_api.ts:70](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L70)

#### Parameters

##### sourceCodeLocation

[`SourceCodeLocation`](SourceCodeLocation.md)

##### hook

[`Hook`](../classes/Hook.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### addHookBefore()

> **addHookBefore**: (`sourceCodeLocation`, `hook`, `timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/runtimes/runtime\_api.ts:64](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L64)

#### Parameters

##### sourceCodeLocation

[`SourceCodeLocation`](SourceCodeLocation.md)

##### hook

[`Hook`](../classes/Hook.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### addHookOnAddr()

> **addHookOnAddr**: (`addr`, `hook`, `moment`, `timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/runtimes/runtime\_api.ts:76](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L76)

#### Parameters

##### addr

`number`

##### hook

[`Hook`](../classes/Hook.md)

##### moment

[`HookOnWasmAddrMoment`](../enumerations/HookOnWasmAddrMoment.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### addHookOnError()

> **addHookOnError**: (`hook`, `timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/runtimes/runtime\_api.ts:88](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L88)

#### Parameters

##### hook

[`Hook`](../classes/Hook.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### addHookOnEventHandling()

> **addHookOnEventHandling**: (`hook`, `timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/runtimes/runtime\_api.ts:86](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L86)

#### Parameters

##### hook

[`Hook`](../classes/Hook.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### addHookOnNewEvent()

> **addHookOnNewEvent**: (`hook`, `timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/runtimes/runtime\_api.ts:84](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L84)

#### Parameters

##### hook

[`Hook`](../classes/Hook.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### breakpointPolicy()

> **breakpointPolicy**: () => [`BreakpointPolicy`](../classes/BreakpointPolicy.md)

Defined in: [src/runtimes/runtime\_api.ts:19](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L19)

#### Returns

[`BreakpointPolicy`](../classes/BreakpointPolicy.md)

***

### changeBreakpointPolicy()

> **changeBreakpointPolicy**: (`p`) => `void`

Defined in: [src/runtimes/runtime\_api.ts:21](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L21)

#### Parameters

##### p

[`BreakpointPolicy`](../classes/BreakpointPolicy.md)

#### Returns

`void`

***

### functionsProxied()

> **functionsProxied**: () => `Set`\<[`WASMFunction`](../classes/WASMFunction.md)\>

Defined in: [src/runtimes/runtime\_api.ts:55](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L55)

#### Returns

`Set`\<[`WASMFunction`](../classes/WASMFunction.md)\>

***

### inspect()

> **inspect**: (`neededState`, `timeout?`) => `Promise`\<[`WasmState`](../classes/WasmState.md)\>

Defined in: [src/runtimes/runtime\_api.ts:37](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L37)

#### Parameters

##### neededState

[`StateRequest`](../classes/StateRequest.md)

##### timeout?

`number`

#### Returns

`Promise`\<[`WasmState`](../classes/WasmState.md)\>

***

### loadWasmState()

> **loadWasmState**: (`state`, `timeout?`) => `Promise`\<`void`\>

Defined in: [src/runtimes/runtime\_api.ts:41](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L41)

#### Parameters

##### state

[`WasmState`](../classes/WasmState.md)

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

***

### pause()

> **pause**: (`timeout?`) => `Promise`\<`void`\>

Defined in: [src/runtimes/runtime\_api.ts:15](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L15)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

***

### proxify()

> **proxify**: (`timeout?`) => `Promise`\<`void`\>

Defined in: [src/runtimes/runtime\_api.ts:30](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L30)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

***

### proxyCall()

> **proxyCall**: (`funcid`, `args`, `timeout?`) => `Promise`\<[`ProxyCallResponse`](../type-aliases/ProxyCallResponse.md)\>

Defined in: [src/runtimes/runtime\_api.ts:57](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L57)

#### Parameters

##### funcid

`number`

##### args

[`Value`](../wasmito/namespaces/WASM/interfaces/Value.md)[]

##### timeout?

`number`

#### Returns

`Promise`\<[`ProxyCallResponse`](../type-aliases/ProxyCallResponse.md)\>

***

### registerFuncForProxyCall()

> **registerFuncForProxyCall**: (`funcToProxy`, `timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/runtimes/runtime\_api.ts:50](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L50)

#### Parameters

##### funcToProxy

[`WASMFunction`](../classes/WASMFunction.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### removeBreakpoint()

> **removeBreakpoint**: (`breakpoint`, `timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/runtimes/runtime\_api.ts:25](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L25)

#### Parameters

##### breakpoint

[`Breakpoint`](../classes/Breakpoint.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### resolveEvent()

> **resolveEvent**: (`timeout?`) => `Promise`\<`void`\>

Defined in: [src/runtimes/runtime\_api.ts:43](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L43)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

***

### run()

> **run**: (`timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/runtimes/runtime\_api.ts:13](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L13)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### snapshot()

> **snapshot**: (`timeout?`) => `Promise`\<[`WasmState`](../classes/WasmState.md)\>

Defined in: [src/runtimes/runtime\_api.ts:39](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L39)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<[`WasmState`](../classes/WasmState.md)\>

***

### step()

> **step**: (`timeout?`) => `Promise`\<`void`\>

Defined in: [src/runtimes/runtime\_api.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L17)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

***

### subscribeOnNewEvent()

> **subscribeOnNewEvent**: (`cb`, `timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/runtimes/runtime\_api.ts:90](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L90)

#### Parameters

##### cb

(`ev`) => `void`

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### unregisterFuncForProxyCall()

> **unregisterFuncForProxyCall**: (`funcToProxy`, `timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/runtimes/runtime\_api.ts:45](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L45)

#### Parameters

##### funcToProxy

[`WASMFunction`](../classes/WASMFunction.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### uploadSourceCode()

> **uploadSourceCode**: (`languageAdaptor`, `timeout?`) => `Promise`\<`boolean`\>

Defined in: [src/runtimes/runtime\_api.ts:32](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/runtime_api.ts#L32)

#### Parameters

##### languageAdaptor

[`LanguageAdaptor`](../classes/LanguageAdaptor.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>
