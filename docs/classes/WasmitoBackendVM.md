[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / WasmitoBackendVM

# Abstract Class: WasmitoBackendVM

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:54](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L54)

## Extended by

- [`WasmitoDevVM`](WasmitoDevVM.md)
- [`MCUWasmitoVM`](MCUWasmitoVM.md)

## Implements

- [`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md)

## Constructors

### Constructor

> **new WasmitoBackendVM**(`platform`, `communicationChannel`): `WasmitoBackendVM`

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:68](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L68)

#### Parameters

##### platform

[`Platform`](Platform.md)

##### communicationChannel

[`Channel`](../interfaces/Channel.md)

#### Returns

`WasmitoBackendVM`

## Properties

### ErrorClass()

> `abstract` `protected` `readonly` **ErrorClass**: (`errorMsg`) => `Error`

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:59](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L59)

#### Parameters

##### errorMsg

`string`

#### Returns

`Error`

***

### hooksStore

> `readonly` **hooksStore**: `Map`\<`number`, [`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md)[]\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:66](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L66)

***

### logger

> `abstract` `protected` **logger**: `Logger`

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:56](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L56)

***

### onNewEventHook

> `protected` `readonly` **onNewEventHook**: `EventInspectHook`

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:61](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L61)

## Accessors

### breakpoints

#### Get Signature

> **get** **breakpoints**(): [`Breakpoint`](Breakpoint.md)[]

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:146](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L146)

##### Returns

[`Breakpoint`](Breakpoint.md)[]

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

***

### deviceIdentity

#### Get Signature

> **get** **deviceIdentity**(): [`DeviceIdentity`](DeviceIdentity.md)

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:89](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L89)

##### Returns

[`DeviceIdentity`](DeviceIdentity.md)

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

***

### sourceMap

#### Get Signature

> **get** **sourceMap**(): [`SourceMap`](SourceMap.md)

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:137](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L137)

##### Returns

[`SourceMap`](SourceMap.md)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`addBreakpoint`](../interfaces/RuntimeToolAPI.md#addbreakpoint)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`addHookAfter`](../interfaces/RuntimeToolAPI.md#addhookafter)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`addHookBefore`](../interfaces/RuntimeToolAPI.md#addhookbefore)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`addHookOnAddr`](../interfaces/RuntimeToolAPI.md#addhookonaddr)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`addHookOnError`](../interfaces/RuntimeToolAPI.md#addhookonerror)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`addHookOnEventHandling`](../interfaces/RuntimeToolAPI.md#addhookoneventhandling)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`addHookOnNewEvent`](../interfaces/RuntimeToolAPI.md#addhookonnewevent)

***

### breakpointPolicy()

> **breakpointPolicy**(): [`BreakpointPolicy`](BreakpointPolicy.md)

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:155](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L155)

#### Returns

[`BreakpointPolicy`](BreakpointPolicy.md)

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`breakpointPolicy`](../interfaces/RuntimeToolAPI.md#breakpointpolicy)

***

### changeBreakpointPolicy()

> **changeBreakpointPolicy**(`newPolicy`): `void`

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:159](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L159)

#### Parameters

##### newPolicy

[`BreakpointPolicy`](BreakpointPolicy.md)

#### Returns

`void`

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`changeBreakpointPolicy`](../interfaces/RuntimeToolAPI.md#changebreakpointpolicy)

***

### close()

> `abstract` **close**(`timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:93](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L93)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### connect()

> **connect**(`timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:95](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L95)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

***

### disconnect()

> **disconnect**(): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:105](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L105)

#### Returns

`Promise`\<`boolean`\>

***

### functionsProxied()

> **functionsProxied**(): `Set`\<[`WASMFunction`](WASMFunction.md)\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:165](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L165)

#### Returns

`Set`\<[`WASMFunction`](WASMFunction.md)\>

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`functionsProxied`](../interfaces/RuntimeToolAPI.md#functionsproxied)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`inspect`](../interfaces/RuntimeToolAPI.md#inspect)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`loadWasmState`](../interfaces/RuntimeToolAPI.md#loadwasmstate)

***

### pause()

> **pause**(`timeout?`): `Promise`\<`void`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:194](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L194)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`pause`](../interfaces/RuntimeToolAPI.md#pause)

***

### proxify()

> **proxify**(`timeout?`): `Promise`\<`void`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:259](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L259)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`proxify`](../interfaces/RuntimeToolAPI.md#proxify)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`proxyCall`](../interfaces/RuntimeToolAPI.md#proxycall)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`registerFuncForProxyCall`](../interfaces/RuntimeToolAPI.md#registerfuncforproxycall)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`removeBreakpoint`](../interfaces/RuntimeToolAPI.md#removebreakpoint)

***

### resolveEvent()

> **resolveEvent**(`timeout?`): `Promise`\<`void`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:254](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L254)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`resolveEvent`](../interfaces/RuntimeToolAPI.md#resolveevent)

***

### run()

> **run**(`timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:186](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L186)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`run`](../interfaces/RuntimeToolAPI.md#run)

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

***

### snapshot()

> **snapshot**(`timeout?`): `Promise`\<[`WasmState`](WasmState.md)\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:215](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L215)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<[`WasmState`](WasmState.md)\>

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`snapshot`](../interfaces/RuntimeToolAPI.md#snapshot)

***

### step()

> **step**(`timeout?`): `Promise`\<`void`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:201](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L201)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`step`](../interfaces/RuntimeToolAPI.md#step)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`subscribeOnNewEvent`](../interfaces/RuntimeToolAPI.md#subscribeonnewevent)

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

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`unregisterFuncForProxyCall`](../interfaces/RuntimeToolAPI.md#unregisterfuncforproxycall)

***

### uploadSourceCode()

> `abstract` **uploadSourceCode**(`languageAdator`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:222](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L222)

#### Parameters

##### languageAdator

[`LanguageAdaptor`](LanguageAdaptor.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`RuntimeToolAPI`](../interfaces/RuntimeToolAPI.md).[`uploadSourceCode`](../interfaces/RuntimeToolAPI.md#uploadsourcecode)
