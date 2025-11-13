[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / CFGToolAPI

# Interface: CFGToolAPI

Defined in: [src/tool\_api/cfg\_tool\_api.ts:5](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/tool_api/cfg_tool_api.ts#L5)

## Properties

### onNodeEntry()

> **onNodeEntry**: (`node`, `vm`, `hooks`, `timeout`) => `Promise`\<`boolean`\>

Defined in: [src/tool\_api/cfg\_tool\_api.ts:6](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/tool_api/cfg_tool_api.ts#L6)

#### Parameters

##### node

[`SourceCFGNode`](SourceCFGNode.md)

##### vm

[`WasmitoBackendVM`](../classes/WasmitoBackendVM.md)

##### hooks

[`Hook`](../classes/Hook.md)[]

##### timeout

`number`

#### Returns

`Promise`\<`boolean`\>
