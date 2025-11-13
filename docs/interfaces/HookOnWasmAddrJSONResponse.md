[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / HookOnWasmAddrJSONResponse

# Interface: HookOnWasmAddrJSONResponse

Defined in: [src/runtimes/wasmito\_vm/requests/hook\_on\_wasm\_addr\_request.ts:32](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request.ts#L32)

## Extends

- [`RequestMessage`](RequestMessage.md)

## Extended by

- [`HookOnWasmAddrResponse`](HookOnWasmAddrResponse.md)
- [`RemoveHookOnWasmAddrResponse`](RemoveHookOnWasmAddrResponse.md)

## Properties

### error\_code?

> `optional` **error\_code**: `number`

Defined in: [src/runtimes/request\_interface.ts:57](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L57)

#### Inherited from

[`RequestMessage`](RequestMessage.md).[`error_code`](RequestMessage.md#error_code)

***

### interrupt

> **interrupt**: [`Instruction`](../enumerations/Instruction.md)

Defined in: [src/runtimes/request\_interface.ts:55](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L55)

#### Inherited from

[`RequestMessage`](RequestMessage.md).[`interrupt`](RequestMessage.md#interrupt)

***

### responseType

> **responseType**: [`ResponseType`](../enumerations/ResponseType.md)

Defined in: [src/runtimes/request\_interface.ts:56](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L56)

#### Inherited from

[`RequestMessage`](RequestMessage.md).[`responseType`](RequestMessage.md#responsetype)

***

### sub?

> `optional` **sub**: `any`

Defined in: [src/runtimes/request\_interface.ts:58](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/runtimes/request_interface.ts#L58)

#### Inherited from

[`RequestMessage`](RequestMessage.md).[`sub`](RequestMessage.md#sub)
