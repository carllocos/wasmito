import { PlaceholderType, WasmType } from './opcode_type';

export enum WASMOpcodeNumber {
  Unreachable = 0x00,
  Nop = 1,
  Block = 0x02, // block
  Loop = 0x03, // loop
  If = 0x04, // if
  Else = 0x05, // else
  End = 0x0b, // end
  Br = 0x0c, // br
  Br_if = 0x0d, // br_if
  Br_table = 0x0e, // br_table
  Return = 0x0f, // return
  Call = 0x10, // call
  Call_indirect = 0x11, // call_indirect
  Drop = 0x1a, // drop
  Select = 0x1b, // select
  Get_local = 0x20, // get_local
  Set_local = 0x21, // set_local
  Tee_local = 0x22, // tee_local
  Get_global = 0x23, // get_global
  Set_global = 0x24, // set_global

  I32Load = 0x28,
  I64Load = 0x29,
  F32Load = 0x2a,
  F64Load = 0x2b,
  I32Load8Signed = 0x2c,
  I32Load8Unsigned = 0x2d,
  I32Load16Signed = 0x2e,
  I32Load16Unsigned = 0x2f,
  I64Load8Signed = 0x30,
  I64Load8Unsigned = 0x31,
  I64Load16Signed = 0x32,
  I64Load16Unsigned = 0x33,
  I64Load32Signed = 0x34,
  I64Load32Unsigned = 0x35,

  I32Store = 0x36,
  I64Store = 0x37,
  F32Store = 0x38,
  F64Store = 0x39,
  I32Store8 = 0x3a,
  I32Store16 = 0x3b,
  I64Store8 = 0x3c,
  I64Store16 = 0x3d,
  I64Store32 = 0x3e,
  CurrentMemory = 0x3f,

  GrowMemory = 0x40,

  I32Const = 0x41, // i32.const
  I64Const = 0x42, // i64.const
  F32Const = 0x43, // f32.const
  F64Const = 0x44, // f64.const

  I32Eq = 0x46,
  I32Eqz = 0x45,
  I32Ne = 0x47,
  I32LTSigned = 0x48,
  I32LTUnsigned = 0x49,
  I32GTSigned = 0x4a,
  I32GTUnsigned = 0x4b,
  I32LESigned = 0x4c,
  I32LEUnsigned = 0x4d,
  I32GESigned = 0x4e,
  I32GEUnsinged = 0x4f,

  I32CLZ = 0x67,
  I32CTZ = 0x68,
  I32POPCNT = 0x69,

  I32Add = 0x6a,
  I32Sub = 0x6b,
  I32Mul = 0x6c,
  I32DivSigned = 0x6d,
  I32DivUnsigned = 0x6e,
  I32RemSigned = 0x6f,
  I32RemUnsigned = 0x70,
  I32And = 0x71,
  I32Or = 0x72,
  I32Xor = 0x73,
  I32Shl = 0x74,
  I32ShrSigned = 0x75,
  I32ShrUnsigned = 0x76,
  I32ROTL = 0x77,
  I32ROTR = 0x78,

  I64Add = 0x7c,
  I64Sub = 0x7d,
  I64Mul = 0x7e,
  I64DivSigned = 0x7f,
  I64DivUnsigned = 0x80,
  I64RemSigned = 0x81,
  I64RemUnsigned = 0x82,
  I64And = 0x83,
  I64Or = 0x84,
  I64Xor = 0x85,
  I64SHL = 0x86,
  I64SHR_Signed = 0x87,
  I64SHR_Unsigned = 0x88,
  I64Rotl = 0x89,
  I64Rotr = 0x8a,

  I64CLZ = 0x79,
  I64CTZ = 0x7a,
  I64POPCNT = 0x7b,

