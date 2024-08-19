import { WASMOpcodeNumber } from './wasm_opcode';

export function IsOpcodeWasmVersion1(opcode: number): boolean {
  // To check if opcode is Wasm version 1 we need to check if the opcode belongs to the ranges as described in
  // the official wasm spec https://webassembly.github.io/mutable-global/core/appendix/index-instructions.html
  return (
    (WASMOpcodeNumber.Unreachable <= opcode &&
      opcode <= WASMOpcodeNumber.Else) ||
    (WASMOpcodeNumber.End <= opcode &&
      opcode <= WASMOpcodeNumber.Call_indirect) ||
    (WASMOpcodeNumber.Drop <= opcode && opcode <= WASMOpcodeNumber.Select) ||
    (WASMOpcodeNumber.Get_local <= opcode &&
      opcode <= WASMOpcodeNumber.Set_global) ||
    (WASMOpcodeNumber.I32Load <= opcode &&
      opcode <= WASMOpcodeNumber.F64Reinterpret_I64)
  );
}
