[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / MCUWasmitoVM

# Class: MCUWasmitoVM

Defined in: [src/runtimes/wasmito\_vm/mcu\_vm.ts:40](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/mcu_vm.ts#L40)

## Extends

- [`WasmitoBackendVM`](WasmitoBackendVM.md)

## Constructors

### Constructor

> **new MCUWasmitoVM**(`platform`, `channel?`): `MCUWasmitoVM`

Defined in: [src/runtimes/wasmito\_vm/mcu\_vm.ts:44](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/mcu_vm.ts#L44)

#### Parameters

##### platform

[`Platform`](Platform.md)

##### channel?

[`Channel`](../interfaces/Channel.md)

#### Returns

`MCUWasmitoVM`

#### Overrides

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`constructor`](WasmitoBackendVM.md#constructor)

## Properties

### ErrorClass

> `protected` **ErrorClass**: *typeof* [`MCUWasmitoVMError`](MCUWasmitoVMError.md) = `MCUWasmitoVMError`

Defined in: [src/runtimes/wasmito\_vm/mcu\_vm.ts:42](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/mcu_vm.ts#L42)

#### Overrides

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`ErrorClass`](WasmitoBackendVM.md#errorclass)

***

### hooksStore

> `readonly` **hooksStore**: `Map`\<`number`, [`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md)[]\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:66](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L66)

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`hooksStore`](WasmitoBackendVM.md#hooksstore)

***

### logger

> `protected` **logger**: `Logger`

Defined in: [src/runtimes/wasmito\_vm/mcu\_vm.ts:41](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/mcu_vm.ts#L41)

#### Overrides

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`logger`](WasmitoBackendVM.md#logger)

***

### onNewEventHook

> `protected` `readonly` **onNewEventHook**: `EventInspectHook`

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:61](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L61)

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`onNewEventHook`](WasmitoBackendVM.md#onneweventhook)

## Accessors

### breakpoints

#### Get Signature

> **get** **breakpoints**(): [`Breakpoint`](Breakpoint.md)[]

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:146](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L146)

##### Returns

[`Breakpoint`](Breakpoint.md)[]

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`breakpoints`](WasmitoBackendVM.md#breakpoints)

***

### channel

#### Get Signature

> **get** **channel**(): [`Channel`](../interfaces/Channel.md)

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:115](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L115)

##### Returns

[`Channel`](../interfaces/Channel.md)

#### Set Signature

> **set** **channel**(`newChannel`): `void`

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:119](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L119)

##### Parameters

###### newChannel

[`Channel`](../interfaces/Channel.md)

##### Returns

`void`

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`channel`](WasmitoBackendVM.md#channel)

***

### deviceIdentity

#### Get Signature

> **get** **deviceIdentity**(): [`DeviceIdentity`](DeviceIdentity.md)

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:89](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L89)

##### Returns

[`DeviceIdentity`](DeviceIdentity.md)

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`deviceIdentity`](WasmitoBackendVM.md#deviceidentity)

***

### languageAdaptor

#### Get Signature

> **get** **languageAdaptor**(): [`LanguageAdaptor`](LanguageAdaptor.md)

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:124](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L124)

##### Returns

[`LanguageAdaptor`](LanguageAdaptor.md)

#### Set Signature

> **set** **languageAdaptor**(`a`): `void`

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:133](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L133)

##### Parameters

###### a

[`LanguageAdaptor`](LanguageAdaptor.md)

##### Returns

`void`

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`languageAdaptor`](WasmitoBackendVM.md#languageadaptor)

***

### platform

#### Get Signature

> **get** **platform**(): [`Platform`](Platform.md)

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:78](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L78)

##### Returns

[`Platform`](Platform.md)

#### Set Signature

> **set** **platform**(`p`): `void`

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:85](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L85)

##### Parameters

###### p

[`Platform`](Platform.md)

##### Returns

`void`

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`platform`](WasmitoBackendVM.md#platform)

***

### sourceMap

#### Get Signature

> **get** **sourceMap**(): [`SourceMap`](SourceMap.md)

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:137](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L137)

##### Returns

[`SourceMap`](SourceMap.md)

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`sourceMap`](WasmitoBackendVM.md#sourcemap)

## Methods

### addBreakpoint()

> **addBreakpoint**(`breakpoint`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:266](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L266)

#### Parameters

##### breakpoint

[`Breakpoint`](Breakpoint.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`addBreakpoint`](WasmitoBackendVM.md#addbreakpoint)

***

### addHookAfter()

> **addHookAfter**(`sourceCodeLocation`, `hook`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:368](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L368)

#### Parameters

##### sourceCodeLocation

[`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)

##### hook

[`Hook`](Hook.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`addHookAfter`](WasmitoBackendVM.md#addhookafter)

***

### addHookBefore()

> **addHookBefore**(`sourceCodeLocation`, `hook`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:355](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L355)

#### Parameters

##### sourceCodeLocation

[`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)

##### hook

[`Hook`](Hook.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`addHookBefore`](WasmitoBackendVM.md#addhookbefore)

***

### addHookOnAddr()

> **addHookOnAddr**(`addr`, `hook`, `moment`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:381](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L381)

#### Parameters

##### addr

`number`

##### hook

[`Hook`](Hook.md)

##### moment

[`HookOnWasmAddrMoment`](../enumerations/HookOnWasmAddrMoment.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`addHookOnAddr`](WasmitoBackendVM.md#addhookonaddr)

***

### addHookOnError()

> **addHookOnError**(`hook`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:447](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L447)

#### Parameters

##### hook

[`Hook`](Hook.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`addHookOnError`](WasmitoBackendVM.md#addhookonerror)

***

### addHookOnEventHandling()

> **addHookOnEventHandling**(`hook`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:441](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L441)

#### Parameters

##### hook

[`Hook`](Hook.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`addHookOnEventHandling`](WasmitoBackendVM.md#addhookoneventhandling)

***

### addHookOnNewEvent()

> **addHookOnNewEvent**(`hook`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:432](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L432)

#### Parameters

##### hook

[`Hook`](Hook.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`addHookOnNewEvent`](WasmitoBackendVM.md#addhookonnewevent)

***

### breakpointPolicy()

> **breakpointPolicy**(): [`BreakpointPolicy`](BreakpointPolicy.md)

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:155](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L155)

#### Returns

[`BreakpointPolicy`](BreakpointPolicy.md)

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`breakpointPolicy`](WasmitoBackendVM.md#breakpointpolicy)

***

### changeBreakpointPolicy()

> **changeBreakpointPolicy**(`newPolicy`): `void`

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:159](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L159)

#### Parameters

##### newPolicy

[`BreakpointPolicy`](BreakpointPolicy.md)

#### Returns

`void`

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`changeBreakpointPolicy`](WasmitoBackendVM.md#changebreakpointpolicy)

***

### close()

> **close**(`timedout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/mcu\_vm.ts:55](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/mcu_vm.ts#L55)

#### Parameters

##### timedout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Overrides

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`close`](WasmitoBackendVM.md#close)

***

### connect()

> **connect**(`timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:95](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L95)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`connect`](WasmitoBackendVM.md#connect)

***

### disconnect()

> **disconnect**(): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:105](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L105)

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`disconnect`](WasmitoBackendVM.md#disconnect)

***

### functionsProxied()

> **functionsProxied**(): `Set`\<[`WASMFunction`](WASMFunction.md)\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:165](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L165)

#### Returns

`Set`\<[`WASMFunction`](WASMFunction.md)\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`functionsProxied`](WasmitoBackendVM.md#functionsproxied)

***

### inspect()

> **inspect**(`neededState`, `timeout?`): `Promise`\<[`WasmState`](WasmState.md)\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:208](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L208)

#### Parameters

##### neededState

[`StateRequest`](StateRequest.md)

##### timeout?

`number`

#### Returns

`Promise`\<[`WasmState`](WasmState.md)\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`inspect`](WasmitoBackendVM.md#inspect)

***

### loadWasmState()

> **loadWasmState**(`wasmState`, `timeout?`): `Promise`\<`void`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:239](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L239)

#### Parameters

##### wasmState

[`WasmState`](WasmState.md)

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`loadWasmState`](WasmitoBackendVM.md#loadwasmstate)

***

### pause()

> **pause**(`timeout?`): `Promise`\<`void`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:194](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L194)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`pause`](WasmitoBackendVM.md#pause)

***

### proxify()

> **proxify**(`timeout?`): `Promise`\<`void`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:259](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L259)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`proxify`](WasmitoBackendVM.md#proxify)

***

### proxyCall()

> **proxyCall**(`funcid`, `args`, `timeout?`): `Promise`\<[`ProxyCallResponse`](../type-aliases/ProxyCallResponse.md)\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:280](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L280)

#### Parameters

##### funcid

`number`

##### args

[`Value`](../wasmito/namespaces/WASM/interfaces/Value.md)[]

##### timeout?

`number`

#### Returns

`Promise`\<[`ProxyCallResponse`](../type-aliases/ProxyCallResponse.md)\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`proxyCall`](WasmitoBackendVM.md#proxycall)

***

### registerFuncForProxyCall()

> **registerFuncForProxyCall**(`funcToProxy`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:289](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L289)

#### Parameters

##### funcToProxy

[`WASMFunction`](WASMFunction.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`registerFuncForProxyCall`](WasmitoBackendVM.md#registerfuncforproxycall)

***

### removeBreakpoint()

> **removeBreakpoint**(`breakpoint`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:273](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L273)

#### Parameters

##### breakpoint

[`Breakpoint`](Breakpoint.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`removeBreakpoint`](WasmitoBackendVM.md#removebreakpoint)

***

### resolveEvent()

> **resolveEvent**(`timeout?`): `Promise`\<`void`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:254](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L254)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`resolveEvent`](WasmitoBackendVM.md#resolveevent)

***

### run()

> **run**(`timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:186](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L186)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`run`](WasmitoBackendVM.md#run)

***

### sendCommand()

> **sendCommand**\<`T`\>(`command`): `Promise`\<`T`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:235](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L235)

#### Type Parameters

##### T

`T`

#### Parameters

##### command

[`Command`](Command.md)\<`T`\>

#### Returns

`Promise`\<`T`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`sendCommand`](WasmitoBackendVM.md#sendcommand)

***

### sendRequest()

> **sendRequest**\<`T`\>(`request`, `timeout?`): `Promise`\<`T`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:227](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L227)

#### Type Parameters

##### T

`T`

#### Parameters

##### request

[`APIRequest`](APIRequest.md)\<`T`\>

##### timeout?

`number`

#### Returns

`Promise`\<`T`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`sendRequest`](WasmitoBackendVM.md#sendrequest)

***

### snapshot()

> **snapshot**(`timeout?`): `Promise`\<[`WasmState`](WasmState.md)\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:215](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L215)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<[`WasmState`](WasmState.md)\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`snapshot`](WasmitoBackendVM.md#snapshot)

***

### step()

> **step**(`timeout?`): `Promise`\<`void`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:201](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L201)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`step`](WasmitoBackendVM.md#step)

***

### subscribeOnNewEvent()

> **subscribeOnNewEvent**(`cb`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:169](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L169)

#### Parameters

##### cb

(`ev`) => `void`

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`subscribeOnNewEvent`](WasmitoBackendVM.md#subscribeonnewevent)

***

### unregisterFuncForProxyCall()

> **unregisterFuncForProxyCall**(`funcToProxy`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:323](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L323)

#### Parameters

##### funcToProxy

[`WASMFunction`](WASMFunction.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`unregisterFuncForProxyCall`](WasmitoBackendVM.md#unregisterfuncforproxycall)

***

### uploadSourceCode()

> **uploadSourceCode**(`languageAdaptor`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/mcu\_vm.ts:66](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/mcu_vm.ts#L66)

#### Parameters

##### languageAdaptor

[`LanguageAdaptor`](LanguageAdaptor.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Overrides

[`WasmitoBackendVM`](WasmitoBackendVM.md).[`uploadSourceCode`](WasmitoBackendVM.md#uploadsourcecode)
