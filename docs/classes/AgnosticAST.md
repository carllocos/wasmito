[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / AgnosticAST

# Class: AgnosticAST

Defined in: [src/ast/angostic-ast.ts:15](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/ast/angostic-ast.ts#L15)

## Constructors

### Constructor

> **new AgnosticAST**(`source`, `langConfig`): `AgnosticAST`

Defined in: [src/ast/angostic-ast.ts:21](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/ast/angostic-ast.ts#L21)

#### Parameters

##### source

`string`

##### langConfig

[`LanguageConfiguration`](../interfaces/LanguageConfiguration.md)

#### Returns

`AgnosticAST`

## Properties

### source

> `readonly` **source**: `string`

Defined in: [src/ast/angostic-ast.ts:16](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/ast/angostic-ast.ts#L16)

***

### targetLanguage

> `readonly` **targetLanguage**: [`LanguageConfiguration`](../interfaces/LanguageConfiguration.md)

Defined in: [src/ast/angostic-ast.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/ast/angostic-ast.ts#L17)

## Accessors

### ast

#### Get Signature

> **get** **ast**(): `Tree`

Defined in: [src/ast/angostic-ast.ts:29](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/ast/angostic-ast.ts#L29)

##### Returns

`Tree`

## Methods

### buildAST()

> **buildAST**(): `Promise`\<`void`\>

Defined in: [src/ast/angostic-ast.ts:83](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/ast/angostic-ast.ts#L83)

#### Returns

`Promise`\<`void`\>

***

### mostSpecialisedNode()

> **mostSpecialisedNode**(`lineNr`, `colNr`): `Node` \| `undefined`

Defined in: [src/ast/angostic-ast.ts:44](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/ast/angostic-ast.ts#L44)

Method that searches for a node in the AST that has the smalles range wheren SourceCodeLocation (lineNr,colNr) fits
a.k.a. the most specific node

#### Parameters

##### lineNr

`number`

line nr of the source code location

##### colNr

`number`

columnh nr of the source Code location

#### Returns

`Node` \| `undefined`

the most specific node or undefined if none is found

***

### nextNode()

> **nextNode**(`lineNr`, `colNr`): `Node` \| `undefined`

Defined in: [src/ast/angostic-ast.ts:61](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/ast/angostic-ast.ts#L61)

Method that returns the sibling of the mostspecificnode associated with position (lineNr, colNr).
If no sibling is available it will go to the next sibling of the parent and return the most inner child

Method assumes that current source location (lineNr, colNr) does not change the control flow.
AND
Method assumes that the control flow follows the tree

#### Parameters

##### lineNr

`number`

##### colNr

`number`

#### Returns

`Node` \| `undefined`
