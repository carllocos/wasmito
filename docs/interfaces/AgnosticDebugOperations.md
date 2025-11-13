[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / AgnosticDebugOperations

# Interface: AgnosticDebugOperations

Defined in: [src/language\_adaptors/debug\_operations.ts:22](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/debug_operations.ts#L22)

## Properties

### stepIn

> **stepIn**: [`DebugOperation`](../type-aliases/DebugOperation.md)

Defined in: [src/language\_adaptors/debug\_operations.ts:27](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/debug_operations.ts#L27)

***

### stepIteration

> **stepIteration**: [`DebugOperation`](../type-aliases/DebugOperation.md)

Defined in: [src/language\_adaptors/debug\_operations.ts:48](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/debug_operations.ts#L48)

***

### stepOut

> **stepOut**: [`DebugOperation`](../type-aliases/DebugOperation.md)

Defined in: [src/language\_adaptors/debug\_operations.ts:40](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/debug_operations.ts#L40)

***

### stepOver

> **stepOver**: [`DebugOperation`](../type-aliases/DebugOperation.md)

Defined in: [src/language\_adaptors/debug\_operations.ts:34](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/debug_operations.ts#L34)

***

### stepRecursiveCall

> **stepRecursiveCall**: [`DebugOperation`](../type-aliases/DebugOperation.md)

Defined in: [src/language\_adaptors/debug\_operations.ts:62](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/debug_operations.ts#L62)

stepRecursiveCall
This debug operation is supposed to be called from within a function that is recursively called.
If executed, the debug operation returns the entry nodes of this current function.

***

### stepUntilCall

> **stepUntilCall**: [`DebugOperation`](../type-aliases/DebugOperation.md)

Defined in: [src/language\_adaptors/debug\_operations.ts:54](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/language_adaptors/debug_operations.ts#L54)

stepUntilCall: Debug operation that continues execution until just before a function call is reached.
