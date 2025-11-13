[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / LanguageAdaptor

# Class: LanguageAdaptor

Defined in: [src/language\_adaptors/language\_adaptor.ts:36](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/language_adaptor.ts#L36)

## Constructors

### Constructor

> **new LanguageAdaptor**(`sourceMap`): `LanguageAdaptor`

Defined in: [src/language\_adaptors/language\_adaptor.ts:42](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/language_adaptor.ts#L42)

#### Parameters

##### sourceMap

[`SourceMap`](SourceMap.md)

#### Returns

`LanguageAdaptor`

## Properties

### sourceMap

> `readonly` **sourceMap**: [`SourceMap`](SourceMap.md)

Defined in: [src/language\_adaptors/language\_adaptor.ts:37](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/language_adaptor.ts#L37)

## Accessors

### asts

#### Get Signature

> **get** **asts**(): [`AgnosticASTMap`](../type-aliases/AgnosticASTMap.md)

Defined in: [src/language\_adaptors/language\_adaptor.ts:48](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/language_adaptor.ts#L48)

##### Returns

[`AgnosticASTMap`](../type-aliases/AgnosticASTMap.md)

***

### sourceCFG

#### Get Signature

> **get** **sourceCFG**(): [`SourceCFGs`](SourceCFGs.md) \| `undefined`

Defined in: [src/language\_adaptors/language\_adaptor.ts:52](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/language_adaptor.ts#L52)

##### Returns

[`SourceCFGs`](SourceCFGs.md) \| `undefined`

***

### sourceCFGs

#### Get Signature

> **get** **sourceCFGs**(): [`SourceCFGs`](SourceCFGs.md)

Defined in: [src/language\_adaptors/language\_adaptor.ts:56](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/language_adaptor.ts#L56)

##### Returns

[`SourceCFGs`](SourceCFGs.md)

## Methods

### buildComplementaryContext()

> **buildComplementaryContext**(`includeUnavailableSourceFiles`): `Promise`\<`void`\>

Defined in: [src/language\_adaptors/language\_adaptor.ts:63](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/language_adaptor.ts#L63)

#### Parameters

##### includeUnavailableSourceFiles

`boolean`

#### Returns

`Promise`\<`void`\>

***

### unusedMappingsToJSON()

> **unusedMappingsToJSON**(`ouputFile?`): `string`

Defined in: [src/language\_adaptors/language\_adaptor.ts:70](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/language_adaptor.ts#L70)

#### Parameters

##### ouputFile?

`string`

#### Returns

`string`

***

### emptyAdaptor()

> `static` **emptyAdaptor**(`wasmPath`): `LanguageAdaptor`

Defined in: [src/language\_adaptors/language\_adaptor.ts:177](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/language_adaptor.ts#L177)

#### Parameters

##### wasmPath

`string`

#### Returns

`LanguageAdaptor`

***

### fromMappingsPath()

> `static` **fromMappingsPath**(`mappingsPath`, `config?`): `LanguageAdaptor`

Defined in: [src/language\_adaptors/language\_adaptor.ts:181](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/language_adaptor.ts#L181)

#### Parameters

##### mappingsPath

`string`

##### config?

`SourceMapConfig`

#### Returns

`LanguageAdaptor`
