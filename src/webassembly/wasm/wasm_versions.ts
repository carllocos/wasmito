import {
  WasmOpcodeCallIndirect,
  WasmOpcodeDrop,
  WasmOpcodeElse,
  WasmOpcodeEnd,
  WasmOpcodeF64ReinterpretI64,
  WasmOpcodeGetLocal,
  WasmOpcodeI32Load,
  WasmOpcodeSelect,
  WasmOpcodeSetGlobal,
  WasmOpcodeUnreachable,
} from './wasm_opcode';

export function IsOpcodeWasmVersion1(opcode: number): boolean {
  // To check if opcode is Wasm version 1 we need to check if the opcode belongs to the ranges as described in
  // the official wasm spec https://webassembly.github.io/mutable-global/core/appendix/index-instructions.html
  return (
    (WasmOpcodeUnreachable <= opcode && opcode <= WasmOpcodeElse) ||
    (WasmOpcodeEnd <= opcode && opcode <= WasmOpcodeCallIndirect) ||
    (WasmOpcodeDrop <= opcode && opcode <= WasmOpcodeSelect) ||
    (WasmOpcodeGetLocal <= opcode && opcode <= WasmOpcodeSetGlobal) ||
    (WasmOpcodeI32Load <= opcode && opcode <= WasmOpcodeF64ReinterpretI64)
  );
}