  I64Eqz = 0x50,
  I64Eq = 0x51,
  I64Neq = 0x52,
  I64LTSigned = 0x53,
  I64LTUnsigned = 0x54,
  I64GTSigned = 0x55,
  I64GTUnsigned = 0x56,
  I64LESigned = 0x57,
  I64LEUnsigned = 0x58,
  I64GESigned = 0x59,
  I64GEUnsigned = 0x5a,

  F32Add = 0x92,
  F32Sub = 0x93,
  F32Mul = 0x94,
  F32Div = 0x95,
  F32Min = 0x96,
  F32Max = 0x97,
  F32CopySign = 0x98,
  F32Abs = 0x8b,
  F32Neg = 0x8c,
  F32Ceil = 0x8d,
  F32Floor = 0x8e,
  F32Trunc = 0x8f,
  F32Nearest = 0x90,
  F32Sqrt = 0x91,

  F32Eq = 0x5b,
  F32Neq = 0x5c,
  F32LT = 0x5d,
  F32GT = 0x5e,
  F32LE = 0x5f,
  F32GE = 0x60,

  F64Eq = 0x61,
  F64Neq = 0x62,
  F64LT = 0x63,
  F64GT = 0x64,
  F64Leq = 0x65,
  F64Geq = 0x66,

  F64Add = 0xa0,
  F64Sub = 0xa1,
  F64Mul = 0xa2,
  F64Div = 0xa3,
  F64Min = 0xa4,
  F64Max = 0xa5,
  F64CopySing = 0xa6,

  F64Abs = 0x99,
  F64Neg = 0x9a,
  F64Ceil = 0x9b,
  F64Floor = 0x9c,
  F64Trunc = 0x9d,
  F64Nearest = 0x9e,
  F64Sqrt = 0x9f,

  I32Wrap_I64 = 0xa7,
  I32Trunc_s_F32 = 0xa8,
  I32Trunc_u_F32 = 0xa9,
  I32Trunc_s_F64 = 0xaa,
  I32Trunc_u_F64 = 0xab,

  I64Extend_s_I32 = 0xac,
  I64Extend_u_I32 = 0xad,
  I64Trunc_s_F32 = 0xae,
  I64Trunc_u_F32 = 0xaf,
  I64Trunc_s_F64 = 0xb0,
  I64Trunc_u_F64 = 0xb1,

  F32Convert_s_I32 = 0xb2,
  F32Convert_u_I32 = 0xb3,
  F32Convert_s_I64 = 0xb4,
  F32Convert_u_I64 = 0xb5,
  F32Demote_F64 = 0xb6,

  F64Convert_s_I32 = 0xb7,
  F64Convert_u_I32 = 0xb8,

  F64Convert_s_I64 = 0xb9,
  F64Convert_u_I64 = 0xba,
  F64Promote_F32 = 0xbb,

  I32Reinterpret_F32 = 0xbc,
  I64Reinterpret_F64 = 0xbd,
  F32Reinterpret_I32 = 0xbe,
  F64Reinterpret_I64 = 0xbf,
}

