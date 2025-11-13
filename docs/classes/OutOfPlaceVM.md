[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / OutOfPlaceVM

# Class: OutOfPlaceVM

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:54](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L54)

## Extends

- [`WasmitoDevVM`](WasmitoDevVM.md)

## Properties

### ErrorClass

> `protected` **ErrorClass**: *typeof* [`OutOfPlaceVMError`](OutOfPlaceVMError.md) = `OutOfPlaceVMError`

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:55](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L55)

#### Overrides

[`WasmitoDevVM`](WasmitoDevVM.md).[`ErrorClass`](WasmitoDevVM.md#errorclass)

***

### eventsToHandle

> **eventsToHandle**: [`Event`](../wasmito/namespaces/WASM/interfaces/Event.md)[]

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:60](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L60)

***

### hooksStore

> `readonly` **hooksStore**: `Map`\<`number`, [`HookOnWasmAddrRequest`](HookOnWasmAddrRequest.md)[]\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:66](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L66)

#### Inherited from

[`WasmitoDevVM`](WasmitoDevVM.md).[`hooksStore`](WasmitoDevVM.md#hooksstore)

***

### logger

> `protected` **logger**: `Logger`

Defined in: [src/runtimes/wasmito\_vm/dev\_vm.ts:22](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/dev_vm.ts#L22)

#### Inherited from

[`WasmitoDevVM`](WasmitoDevVM.md).[`logger`](WasmitoDevVM.md#logger)

***

### onNewEventHook

> `protected` `readonly` **onNewEventHook**: `EventInspectHook`

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:61](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L61)

#### Inherited from

[`WasmitoDevVM`](WasmitoDevVM.md).[`onNewEventHook`](WasmitoDevVM.md#onneweventhook)

***

### process?

> `protected` `optional` **process**: `ChildProcess`

Defined in: [src/runtimes/wasmito\_vm/dev\_vm.ts:23](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/dev_vm.ts#L23)

#### Inherited from

[`WasmitoDevVM`](WasmitoDevVM.md).[`process`](WasmitoDevVM.md#process)

***

### targetVM

> `readonly` **targetVM**: [`WasmitoBackendVM`](WasmitoBackendVM.md)

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:56](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L56)

## Accessors

### breakpoints

#### Get Signature

> **get** **breakpoints**(): [`Breakpoint`](Breakpoint.md)[]

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:146](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L146)

##### Returns

[`Breakpoint`](Breakpoint.md)[]

#### Inherited from

[`WasmitoDevVM`](WasmitoDevVM.md).[`breakpoints`](WasmitoDevVM.md#breakpoints)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`channel`](WasmitoDevVM.md#channel)

***

### deviceIdentity

#### Get Signature

> **get** **deviceIdentity**(): [`DeviceIdentity`](DeviceIdentity.md)

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:89](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L89)

##### Returns

[`DeviceIdentity`](DeviceIdentity.md)

#### Inherited from

[`WasmitoDevVM`](WasmitoDevVM.md).[`deviceIdentity`](WasmitoDevVM.md#deviceidentity)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`languageAdaptor`](WasmitoDevVM.md#languageadaptor)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`platform`](WasmitoDevVM.md#platform)

***

### sourceMap

#### Get Signature

> **get** **sourceMap**(): [`SourceMap`](SourceMap.md)

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:137](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L137)

##### Returns

[`SourceMap`](SourceMap.md)

#### Inherited from

[`WasmitoDevVM`](WasmitoDevVM.md).[`sourceMap`](WasmitoDevVM.md#sourcemap)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`addBreakpoint`](WasmitoDevVM.md#addbreakpoint)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`addHookAfter`](WasmitoDevVM.md#addhookafter)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`addHookBefore`](WasmitoDevVM.md#addhookbefore)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`addHookOnAddr`](WasmitoDevVM.md#addhookonaddr)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`addHookOnError`](WasmitoDevVM.md#addhookonerror)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`addHookOnEventHandling`](WasmitoDevVM.md#addhookoneventhandling)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`addHookOnNewEvent`](WasmitoDevVM.md#addhookonnewevent)

***

### assertExistenceToolPort()

> `protected` **assertExistenceToolPort**(): `Promise`\<`void`\>

Defined in: [src/runtimes/wasmito\_vm/dev\_vm.ts:163](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/dev_vm.ts#L163)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`WasmitoDevVM`](WasmitoDevVM.md).[`assertExistenceToolPort`](WasmitoDevVM.md#assertexistencetoolport)

***

### breakpointPolicy()

> **breakpointPolicy**(): [`BreakpointPolicy`](BreakpointPolicy.md)

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:155](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L155)

#### Returns

[`BreakpointPolicy`](BreakpointPolicy.md)

#### Inherited from

[`WasmitoDevVM`](WasmitoDevVM.md).[`breakpointPolicy`](WasmitoDevVM.md#breakpointpolicy)

***

### buildProcessArguments()

> `protected` **buildProcessArguments**(`programPath`, `args`): `string`[]

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:115](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L115)

#### Parameters

##### programPath

`string`

##### args

[`VMConfiguration`](VMConfiguration.md)

#### Returns

`string`[]

#### Overrides

[`WasmitoDevVM`](WasmitoDevVM.md).[`buildProcessArguments`](WasmitoDevVM.md#buildprocessarguments)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`changeBreakpointPolicy`](WasmitoDevVM.md#changebreakpointpolicy)

***

### close()

> **close**(`timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:97](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L97)

#### Parameters

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Overrides

[`WasmitoDevVM`](WasmitoDevVM.md).[`close`](WasmitoDevVM.md#close)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`connect`](WasmitoDevVM.md#connect)

***

### disconnect()

> **disconnect**(): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:105](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L105)

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoDevVM`](WasmitoDevVM.md).[`disconnect`](WasmitoDevVM.md#disconnect)

***

### functionsProxied()

> **functionsProxied**(): `Set`\<[`WASMFunction`](WASMFunction.md)\>

Defined in: [src/runtimes/wasmito\_vm/wasmito\_vm.ts:165](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/wasmito_vm.ts#L165)

#### Returns

`Set`\<[`WASMFunction`](WASMFunction.md)\>

#### Inherited from

[`WasmitoDevVM`](WasmitoDevVM.md).[`functionsProxied`](WasmitoDevVM.md#functionsproxied)

***

### handleEvent()

> **handleEvent**(`eventNr`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:138](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L138)

#### Parameters

##### eventNr

`number`

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`inspect`](WasmitoDevVM.md#inspect)

***

### isProcess()

> **isProcess**(`p`): `boolean`

Defined in: [src/runtimes/wasmito\_vm/dev\_vm.ts:51](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/dev_vm.ts#L51)

#### Parameters

##### p

`ChildProcess`

#### Returns

`boolean`

#### Inherited from

[`WasmitoDevVM`](WasmitoDevVM.md).[`isProcess`](WasmitoDevVM.md#isprocess)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`loadWasmState`](WasmitoDevVM.md#loadwasmstate)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`pause`](WasmitoDevVM.md#pause)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`proxify`](WasmitoDevVM.md#proxify)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`proxyCall`](WasmitoDevVM.md#proxycall)

***

### registerAllPrimitivesForProxyCall()

> **registerAllPrimitivesForProxyCall**(`maxWaitTime?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:270](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L270)

#### Parameters

##### maxWaitTime?

`number`

#### Returns

`Promise`\<`boolean`\>

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`registerFuncForProxyCall`](WasmitoDevVM.md#registerfuncforproxycall)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`removeBreakpoint`](WasmitoDevVM.md#removebreakpoint)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`resolveEvent`](WasmitoDevVM.md#resolveevent)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`run`](WasmitoDevVM.md#run)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`sendCommand`](WasmitoDevVM.md#sendcommand)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`sendRequest`](WasmitoDevVM.md#sendrequest)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`snapshot`](WasmitoDevVM.md#snapshot)

***

### spawn()

> **spawn**(`_adaptor`, `_maxWaitTime?`): `Promise`\<`ChildProcess`\>

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:191](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L191)

#### Parameters

##### \_adaptor

[`LanguageAdaptor`](LanguageAdaptor.md)

##### \_maxWaitTime?

`number`

#### Returns

`Promise`\<`ChildProcess`\>

#### Overrides

[`WasmitoDevVM`](WasmitoDevVM.md).[`spawn`](WasmitoDevVM.md#spawn)

***

### spawnWithConfig()

> **spawnWithConfig**(`config`): `Promise`\<`ChildProcess`\>

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:203](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L203)

#### Parameters

##### config

[`OutOfPlaceSetupConfig`](../interfaces/OutOfPlaceSetupConfig.md)

#### Returns

`Promise`\<`ChildProcess`\>

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`step`](WasmitoDevVM.md#step)

***

### subscribeOnNewEvent()

> **subscribeOnNewEvent**(`cb`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:108](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L108)

#### Parameters

##### cb

(`ev`) => `void`

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Overrides

[`WasmitoDevVM`](WasmitoDevVM.md).[`subscribeOnNewEvent`](WasmitoDevVM.md#subscribeonnewevent)

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

[`WasmitoDevVM`](WasmitoDevVM.md).[`unregisterFuncForProxyCall`](WasmitoDevVM.md#unregisterfuncforproxycall)

***

### uploadSourceCode()

> **uploadSourceCode**(`languageAdaptor`, `timeout?`): `Promise`\<`boolean`\>

Defined in: [src/runtimes/wasmito\_vm/dev\_vm.ts:55](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/dev_vm.ts#L55)

#### Parameters

##### languageAdaptor

[`LanguageAdaptor`](LanguageAdaptor.md)

##### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`WasmitoDevVM`](WasmitoDevVM.md).[`uploadSourceCode`](WasmitoDevVM.md#uploadsourcecode)

***

### useAlreadySpawnedVM()

> **useAlreadySpawnedVM**(`toolPort`, `config`): `Promise`\<`void`\>

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:156](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L156)

#### Parameters

##### toolPort

`number`

##### config

[`OutOfPlaceSetupConfig`](../interfaces/OutOfPlaceSetupConfig.md)

#### Returns

`Promise`\<`void`\>

***

### createVM()

> `static` **createVM**(`vmToProxy`, `setupConfig`): `Promise`\<`OutOfPlaceVM`\>

Defined in: [src/runtimes/wasmito\_vm/outofplace\_vm.ts:74](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/outofplace_vm.ts#L74)

#### Parameters

##### vmToProxy

[`WasmitoBackendVM`](WasmitoBackendVM.md)

##### setupConfig

[`OutOfPlaceSetupConfig`](../interfaces/OutOfPlaceSetupConfig.md)

#### Returns

`Promise`\<`OutOfPlaceVM`\>
