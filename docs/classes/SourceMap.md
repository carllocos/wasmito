[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / SourceMap

# Class: SourceMap

Defined in: [src/source\_mappers/source\_map.ts:103](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/source_mappers/source_map.ts#L103)

## Constructors

### Constructor

> **new SourceMap**(`wasmPath`, `sources`, `mappings`): `SourceMap`

Defined in: [src/source\_mappers/source\_map.ts:109](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/source_mappers/source_map.ts#L109)

#### Parameters

##### wasmPath

`string` | `SourceMap`

##### sources

`string`[]

##### mappings

[`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)[]

#### Returns

`SourceMap`

## Properties

### wasm

> `readonly` **wasm**: [`WasmModule`](WasmModule.md)

Defined in: [src/source\_mappers/source\_map.ts:107](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/source_mappers/source_map.ts#L107)

## Accessors

### mappings

#### Get Signature

> **get** **mappings**(): [`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)[]

Defined in: [src/source\_mappers/source\_map.ts:128](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/source_mappers/source_map.ts#L128)

##### Returns

[`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)[]

***

### sources

#### Get Signature

> **get** **sources**(): `string`[]

Defined in: [src/source\_mappers/source\_map.ts:124](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/source_mappers/source_map.ts#L124)

##### Returns

`string`[]

## Methods

### allMappings()

> **allMappings**(): [`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)[]

Defined in: [src/source\_mappers/source\_map.ts:176](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/source_mappers/source_map.ts#L176)

#### Returns

[`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)[]

***

### generatedPositionFor()

> **generatedPositionFor**(`location`): [`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)[]

Defined in: [src/source\_mappers/source\_map.ts:142](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/source_mappers/source_map.ts#L142)

Find and return all the source locations that match the given argument location.
If either the `source` or `colnr` is equal to respectively an empty string or a number smaller than zero.
The fields are then ignored when finding the locations.

#### Parameters

##### location

[`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)

#### Returns

[`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)[]

the source code locations matching the given location

***

### getFunction()

> **getFunction**(`id`): [`WASMFunction`](WASMFunction.md) \| `undefined`

Defined in: [src/source\_mappers/source\_map.ts:181](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/source_mappers/source_map.ts#L181)

#### Parameters

##### id

`number`

#### Returns

[`WASMFunction`](WASMFunction.md) \| `undefined`

***

### getOriginalPositionFor()

> **getOriginalPositionFor**(`wasmAddr`): [`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)[]

Defined in: [src/source\_mappers/source\_map.ts:193](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/source_mappers/source_map.ts#L193)

#### Parameters

##### wasmAddr

`number`

#### Returns

[`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)[]

***

### storeMappingsToJSON()

> **storeMappingsToJSON**(`filePath`): `void`

Defined in: [src/source\_mappers/source\_map.ts:207](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/source_mappers/source_map.ts#L207)

#### Parameters

##### filePath

`string`

#### Returns

`void`

***

### toSourceMapJSON()

> **toSourceMapJSON**(): [`SourceMapJSON`](../interfaces/SourceMapJSON.md)

Defined in: [src/source\_mappers/source\_map.ts:216](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/source_mappers/source_map.ts#L216)

#### Returns

[`SourceMapJSON`](../interfaces/SourceMapJSON.md)