export function typeFromWasmOpcode(
  opcode: WASMOpcodeNumber,
): WasmType | undefined {
  switch (opcode) {
    // void->void
    case WASMOpcodeNumber.Unreachable:
    case WASMOpcodeNumber.Nop:
    case WASMOpcodeNumber.Block:
    case WASMOpcodeNumber.Loop:
    case WASMOpcodeNumber.Else:
    case WASMOpcodeNumber.End:
    case WASMOpcodeNumber.Return:
    case WASMOpcodeNumber.Br:
      return new WasmType(0, 0);
    case WASMOpcodeNumber.If:
    case WASMOpcodeNumber.Br_if:
    case WASMOpcodeNumber.Br_table:
    case WASMOpcodeNumber.Drop:
      return new WasmType(1, 0);
    case WASMOpcodeNumber.Select:
    case WASMOpcodeNumber.Set_local:
    case WASMOpcodeNumber.Tee_local:
    case WASMOpcodeNumber.Set_global:
      return new WasmType(1, 0);
    case WASMOpcodeNumber.Call:
    case WASMOpcodeNumber.Call_indirect:
      return new PlaceholderType();

    // void -> a result
    case WASMOpcodeNumber.I32Const:
    case WASMOpcodeNumber.I64Const:
    case WASMOpcodeNumber.F32Const:
    case WASMOpcodeNumber.F64Const:
    case WASMOpcodeNumber.Get_global:
    case WASMOpcodeNumber.Get_local:
    case WASMOpcodeNumber.CurrentMemory:
      return new WasmType(0, 1);

    // binary operators that do not produce a result
    case WASMOpcodeNumber.I32Store:
    case WASMOpcodeNumber.I64Store:
    case WASMOpcodeNumber.F32Store:
    case WASMOpcodeNumber.F64Store:
    case WASMOpcodeNumber.I32Store8:
    case WASMOpcodeNumber.I32Store16:
    case WASMOpcodeNumber.I64Store8:
    case WASMOpcodeNumber.I64Store16:
    case WASMOpcodeNumber.I64Store32:
      return new WasmType(2, 0);

    // binary operators that produce one result
    case WASMOpcodeNumber.I32Add:
    case WASMOpcodeNumber.I32Sub:
    case WASMOpcodeNumber.I32Mul:
    case WASMOpcodeNumber.I32DivSigned:
    case WASMOpcodeNumber.I32DivUnsigned:
    case WASMOpcodeNumber.I32RemSigned:
    case WASMOpcodeNumber.I32RemUnsigned:
    case WASMOpcodeNumber.I32And:
    case WASMOpcodeNumber.I32Or:
    case WASMOpcodeNumber.I32Xor:
    case WASMOpcodeNumber.I32Shl:
    case WASMOpcodeNumber.I32ShrSigned:
    case WASMOpcodeNumber.I32ShrUnsigned:
    case WASMOpcodeNumber.I32ROTL:
    case WASMOpcodeNumber.I32ROTR:
    case WASMOpcodeNumber.I32Eq:
    case WASMOpcodeNumber.I32Ne:
    case WASMOpcodeNumber.I32LTSigned:
    case WASMOpcodeNumber.I32LTUnsigned:
    case WASMOpcodeNumber.I32GTSigned:
    case WASMOpcodeNumber.I32GTUnsigned:
    case WASMOpcodeNumber.I32LESigned:
    case WASMOpcodeNumber.I32LEUnsigned:
    case WASMOpcodeNumber.I32GESigned:
    case WASMOpcodeNumber.I32GEUnsinged:
    case WASMOpcodeNumber.F32Add:
    case WASMOpcodeNumber.F32Sub:
    case WASMOpcodeNumber.F32Mul:
    case WASMOpcodeNumber.F32Div:
    case WASMOpcodeNumber.F32Min:
    case WASMOpcodeNumber.F32Max:
    case WASMOpcodeNumber.F32CopySign:
    case WASMOpcodeNumber.F64Eq:
    case WASMOpcodeNumber.F64Neq:
    case WASMOpcodeNumber.F64LT:
    case WASMOpcodeNumber.F64GT:
    case WASMOpcodeNumber.F64Leq:
    case WASMOpcodeNumber.F64Geq:
    case WASMOpcodeNumber.F64Add:
    case WASMOpcodeNumber.F64Sub:
    case WASMOpcodeNumber.F64Mul:
    case WASMOpcodeNumber.F64Div:
    case WASMOpcodeNumber.F64Min:
    case WASMOpcodeNumber.F64Max:
    case WASMOpcodeNumber.F64CopySing:
    case WASMOpcodeNumber.I64Add:
    case WASMOpcodeNumber.I64Sub:
    case WASMOpcodeNumber.I64Mul:
    case WASMOpcodeNumber.I64DivSigned:
    case WASMOpcodeNumber.I64DivUnsigned:
    case WASMOpcodeNumber.I64RemSigned:
    case WASMOpcodeNumber.I64RemUnsigned:
    case WASMOpcodeNumber.I64And:
    case WASMOpcodeNumber.I64Or:
    case WASMOpcodeNumber.I64Xor:
    case WASMOpcodeNumber.I64SHL:
    case WASMOpcodeNumber.I64SHR_Signed:
    case WASMOpcodeNumber.I64SHR_Unsigned:
    case WASMOpcodeNumber.I64Rotl:
    case WASMOpcodeNumber.I64Rotr:
    case WASMOpcodeNumber.I64Eq:
    case WASMOpcodeNumber.I64Neq:
    case WASMOpcodeNumber.I64LTSigned:
    case WASMOpcodeNumber.I64LTUnsigned:
    case WASMOpcodeNumber.I64GTSigned:
    case WASMOpcodeNumber.I64GTUnsigned:
    case WASMOpcodeNumber.I64LESigned:
    case WASMOpcodeNumber.I64LEUnsigned:
    case WASMOpcodeNumber.I64GESigned:
    case WASMOpcodeNumber.I64GEUnsigned:
    case WASMOpcodeNumber.F32Eq:
    case WASMOpcodeNumber.F32Neq:
    case WASMOpcodeNumber.F32LT:
    case WASMOpcodeNumber.F32GT:
    case WASMOpcodeNumber.F32LE:
    case WASMOpcodeNumber.F32GE:
      return new WasmType(2, 1);

    // unary operators that produce one result
    case WASMOpcodeNumber.I32Wrap_I64:
    case WASMOpcodeNumber.I32Trunc_s_F32:
    case WASMOpcodeNumber.I32Trunc_u_F32:
    case WASMOpcodeNumber.I32Trunc_s_F64:
    case WASMOpcodeNumber.I32Trunc_u_F64:
    case WASMOpcodeNumber.I64Extend_s_I32:
    case WASMOpcodeNumber.I64Extend_u_I32:
    case WASMOpcodeNumber.I64Trunc_s_F32:
    case WASMOpcodeNumber.I64Trunc_u_F32:
    case WASMOpcodeNumber.I64Trunc_s_F64:
    case WASMOpcodeNumber.I64Trunc_u_F64:
    case WASMOpcodeNumber.F32Convert_s_I32:
    case WASMOpcodeNumber.F32Convert_u_I32:
    case WASMOpcodeNumber.F32Convert_s_I64:
    case WASMOpcodeNumber.F32Convert_u_I64:
    case WASMOpcodeNumber.F32Demote_F64:
    case WASMOpcodeNumber.F64Convert_s_I32:
    case WASMOpcodeNumber.F64Convert_u_I32:
    case WASMOpcodeNumber.F64Convert_s_I64:
    case WASMOpcodeNumber.F64Convert_u_I64:
    case WASMOpcodeNumber.F64Promote_F32:
    case WASMOpcodeNumber.I32Reinterpret_F32:
    case WASMOpcodeNumber.I64Reinterpret_F64:
    case WASMOpcodeNumber.F32Reinterpret_I32:
    case WASMOpcodeNumber.F64Reinterpret_I64:
    case WASMOpcodeNumber.F32Abs:
    case WASMOpcodeNumber.F32Neg:
    case WASMOpcodeNumber.F32Ceil:
    case WASMOpcodeNumber.F32Floor:
    case WASMOpcodeNumber.F32Trunc:
    case WASMOpcodeNumber.F32Nearest:
    case WASMOpcodeNumber.F32Sqrt:
    case WASMOpcodeNumber.F64Abs:
    case WASMOpcodeNumber.F64Neg:
    case WASMOpcodeNumber.F64Ceil:
    case WASMOpcodeNumber.F64Floor:
    case WASMOpcodeNumber.F64Trunc:
    case WASMOpcodeNumber.F64Nearest:
    case WASMOpcodeNumber.F64Sqrt:
    case WASMOpcodeNumber.I32Eqz:
    case WASMOpcodeNumber.I64Eqz:
    case WASMOpcodeNumber.I32CLZ:
    case WASMOpcodeNumber.I32CTZ:
    case WASMOpcodeNumber.I32POPCNT:
    case WASMOpcodeNumber.I64CLZ:
    case WASMOpcodeNumber.I64CTZ:
    case WASMOpcodeNumber.I64POPCNT:
    case WASMOpcodeNumber.I32Load:
    case WASMOpcodeNumber.I64Load:
    case WASMOpcodeNumber.F32Load:
    case WASMOpcodeNumber.F64Load:
    case WASMOpcodeNumber.I32Load8Signed:
    case WASMOpcodeNumber.I32Load8Unsigned:
    case WASMOpcodeNumber.I32Load16Signed:
    case WASMOpcodeNumber.I32Load16Unsigned:
    case WASMOpcodeNumber.I64Load8Signed:
    case WASMOpcodeNumber.I64Load8Unsigned:
    case WASMOpcodeNumber.I64Load16Signed:
    case WASMOpcodeNumber.I64Load16Unsigned:
    case WASMOpcodeNumber.I64Load32Signed:
    case WASMOpcodeNumber.I64Load32Unsigned:
    case WASMOpcodeNumber.GrowMemory:
      return new WasmType(1, 1);
    default:
      return undefined;
  }
}

