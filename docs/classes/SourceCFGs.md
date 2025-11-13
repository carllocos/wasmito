[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / SourceCFGs

# Class: SourceCFGs

Defined in: [src/cfg/source\_cfg.ts:47](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L47)

## Constructors

### Constructor

> **new SourceCFGs**(`_asts`, `sourceMap`, `wasmCFGs`, `includeUnavailableSourcefiles`): `SourceCFGs`

Defined in: [src/cfg/source\_cfg.ts:57](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L57)

#### Parameters

##### \_asts

[`AgnosticASTMap`](../type-aliases/AgnosticASTMap.md)

##### sourceMap

[`SourceMap`](SourceMap.md)

##### wasmCFGs

[`WasmCFGs`](WasmCFGs.md)

##### includeUnavailableSourcefiles

`boolean` = `false`

#### Returns

`SourceCFGs`

## Properties

### fullSourceMap

> `readonly` **fullSourceMap**: [`SourceMap`](SourceMap.md)

Defined in: [src/cfg/source\_cfg.ts:52](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L52)

## Accessors

### callbacksCFGs

#### Get Signature

> **get** **callbacksCFGs**(): `CallbackSCFG`[]

Defined in: [src/cfg/source\_cfg.ts:98](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L98)

##### Returns

`CallbackSCFG`[]

***

### sourceMap

#### Get Signature

> **get** **sourceMap**(): [`SourceMap`](SourceMap.md)

Defined in: [src/cfg/source\_cfg.ts:79](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L79)

##### Returns

[`SourceMap`](SourceMap.md)

***

### wasmCFGs

#### Get Signature

> **get** **wasmCFGs**(): [`WasmCFGs`](WasmCFGs.md)

Defined in: [src/cfg/source\_cfg.ts:94](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L94)

##### Returns

[`WasmCFGs`](WasmCFGs.md)

## Methods

### allNodes()

> **allNodes**(): [`SourceCFGNode`](../interfaces/SourceCFGNode.md)[]

Defined in: [src/cfg/source\_cfg.ts:183](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L183)

#### Returns

[`SourceCFGNode`](../interfaces/SourceCFGNode.md)[]

***

### getFunctionEntryNodes()

> **getFunctionEntryNodes**(`fid`): [`SourceCFGNode`](../interfaces/SourceCFGNode.md)[]

Defined in: [src/cfg/source\_cfg.ts:174](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L174)

#### Parameters

##### fid

`number`

#### Returns

[`SourceCFGNode`](../interfaces/SourceCFGNode.md)[]

***

### getFunctionEntryNodesFromNode()

> **getFunctionEntryNodesFromNode**(`n`): [`SourceCFGNode`](../interfaces/SourceCFGNode.md)[]

Defined in: [src/cfg/source\_cfg.ts:187](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L187)

#### Parameters

##### n

[`SourceCFGNode`](../interfaces/SourceCFGNode.md)

#### Returns

[`SourceCFGNode`](../interfaces/SourceCFGNode.md)[]

***

### getFunctionSourceCFG()

> **getFunctionSourceCFG**(`fid`): [`BinaryLiftedCFG`](../interfaces/BinaryLiftedCFG.md) \| `undefined`

Defined in: [src/cfg/source\_cfg.ts:162](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L162)

#### Parameters

##### fid

`number`

#### Returns

[`BinaryLiftedCFG`](../interfaces/BinaryLiftedCFG.md) \| `undefined`

***

### getFunctionSourceCFGOrError()

> **getFunctionSourceCFGOrError**(`fid`): [`BinaryLiftedCFG`](../interfaces/BinaryLiftedCFG.md)

Defined in: [src/cfg/source\_cfg.ts:166](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L166)

#### Parameters

##### fid

`number`

#### Returns

[`BinaryLiftedCFG`](../interfaces/BinaryLiftedCFG.md)

***

### getNodeNeighbours()

> **getNodeNeighbours**(`n`, `ignoreExitNodes`): \[[`SourceCFGNode`](../interfaces/SourceCFGNode.md), `number`\][]

Defined in: [src/cfg/source\_cfg.ts:218](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L218)

#### Parameters

##### n

[`SourceCFGNode`](../interfaces/SourceCFGNode.md)

##### ignoreExitNodes

`boolean` = `false`

#### Returns

\[[`SourceCFGNode`](../interfaces/SourceCFGNode.md), `number`\][]

***

### nextReachableSourceNodesFromAddr()

> **nextReachableSourceNodesFromAddr**(`addr`): [`DestinationSCFGNode`](../type-aliases/DestinationSCFGNode.md)[]

Defined in: [src/cfg/source\_cfg.ts:242](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L242)

#### Parameters

##### addr

`number`

#### Returns

[`DestinationSCFGNode`](../type-aliases/DestinationSCFGNode.md)[]

***

### nextReachableSourceNodesFromFunction()

> **nextReachableSourceNodesFromFunction**(`fid`): [`DestinationSCFGNode`](../type-aliases/DestinationSCFGNode.md)[]

Defined in: [src/cfg/source\_cfg.ts:259](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L259)

#### Parameters

##### fid

`number`

#### Returns

[`DestinationSCFGNode`](../type-aliases/DestinationSCFGNode.md)[]

***

### nodesFromAddress()

> **nodesFromAddress**(`addr`): [`SourceCFGNode`](../interfaces/SourceCFGNode.md) \| `undefined`

Defined in: [src/cfg/source\_cfg.ts:107](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L107)

#### Parameters

##### addr

`number`

#### Returns

[`SourceCFGNode`](../interfaces/SourceCFGNode.md) \| `undefined`

***

### nodesFromSourceLoc()

> **nodesFromSourceLoc**(`location`): [`SourceCFGNode`](../interfaces/SourceCFGNode.md)[]

Defined in: [src/cfg/source\_cfg.ts:124](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L124)

#### Parameters

##### location

[`SourceCodeLocation`](../interfaces/SourceCodeLocation.md)

#### Returns

[`SourceCFGNode`](../interfaces/SourceCFGNode.md)[]

***

### serializeToDot()

> **serializeToDot**(`outputDir`, `config`, `prefixFilenameIfDefaultTooLong`): `string`[]

Defined in: [src/cfg/source\_cfg.ts:265](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L265)

#### Parameters

##### outputDir

`string`

##### config

[`DotSerializationConfig`](../interfaces/DotSerializationConfig.md)

##### prefixFilenameIfDefaultTooLong

`string` = `'sourceCFG'`

#### Returns

`string`[]

***

### toJSON()

> **toJSON**(`outputDir?`): `string`

Defined in: [src/cfg/source\_cfg.ts:338](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L338)

#### Parameters

##### outputDir?

`string`

#### Returns

`string`

***

### buildFromSourceMap()

> `static` **buildFromSourceMap**(`sourceMap`, `includeUnavailableSourceFiles`): `SourceCFGs`

Defined in: [src/cfg/source\_cfg.ts:368](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/cfg/source_cfg.ts#L368)

#### Parameters

##### sourceMap

[`SourceMap`](SourceMap.md)

##### includeUnavailableSourceFiles

`boolean` = `true`

#### Returns

`SourceCFGs`