export function wasmOpcodeFromNr(
  opcodeNumber: number,
): WASMOpcodeNumber | undefined {
  const has = Object.values(WASMOpcodeNumber).includes(
    opcodeNumber as WASMOpcodeNumber,
  );
  if (has) {
    return opcodeNumber;
  } else {
    return undefined;
  }
}

export function wasmOpcodeFromStr(opcode: string): WASMOpcodeNumber {
  switch (opcode) {
    case 'unreachable':
      return WASMOpcodeNumber.Unreachable;
    case 'block':
      return WASMOpcodeNumber.Block;
    case 'loop':
      return WASMOpcodeNumber.Loop;
    case 'end': // end
      return WASMOpcodeNumber.End;
    case 'return': // return
      return WASMOpcodeNumber.Return;
    case 'call': // call
      return WASMOpcodeNumber.Call;
    case 'drop': // drop
      return WASMOpcodeNumber.Drop;
    case 'get_local': // get_local
      return WASMOpcodeNumber.Get_local;
    case 'set_local': // set_local
      return WASMOpcodeNumber.Set_local;
    case 'get_global': // get_global
      return WASMOpcodeNumber.Get_global;
    case 'select':
      return WASMOpcodeNumber.Select;
    case 'grow_memory':
      return WASMOpcodeNumber.GrowMemory;
    case 'current_memory':
      return WASMOpcodeNumber.CurrentMemory;

    case 'u32.store':
    case 'i32.store':
      return WASMOpcodeNumber.I32Store;
    case 'u32.store8':
    case 'i32.store8':
      return WASMOpcodeNumber.I32Store8;
    case 'i32.load8_u':
    case 'u32.load8_u':
      return WASMOpcodeNumber.I32Load8Unsigned;
    case 'i32.load8_s':
    case 'u32.load8_s':
      return WASMOpcodeNumber.I32Load8Signed;
    case 'u32.store16':
    case 'i32.store16':
      return WASMOpcodeNumber.I32Store16;
    case 'i32.load16_u':
    case 'u32.load16_u':
      return WASMOpcodeNumber.I32Load16Unsigned;
    case 'f32.store':
      return WASMOpcodeNumber.F32Store;
    case 'f64.store':
      return WASMOpcodeNumber.F64Store;

    case 'u64.store':
    case 'i64.store':
      return WASMOpcodeNumber.I64Store;
    case 'u64.store8':
    case 'i64.store8':
      return WASMOpcodeNumber.I64Store8;
    case 'u64.store16':
    case 'i64.store16':
      return WASMOpcodeNumber.I64Store16;
    case 'u64.store32':
    case 'i64.store32':
      return WASMOpcodeNumber.I64Store32;

    case 'i32.const': // i32.const
      return WASMOpcodeNumber.I32Const;
    case 'i64.const': // i64.const
      return WASMOpcodeNumber.I64Const;
    case 'f32.const': // f32.const
      return WASMOpcodeNumber.F32Const;
    case 'f64.const': // f64.const
      return WASMOpcodeNumber.F64Const;

    case 'i64.add':
      return WASMOpcodeNumber.I64Add;
    case 'i64.sub':
      return WASMOpcodeNumber.I64Sub;
    case 'i64.mul':
      return WASMOpcodeNumber.I64Mul;
    case 'i64.div_s':
      return WASMOpcodeNumber.I64DivSigned;
    case 'i64.div_u':
      return WASMOpcodeNumber.I64DivUnsigned;
    case 'i64.clz':
      return WASMOpcodeNumber.I64CLZ;
    case 'i64.ctz':
      return WASMOpcodeNumber.I64CTZ;
    case 'i64.popctn':
      return WASMOpcodeNumber.I64POPCNT;
    case 'i64.eq':
      return WASMOpcodeNumber.I64Eq;
    case 'i64.eqz':
      return WASMOpcodeNumber.I64Eqz;
    case 'i64.ne':
      return WASMOpcodeNumber.I64Neq;
    case 'i64.and':
      return WASMOpcodeNumber.I64And;
    case 'i64.or':
      return WASMOpcodeNumber.I64Or;
    case 'i64.shl':
      return WASMOpcodeNumber.I64SHL;
    case 'i64.shr_u':
      return WASMOpcodeNumber.I64SHR_Unsigned;
    case 'i64.le_u':
      return WASMOpcodeNumber.I64LEUnsigned;
    case 'i64.ge_u':
      return WASMOpcodeNumber.I64GEUnsigned;
    case 'i64.gt_s':
      return WASMOpcodeNumber.I64GTSigned;
    case 'i64.gt_u':
      return WASMOpcodeNumber.I64GTUnsigned;
    case 'i64.reinterpret/f64':
      return WASMOpcodeNumber.I64Reinterpret_F64;
    case 'i64.extend_u/i32':
      return WASMOpcodeNumber.I64Extend_u_I32;
    case 'i64.load':
    case 'u64.load':
      return WASMOpcodeNumber.I64Load;
    case 'i64.load32_s':
    case 'u64.load32_s':
      return WASMOpcodeNumber.I64Load32Signed;
    case 'i64.load32_u':
    case 'u64.load32_u':
      return WASMOpcodeNumber.I64Load32Unsigned;

    case 'i32.and':
      return WASMOpcodeNumber.I32And;
    case 'i32.add':
      return WASMOpcodeNumber.I32Add;
    case 'i32.sub':
      return WASMOpcodeNumber.I32Sub;
    case 'i32.ne':
      return WASMOpcodeNumber.I32Ne;
    case 'i32.eq':
      return WASMOpcodeNumber.I32Eq;
    case 'i32.eqz':
      return WASMOpcodeNumber.I32Eqz;
    case 'i32.clz':
      return WASMOpcodeNumber.I32CLZ;
    case 'i32.ctz':
      return WASMOpcodeNumber.I32CTZ;
    case 'i32.popctn':
      return WASMOpcodeNumber.I32POPCNT;
    case 'i32.gt_s':
      return WASMOpcodeNumber.I32GTSigned;
    case 'i32.ge_u':
      return WASMOpcodeNumber.I32GEUnsinged;
    case 'i32.gt_u':
      return WASMOpcodeNumber.I32GTUnsigned;
    case 'i32.lt_u':
      return WASMOpcodeNumber.I32LTUnsigned;
    case 'i32.le_u':
      return WASMOpcodeNumber.I32LEUnsigned;
    case 'i32.le_s':
      return WASMOpcodeNumber.I32LESigned;
    // case 'i32.lt_e':
    //   return WASMOpcodeNumber.I32LEUnsigned;
    case 'i32.lt_s':
      return WASMOpcodeNumber.I32LTSigned;
    case 'i32.shl':
      return WASMOpcodeNumber.I32Shl;
    case 'i32.shr_u':
      return WASMOpcodeNumber.I32ShrUnsigned;
    case 'i32.xor':
      return WASMOpcodeNumber.I32Xor;
    case 'i32.or':
      return WASMOpcodeNumber.I32Or;
    case 'i32.mul':
      return WASMOpcodeNumber.I32Mul;
    case 'i32.div_s':
      return WASMOpcodeNumber.I32DivSigned;
    case 'i32.div_u':
      return WASMOpcodeNumber.I32DivUnsigned;
    case 'i32.rem_u':
      return WASMOpcodeNumber.I32RemUnsigned;
    case 'i32.rotl':
      return WASMOpcodeNumber.I32ROTL;
    case 'i32.rotr':
      return WASMOpcodeNumber.I32ROTR;
    case 'i32.wrap/i64':
      return WASMOpcodeNumber.I32Wrap_I64;

    case 'f32.add':
      return WASMOpcodeNumber.F32Add;
    case 'f32.sub':
      return WASMOpcodeNumber.F32Sub;
    case 'f32.mul':
      return WASMOpcodeNumber.F32Mul;
    case 'f32.div':
      return WASMOpcodeNumber.F32Div;
    case 'f32.abs':
      return WASMOpcodeNumber.F32Abs;
    case 'f32.lt':
      return WASMOpcodeNumber.F32LT;
    case 'f32.gt':
      return WASMOpcodeNumber.F32GT;
    case 'f32.demote/f64':
      return WASMOpcodeNumber.F32Demote_F64;

    case 'f64.add':
      return WASMOpcodeNumber.F64Add;
    case 'f64.sub':
      return WASMOpcodeNumber.F64Sub;
    case 'f64.mul':
      return WASMOpcodeNumber.F64Mul;
    case 'f64.div':
      return WASMOpcodeNumber.F64Div;
    case 'f64.abs':
      return WASMOpcodeNumber.F64Abs;
    case 'f64.eq':
      return WASMOpcodeNumber.F64Eq;
    case 'f64.ne':
      return WASMOpcodeNumber.F64Neq;
    case 'f64.trunc':
      return WASMOpcodeNumber.F64Trunc;
    case 'f64.copysign':
      return WASMOpcodeNumber.F64CopySing;
    case 'f64.convert_u/i32':
      return WASMOpcodeNumber.F64Convert_u_I32;
    case 'f64.reinterpret/i64':
      return WASMOpcodeNumber.F64Reinterpret_I64;

    case 'i32.trunc_s/f32':
      return WASMOpcodeNumber.I32Trunc_s_F32;
    case 'f32.convert_s/i32':
      return WASMOpcodeNumber.F32Convert_s_I32;

    case 'u32.load':
    case 'i32.load':
      return WASMOpcodeNumber.I32Load;
    default:
      throw new Error(`unsupported opcode ${opcode}`);
  }
}

export function WasmOpcodeHasImmediate(opcode: WASMOpcodeNumber): boolean {
  switch (opcode) {
    case WASMOpcodeNumber.I32Const:
    case WASMOpcodeNumber.I64Const:
    case WASMOpcodeNumber.F32Const:
    case WASMOpcodeNumber.F64Const:
    case WASMOpcodeNumber.Get_global:
    case WASMOpcodeNumber.Get_local:
    case WASMOpcodeNumber.Set_global:
    case WASMOpcodeNumber.Br:
    case WASMOpcodeNumber.Call:
      return true;
    default:
      return false;
  }
}
