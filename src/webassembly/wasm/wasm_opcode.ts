import { PlaceholderType, WasmType } from './opcode_type';

export type WasmOpcodeName = string;
export type WasmOpcode = [WasmOpcodeName, number, number | undefined, WasmType];

export function getOpcodeName(op: WasmOpcode): string {
  return op[0];
}

export function getWasmOpcodeNr(op: WasmOpcode): number {
  return op[1];
}

export function getWasmSubOpcodeNr(op: WasmOpcode): number | undefined {
  return op[2];
}

export function getOpcodeType(op: WasmOpcode): WasmType {
  return op[3];
}

export function equalOpcodes(op1: WasmOpcode, op2: WasmOpcode): boolean {
  // TODO fix check
  return (
    getWasmOpcodeNr(op1) === getWasmOpcodeNr(op2) &&
    getWasmSubOpcodeNr(op1) === getWasmSubOpcodeNr(op2)
  );
}

export const WasmOpcodeUnreachable = 0x00;
export const WasmOpcodeI32Const = 0x41;
export const WasmOpcodeI64Const = 0x42;
export const WasmOpcodeF32Const = 0x43;
export const WasmOpcodeF64Const = 0x44;
export const WasmOpcodeLoop = 0x03;
export const WasmOpcodeBrIf = 0x0d;
export const WasmOpcodeBr = 0x0c;
export const WasmOpcodeBrTable = 0x0e;
export const WasmOpcodeReturn = 0x0f;
export const WasmOpcodeIf = 0x04;
export const WasmOpcodeElse = 0x05;
export const WasmOpcodeEnd = 0x0b;
export const WasmOpcodeBlock = 0x02;
export const WasmOpcodeCall = 0x10;
export const WasmOpcodeCallIndirect = 0x11;
export const WasmOpcodeGetLocal = 0x20;
export const WasmOpcodeSetLocal = 0x21;
export const WasmOpcodeDrop = 0x1a;
export const WasmOpcodeSelect = 0x1b;
export const WasmOpcodeGetGlobal = 0x23;
export const WasmOpcodeSetGlobal = 0x24;
export const WasmOpcodeI32Load = 0x28;
export const WasmOpcodeF64ReinterpretI64 = 0xbf;
export const WasmOpcodeTableSet = 0x26;

export namespace WasmCode {
  export const Unreachable: WasmOpcode = [
    'unreachable',
    WasmOpcodeUnreachable,
    undefined,
    new WasmType(0, 0),
  ];

  export const NOP: WasmOpcode = ['nop', 1, undefined, new WasmType(0, 0)];

  export const Block: WasmOpcode = [
    'block',
    WasmOpcodeBlock,
    undefined,
    new WasmType(0, 0),
  ];

  export const Loop: WasmOpcode = [
    'loop',
    WasmOpcodeLoop,
    undefined,
    new WasmType(0, 0),
  ];

  export const Call: WasmOpcode = [
    'call',
    WasmOpcodeCall,
    undefined,
    new PlaceholderType(),
  ]; // call
  export const CallIndirect: WasmOpcode = [
    'call_indirect',
    WasmOpcodeCallIndirect,
    undefined,
    new PlaceholderType(),
  ]; // call_indirect

  export const Drop: WasmOpcode = [
    'drop',
    WasmOpcodeDrop,
    undefined,
    new WasmType(1, 0),
  ]; // drop

  export const Select: WasmOpcode = [
    'select',
    WasmOpcodeSelect,
    undefined,
    new WasmType(1, 0),
  ]; // select

  export const LocalGet: WasmOpcode = [
    'get_local',
    WasmOpcodeGetLocal,
    undefined,
    new WasmType(0, 1),
  ]; // get_local

  export const LocalSet: WasmOpcode = [
    'set_local',
    WasmOpcodeSetLocal,
    undefined,
    new WasmType(1, 0),
  ]; // set_local

  export const LocalTee: WasmOpcode = [
    'tee_local',
    0x22,
    undefined,
    new WasmType(1, 0),
  ]; // tee_local

  export const I32Const: WasmOpcode = [
    'i32.const',
    WasmOpcodeI32Const,
    undefined,
    new WasmType(0, 1),
  ];

  export const I64Const: WasmOpcode = [
    'i64.const',
    WasmOpcodeI64Const,
    undefined,
    new WasmType(0, 1),
  ]; // i64.const

  export const F32Const: WasmOpcode = [
    'f32.const',
    WasmOpcodeF32Const,
    undefined,
    new WasmType(0, 1),
  ]; // f32.const

  export const F64Const: WasmOpcode = [
    'f64.const',
    WasmOpcodeF64Const,
    undefined,
    new WasmType(0, 1),
  ]; // f64.const

  // HERE start
  export const I32Eq: WasmOpcode = [
    'i32.eq',
    0x46,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32Eqz: WasmOpcode = [
    'i32.eqz',
    0x45,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32Ne: WasmOpcode = [
    'i32.ne',
    0x47,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32LtS: WasmOpcode = [
    'i32.lt_s',
    0x48,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32LtU: WasmOpcode = [
    'i32.lt_u',
    0x49,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32GtS: WasmOpcode = [
    'i32.gt_s',
    0x4a,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32GtU: WasmOpcode = [
    'i32.gt_u',
    0x4b,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32LeS: WasmOpcode = [
    'i32.le_s',
    0x4c,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32LeU: WasmOpcode = [
    'i32.le_u',
    0x4d,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32GeS: WasmOpcode = [
    'i32.ge_s',
    0x4e,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32GeU: WasmOpcode = [
    'i32.ge_u',
    0x4f,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32Clz: WasmOpcode = [
    'i32.clz',
    0x67,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32Ctz: WasmOpcode = [
    'i32.ctz',
    0x68,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32Popcnt: WasmOpcode = [
    'i32.popcnt',
    0x69,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32Add: WasmOpcode = [
    'i32.add',
    0x6a,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32Sub: WasmOpcode = [
    'i32.sub',
    0x6b,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32Mul: WasmOpcode = [
    'i32.mul',
    0x6c,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32DivS: WasmOpcode = [
    'i32.div_s',
    0x6d,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32DivU: WasmOpcode = [
    'i32.div_u',
    0x6e,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32RemS: WasmOpcode = [
    'i32.rem_s',
    0x6f,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32RemU: WasmOpcode = [
    'i32.rem_u',
    0x70,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32And: WasmOpcode = [
    'i32.and',
    0x71,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32Or: WasmOpcode = [
    'i32.or',
    0x72,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32Xor: WasmOpcode = [
    'i32.xor',
    0x73,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32Shl: WasmOpcode = [
    'i32.shl',
    0x74,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32ShrS: WasmOpcode = [
    'i32.shr_s',
    0x75,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32ShrU: WasmOpcode = [
    'i32.shr_u',
    0x76,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32Rotl: WasmOpcode = [
    'i32.rotl',
    0x77,
    undefined,
    new WasmType(2, 1),
  ];
  export const I32Rotr: WasmOpcode = [
    'i32.rotr',
    0x78,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64Add: WasmOpcode = [
    'i64.add',
    0x7c,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64Sub: WasmOpcode = [
    'i64.sub',
    0x7d,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64Mul: WasmOpcode = [
    'i64.mul',
    0x7e,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64DivS: WasmOpcode = [
    'i64.div_s',
    0x7f,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64DivU: WasmOpcode = [
    'i64.div_u',
    0x80,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64RemS: WasmOpcode = [
    'i64.rem_s',
    0x81,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64RemU: WasmOpcode = [
    'i64.rem_u',
    0x82,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64And: WasmOpcode = [
    'i64.and',
    0x83,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64Or: WasmOpcode = [
    'i64.or',
    0x84,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64Xor: WasmOpcode = [
    'i64.xor',
    0x85,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64Shl: WasmOpcode = [
    'i64.shl',
    0x86,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64ShrS: WasmOpcode = [
    'i64.shr_s',
    0x87,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64ShrU: WasmOpcode = [
    'i64.shr_u',
    0x88,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64Rotl: WasmOpcode = [
    'i64.rotl',
    0x89,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64Rotr: WasmOpcode = [
    'i64.rotr',
    0x8a,
    undefined,
    new WasmType(2, 1),
  ];

  export const I64Clz: WasmOpcode = [
    'i64.clz',
    0x79,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64Ctz: WasmOpcode = [
    'i64.ctz',
    0x7a,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64Popcnt: WasmOpcode = [
    'i64.popcnt',
    0x7b,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64Eqz: WasmOpcode = [
    'i64.eqz',
    0x50,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64Eq: WasmOpcode = [
    'i64.eq',
    0x51,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64Ne: WasmOpcode = [
    'i64.ne',
    0x52,
    undefined,
    new WasmType(2, 1),
  ];

  export const I64LtS: WasmOpcode = [
    'i64.lt_s',
    0x53,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64LtU: WasmOpcode = [
    'i64.lt_u',
    0x54,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64GtS: WasmOpcode = [
    'i64.gt_s',
    0x55,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64GtU: WasmOpcode = [
    'i64.gt_u',
    0x56,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64LeS: WasmOpcode = [
    'i64.le_s',
    0x57,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64LeU: WasmOpcode = [
    'i64.le_u',
    0x58,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64GeS: WasmOpcode = [
    'i64.ge_s',
    0x59,
    undefined,
    new WasmType(2, 1),
  ];
  export const I64GeU: WasmOpcode = [
    'i64.ge_u',
    0x5a,
    undefined,
    new WasmType(2, 1),
  ];

  export const F32Add: WasmOpcode = [
    'f32.add',
    0x92,
    undefined,
    new WasmType(2, 1),
  ];
  export const F32Sub: WasmOpcode = [
    'f32.sub',
    0x93,
    undefined,
    new WasmType(2, 1),
  ];
  export const F32Mul: WasmOpcode = [
    'f32.mul',
    0x94,
    undefined,
    new WasmType(2, 1),
  ];
  export const F32Div: WasmOpcode = [
    'f32.div',
    0x95,
    undefined,
    new WasmType(2, 1),
  ];
  export const F32Min: WasmOpcode = [
    'f32.min',
    0x96,
    undefined,
    new WasmType(2, 1),
  ];
  export const F32Max: WasmOpcode = [
    'f32.max',
    0x97,
    undefined,
    new WasmType(2, 1),
  ];
  export const F32Copysign: WasmOpcode = [
    'f32.copysign',
    0x98,
    undefined,
    new WasmType(2, 1),
  ];

  export const F32Abs: WasmOpcode = [
    'f32.abs',
    0x8b,
    undefined,
    new WasmType(1, 1),
  ];
  export const F32Neg: WasmOpcode = [
    'f32.neg',
    0x8c,
    undefined,
    new WasmType(1, 1),
  ];
  export const F32Ceil: WasmOpcode = [
    'f32.ceil',
    0x8d,
    undefined,
    new WasmType(1, 1),
  ];
  export const F32Floor: WasmOpcode = [
    'f32.floor',
    0x8e,
    undefined,
    new WasmType(1, 1),
  ];
  export const F32Trunc: WasmOpcode = [
    'f32.trunc',
    0x8f,
    undefined,
    new WasmType(1, 1),
  ];
  export const F32Nearest: WasmOpcode = [
    'f32.nearest',
    0x90,
    undefined,
    new WasmType(1, 1),
  ];
  export const F32Sqrt: WasmOpcode = [
    'f32.sqrt',
    0x91,
    undefined,
    new WasmType(1, 1),
  ];
  export const F32Eq: WasmOpcode = [
    'f32.eq',
    0x5b,
    undefined,
    new WasmType(2, 1),
  ];
  export const F32Ne: WasmOpcode = [
    'f32.ne',
    0x5c,
    undefined,
    new WasmType(2, 1),
  ];
  export const F32Lt: WasmOpcode = [
    'f32.lt',
    0x5d,
    undefined,
    new WasmType(2, 1),
  ];
  export const F32Gt: WasmOpcode = [
    'f32.gt',
    0x5e,
    undefined,
    new WasmType(2, 1),
  ];
  export const F32Le: WasmOpcode = [
    'f32.le',
    0x5f,
    undefined,
    new WasmType(2, 1),
  ];
  export const F32Ge: WasmOpcode = [
    'f32.ge',
    0x60,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Eq: WasmOpcode = [
    'f64.eq',
    0x61,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Ne: WasmOpcode = [
    'f64.ne',
    0x62,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Lt: WasmOpcode = [
    'f64.lt',
    0x63,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Gt: WasmOpcode = [
    'f64.gt',
    0x64,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Le: WasmOpcode = [
    'f64.le',
    0x65,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Ge: WasmOpcode = [
    'f64.ge',
    0x66,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Add: WasmOpcode = [
    'f64.add',
    0xa0,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Sub: WasmOpcode = [
    'f64.sub',
    0xa1,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Mul: WasmOpcode = [
    'f64.mul',
    0xa2,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Div: WasmOpcode = [
    'f64.div',
    0xa3,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Min: WasmOpcode = [
    'f64.min',
    0xa4,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Max: WasmOpcode = [
    'f64.max',
    0xa5,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Copysign: WasmOpcode = [
    'f64.copysign',
    0xa6,
    undefined,
    new WasmType(2, 1),
  ];
  export const F64Abs: WasmOpcode = [
    'f64.abs',
    0x99,
    undefined,
    new WasmType(1, 1),
  ];
  export const F64Neg: WasmOpcode = [
    'f64.neg',
    0x9a,
    undefined,
    new WasmType(1, 1),
  ];

  export const F64Ceil: WasmOpcode = [
    'f64.ceil',
    0x9b,
    undefined,
    new WasmType(1, 1),
  ];
  export const F64Floor: WasmOpcode = [
    'f64.floor',
    0x9c,
    undefined,
    new WasmType(1, 1),
  ];
  export const F64Trunc: WasmOpcode = [
    'f64.trunc',
    0x9d,
    undefined,
    new WasmType(1, 1),
  ];
  export const F64Nearest: WasmOpcode = [
    'f64.nearest',
    0x9e,
    undefined,
    new WasmType(1, 1),
  ];
  export const F64Sqrt: WasmOpcode = [
    'f64.sqrt',
    0x9f,
    undefined,
    new WasmType(1, 1),
  ];

  export const I32WrapI64: WasmOpcode = [
    'i32.wrap/i64',
    0xa7,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32TruncSF32: WasmOpcode = [
    'i32.trunc_s/f32',
    0xa8,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32TruncUF32: WasmOpcode = [
    'i32.trunc_u/f32',
    0xa9,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32TruncSF64: WasmOpcode = [
    'i32.trunc_s/f64',
    0xaa,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32TruncUF64: WasmOpcode = [
    'i32.trunc_u/f64',
    0xab,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32Extend8S: WasmOpcode = [
    'i32.extend8_s',
    0xc0,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32Extend16S: WasmOpcode = [
    'i32.extend16_s',
    0xc1,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64ExtendSI32: WasmOpcode = [
    'i64.extend_s/i32',
    0xac,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64ExtendUI32: WasmOpcode = [
    'i64.extend_u/i32',
    0xad,
    undefined,
    new WasmType(1, 1),
  ];

  export const I64TruncSF32: WasmOpcode = [
    'i64.trunc_s/f32',
    0xae,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64TruncUF32: WasmOpcode = [
    'i64.trunc_u/f32',
    0xaf,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64TruncSF64: WasmOpcode = [
    'i64.trunc_s/f64',
    0xb0,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64TruncUF64: WasmOpcode = [
    'i64.trunc_u/f64',
    0xb1,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64Extend16S: WasmOpcode = [
    'i64.extend16_s',
    0xc3,
    undefined,
    new WasmType(1, 1),
  ];

  export const F32ConvertSI32: WasmOpcode = [
    'f32.convert_s/i32',
    0xb2,
    undefined,
    new WasmType(1, 1),
  ];
  export const F32ConvertUI32: WasmOpcode = [
    'f32.convert_u/i32',
    0xb3,
    undefined,
    new WasmType(1, 1),
  ];
  export const F32ConvertSI64: WasmOpcode = [
    'f32.convert_s/i64',
    0xb4,
    undefined,
    new WasmType(1, 1),
  ];
  export const F32ConvertUI64: WasmOpcode = [
    'f32.convert_u/i64',
    0xb5,
    undefined,
    new WasmType(1, 1),
  ];
  export const F32DemoteF64: WasmOpcode = [
    'f32.demote/f64',
    0xb6,
    undefined,
    new WasmType(1, 1),
  ];

  export const F64ConvertSI32: WasmOpcode = [
    'f64.convert_s/i32',
    0xb7,
    undefined,
    new WasmType(1, 1),
  ];
  export const F64ConvertUI32: WasmOpcode = [
    'f64.convert_u/i32',
    0xb8,
    undefined,
    new WasmType(1, 1),
  ];
  export const F64ConvertSI64: WasmOpcode = [
    'f64.convert_s/i64',
    0xb9,
    undefined,
    new WasmType(1, 1),
  ];
  export const F64ConvertUI64: WasmOpcode = [
    'f64.convert_u/i64',
    0xba,
    undefined,
    new WasmType(1, 1),
  ];
  export const F64PromoteF32: WasmOpcode = [
    'f64.promote/f32',
    0xbb,
    undefined,
    new WasmType(1, 1),
  ];

  export const I32ReinterpretF32: WasmOpcode = [
    'i32.reinterpret/f32',
    0xbc,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64ReinterpretF64: WasmOpcode = [
    'i64.reinterpret/f64',
    0xbd,
    undefined,
    new WasmType(1, 1),
  ];
  export const F32ReinterpretI32: WasmOpcode = [
    'f32.reinterpret/i32',
    0xbe,
    undefined,
    new WasmType(1, 1),
  ];

  export const F64ReinterpretI64: WasmOpcode = [
    'f64.reinterpret/i64',
    WasmOpcodeF64ReinterpretI64,
    undefined,
    new WasmType(1, 1),
  ];

  export const GlobalGet: WasmOpcode = [
    'get_global',
    WasmOpcodeGetGlobal,
    undefined,
    new WasmType(0, 1),
  ];

  export const GlobalSet: WasmOpcode = [
    'set_global',
    WasmOpcodeSetGlobal,
    undefined,
    new WasmType(1, 0),
  ]; // set_global

  export const BrIf: WasmOpcode = [
    'br_if',
    WasmOpcodeBrIf,
    undefined,
    new WasmType(1, 0),
  ];

  export const BrTable: WasmOpcode = [
    'br_table',
    WasmOpcodeBrTable,
    undefined,
    new WasmType(1, 0),
  ]; // br_table

  export const Return: WasmOpcode = [
    'return',
    WasmOpcodeReturn,
    undefined,
    new WasmType(0, 0),
  ]; // return

  export const If: WasmOpcode = [
    'if',
    WasmOpcodeIf,
    undefined,
    new WasmType(1, 0),
  ]; // if

  export const Else: WasmOpcode = [
    'else',
    WasmOpcodeElse,
    undefined,
    new WasmType(0, 0),
  ]; // else

  export const End: WasmOpcode = [
    'end',
    WasmOpcodeEnd,
    undefined,
    new WasmType(0, 0),
  ]; // end

  export const Br: WasmOpcode = [
    'br',
    WasmOpcodeBr,
    undefined,
    new WasmType(0, 0),
  ]; // br

  export const I32Load: WasmOpcode = [
    'i32.load',
    WasmOpcodeI32Load,
    undefined,
    new WasmType(1, 1),
  ];

  export const I64Load: WasmOpcode = [
    'i64.load',
    0x29,
    undefined,
    new WasmType(1, 1),
  ];
  export const F32Load: WasmOpcode = [
    'f32.load',
    0x2a,
    undefined,
    new WasmType(1, 1),
  ];
  export const F64Load: WasmOpcode = [
    'f64.load',
    0x2b,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32Load8S: WasmOpcode = [
    'i32.load8_s',
    0x2c,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32Load8U: WasmOpcode = [
    'i32.load8_u',
    0x2d,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32Load16S: WasmOpcode = [
    'i32.load16_s',
    0x2e,
    undefined,
    new WasmType(1, 1),
  ];
  export const I32Load16U: WasmOpcode = [
    'i32.load16_u',
    0x2f,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64Load8S: WasmOpcode = [
    'i64.load8_s',
    0x30,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64Load8U: WasmOpcode = [
    'i64.load8_u',
    0x31,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64Load16S: WasmOpcode = [
    'i64.load16_s',
    0x32,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64Load16U: WasmOpcode = [
    'i64.load16_u',
    0x33,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64Load32S: WasmOpcode = [
    'i64.load32_s',
    0x34,
    undefined,
    new WasmType(1, 1),
  ];
  export const I64LoadU: WasmOpcode = [
    'i64.load32_u',
    0x35,
    undefined,
    new WasmType(1, 1),
  ];

  export const I32Store: WasmOpcode = [
    'i32.store',
    0x36,
    undefined,
    new WasmType(2, 0),
  ];

  export const I64Store: WasmOpcode = [
    'i64.store',
    0x37,
    undefined,
    new WasmType(2, 0),
  ];

  export const F32Store: WasmOpcode = [
    'f32.store',
    0x38,
    undefined,
    new WasmType(2, 0),
  ];

  export const F64Store: WasmOpcode = [
    'f64.store',
    0x39,
    undefined,
    new WasmType(2, 0),
  ];

  export const I32Store8: WasmOpcode = [
    'i32.store8',
    0x3a,
    undefined,
    new WasmType(2, 0),
  ];

  export const I32Store16: WasmOpcode = [
    'i32.store16',
    0x3b,
    undefined,
    new WasmType(2, 0),
  ];

  export const I64Store8: WasmOpcode = [
    'i64.store8',
    0x3c,
    undefined,
    new WasmType(2, 0),
  ];

  export const I64Store16: WasmOpcode = [
    'i64.store16',
    0x3d,
    undefined,
    new WasmType(2, 0),
  ];

  export const I64Store32: WasmOpcode = [
    'i64.store32',
    0x3e,
    undefined,
    new WasmType(2, 0),
  ];

  export const MemorySize: WasmOpcode = [
    'current_memory',
    0x3f,
    undefined,
    new WasmType(0, 1),
  ];

  export const MemoryGrow: WasmOpcode = [
    'grow_memory',
    0x40,
    undefined,
    new WasmType(1, 1),
  ];

  // Wasm Version 2
  export const MemoryFill: WasmOpcode = [
    'memory.fill',
    0xfc,
    0x0b,
    new WasmType(3, 0),
  ];

  export const MemoryCopy: WasmOpcode = [
    'memory.copy',
    0xfc,
    0x0a,
    new WasmType(3, 0),
  ];

  export const TableCopy: WasmOpcode = [
    'table.copy',
    0xfc,
    0x0e,
    new WasmType(3, 0),
  ];

  export const TableSize: WasmOpcode = [
    'table.size',
    0xfc,
    0x10,
    new WasmType(0, 1),
  ];

  export const TableInit: WasmOpcode = [
    'table.init',
    0xfc,
    0x0c,
    new WasmType(3, 0),
  ];

  export const TableGrow: WasmOpcode = [
    'table.grow',
    0xfc,
    0x0f,
    new WasmType(1, 1),
  ];
  export const TableGet: WasmOpcode = [
    'table.get',
    0x25,
    undefined,
    new WasmType(1, 1),
  ];
  export const TableSet: WasmOpcode = [
    'table.set',
    0x26,
    undefined,
    new WasmType(2, 0),
  ];
  export const TableFill: WasmOpcode = [
    'table.fill',
    0xfc,
    0x11,
    new WasmType(3, 0),
  ];

  export const RefNull: WasmOpcode = [
    'ref.null',
    0xd0,
    undefined,
    new WasmType(0, 1),
  ];

  export const RefIsNull: WasmOpcode = [
    'ref.is_null',
    0xd1,
    undefined,
    new WasmType(1, 1),
  ];

  export const RefFunc: WasmOpcode = [
    'ref.func',
    0xd2,
    undefined,
    new WasmType(0, 1),
  ];

  export const I64Extend8S: WasmOpcode = [
    'i64.extend8_s',
    0xc2,
    undefined,
    new WasmType(1, 1),
  ];

  export const I64Extend32S: WasmOpcode = [
    'i64.extend32_s',
    0xc4,
    undefined,
    new WasmType(1, 1),
  ];
}

export const WasmOpcodes: WasmOpcode[] = [
  WasmCode.Unreachable,
  WasmCode.NOP,
  WasmCode.Block,
  WasmCode.Loop,
  WasmCode.If,
  WasmCode.Else,
  WasmCode.End,
  WasmCode.Br,
  WasmCode.BrIf,
  WasmCode.BrTable,
  WasmCode.Return,
  WasmCode.Call,
  WasmCode.CallIndirect,
  WasmCode.Drop,
  WasmCode.Select,
  WasmCode.LocalGet,
  WasmCode.LocalSet,
  WasmCode.LocalTee,
  WasmCode.GlobalGet,
  WasmCode.GlobalSet,

  WasmCode.I32Load,
  WasmCode.I64Load,
  WasmCode.F32Load,
  WasmCode.F64Load,
  WasmCode.I32Load8S,
  WasmCode.I32Load8U,
  WasmCode.I32Load16S,
  WasmCode.I32Load16U,
  WasmCode.I64Load8S,
  WasmCode.I64Load8U,
  WasmCode.I64Load16S,
  WasmCode.I64Load16U,
  WasmCode.I64Load32S,
  WasmCode.I64LoadU,

  WasmCode.I32Store,
  WasmCode.I64Store,
  WasmCode.F32Store,
  WasmCode.F64Store,
  WasmCode.I32Store8,
  WasmCode.I32Store16,
  WasmCode.I64Store8,
  WasmCode.I64Store16,
  WasmCode.I64Store32,

  WasmCode.MemorySize,
  WasmCode.MemoryGrow,

  WasmCode.I32Const,
  WasmCode.I64Const,
  WasmCode.F32Const,
  WasmCode.F64Const,

  WasmCode.I32Eq,
  WasmCode.I32Eqz,
  WasmCode.I32Ne,
  WasmCode.I32LtS,
  WasmCode.I32LtU,
  WasmCode.I32GtS,
  WasmCode.I32GtU,
  WasmCode.I32LeS,
  WasmCode.I32LeU,
  WasmCode.I32GeS,
  WasmCode.I32GeU,
  WasmCode.I32Clz,
  WasmCode.I32Ctz,
  WasmCode.I32Popcnt,
  WasmCode.I32Add,
  WasmCode.I32Sub,
  WasmCode.I32Mul,
  WasmCode.I32DivS,
  WasmCode.I32DivU,
  WasmCode.I32RemS,
  WasmCode.I32RemU,
  WasmCode.I32And,
  WasmCode.I32Or,
  WasmCode.I32Xor,
  WasmCode.I32Shl,
  WasmCode.I32ShrS,
  WasmCode.I32ShrU,
  WasmCode.I32Rotl,
  WasmCode.I32Rotr,

  WasmCode.I64Add,
  WasmCode.I64Sub,
  WasmCode.I64Mul,
  WasmCode.I64DivS,
  WasmCode.I64DivU,
  WasmCode.I64RemS,
  WasmCode.I64RemU,
  WasmCode.I64And,
  WasmCode.I64Or,
  WasmCode.I64Xor,
  WasmCode.I64Shl,
  WasmCode.I64ShrS,
  WasmCode.I64ShrU,
  WasmCode.I64Rotl,
  WasmCode.I64Rotr,
  WasmCode.I64Clz,
  WasmCode.I64Ctz,
  WasmCode.I64Popcnt,
  WasmCode.I64Eqz,
  WasmCode.I64Eq,
  WasmCode.I64Ne,
  WasmCode.I64LtS,
  WasmCode.I64LtU,
  WasmCode.I64GtS,
  WasmCode.I64GtU,
  WasmCode.I64LeS,
  WasmCode.I64LeU,
  WasmCode.I64GeS,
  WasmCode.I64GeU,

  WasmCode.F32Add,
  WasmCode.F32Sub,
  WasmCode.F32Mul,
  WasmCode.F32Div,
  WasmCode.F32Min,
  WasmCode.F32Max,
  WasmCode.F32Copysign,
  WasmCode.F32Abs,
  WasmCode.F32Neg,
  WasmCode.F32Ceil,
  WasmCode.F32Floor,
  WasmCode.F32Trunc,
  WasmCode.F32Nearest,
  WasmCode.F32Sqrt,
  WasmCode.F32Eq,
  WasmCode.F32Ne,
  WasmCode.F32Lt,
  WasmCode.F32Gt,
  WasmCode.F32Le,
  WasmCode.F32Ge,

  WasmCode.F64Eq,
  WasmCode.F64Ne,
  WasmCode.F64Lt,
  WasmCode.F64Gt,
  WasmCode.F64Le,
  WasmCode.F64Ge,
  WasmCode.F64Add,
  WasmCode.F64Sub,

  WasmCode.F64Mul,
  WasmCode.F64Div,
  WasmCode.F64Min,
  WasmCode.F64Max,
  WasmCode.F64Copysign,
  WasmCode.F64Abs,
  WasmCode.F64Neg,
  WasmCode.F64Ceil,
  WasmCode.F64Floor,
  WasmCode.F64Trunc,
  WasmCode.F64Nearest,
  WasmCode.F64Sqrt,

  WasmCode.I32WrapI64,
  WasmCode.I32TruncSF32,
  WasmCode.I32TruncUF32,
  WasmCode.I32TruncSF64,
  WasmCode.I32TruncUF64,
  WasmCode.I32Extend8S,
  WasmCode.I32Extend16S,

  WasmCode.I64ExtendSI32,
  WasmCode.I64ExtendUI32,
  WasmCode.I64TruncSF32,
  WasmCode.I64TruncUF32,
  WasmCode.I64TruncSF64,
  WasmCode.I64TruncUF64,
  WasmCode.I64Extend16S,

  WasmCode.F32ConvertSI32,
  WasmCode.F32ConvertUI32,
  WasmCode.F32ConvertSI64,
  WasmCode.F32ConvertUI64,
  WasmCode.F32DemoteF64,

  WasmCode.F64ConvertSI32,
  WasmCode.F64ConvertUI32,
  WasmCode.F64ConvertSI64,
  WasmCode.F64ConvertUI64,
  WasmCode.F64PromoteF32,

  WasmCode.I32ReinterpretF32,
  WasmCode.I64ReinterpretF64,
  WasmCode.F32ReinterpretI32,
  WasmCode.F64ReinterpretI64,
  // Wasm version 2
  WasmCode.MemoryFill,
  WasmCode.MemoryCopy,
  WasmCode.TableCopy,
  WasmCode.TableSize,
  WasmCode.TableInit,
  WasmCode.TableGrow,
  WasmCode.TableGet,
  WasmCode.TableSet,
  WasmCode.TableFill,
  WasmCode.RefNull,
  WasmCode.RefIsNull,
  WasmCode.RefFunc,
  WasmCode.I64Extend8S,
  WasmCode.I64Extend32S,
];

export function typeFromWasmOpcode(
  opcode: WasmOpcodeNumber,
  subOpcode: WasmOpcodeNumber | undefined = undefined,
): WasmType | undefined {
  const found = WasmOpcodes.find(([_, opcodeNumber, subOpcodeNr]) => {
    return opcodeNumber === opcode && subOpcode === subOpcodeNr;
  });
  if (found === undefined) {
    return undefined;
  } else {
    return found[3];
  }
}

export function wasmOpcodeFromNr(
  opcode: number,
  subOpcode: number | undefined = undefined,
): WasmOpcodeNumber | undefined {
  const has = WasmOpcodes.find(([_, opcodeNumber, subOpcodeNr]) => {
    return opcodeNumber === opcode && subOpcode === subOpcodeNr;
  });
  if (has !== undefined) {
    return has[1];
  } else {
    return undefined;
  }
}
export function wasmOpcodeNameFromNumber(
  opcode: WasmOpcodeNumber,
  subOpcode: WasmOpcodeNumber | undefined = undefined,
): WasmOpcodeName | undefined {
  const has = WasmOpcodes.find(([_, opcodeNumber, subOpcodeNr]) => {
    return opcodeNumber === opcode && subOpcode === subOpcodeNr;
  });
  if (has !== undefined) {
    return has[0];
  } else {
    return undefined;
  }
}

export function wasmOpcodeFromStr(opcode: string): WasmOpcodeNumber[] {
  const fixedOpcode = correctOpcodeName(opcode);
  const found = WasmOpcodes.find(([name, _, __]) => {
    return name === fixedOpcode;
  });
  if (found === undefined) {
    throw new Error(`unsupported opcode ${opcode}`);
  } else {
    const opcodes = [found[1]];
    if (found[2] !== undefined) {
      opcodes.push(found[2]);
    }
    return opcodes;
  }
}

function correctOpcodeName(opcode: string): WasmOpcodeName {
  const fixes: Array<[WasmOpcodeName, WasmOpcodeName]> = [
    ['u32.load', 'i32.load'],
    ['u64.load', 'i64.load'],
    ['u32.load8_s', 'i32.load8_s'],
    ['u32.load8_u', 'i32.load8_u'],
    ['u32.load16_s', 'i32.load16_s'],
    ['u32.load16_u', 'i32.load16_u'],
    ['u64.load8_s', 'i64.load8_s'],
    ['u64.load8_u', 'i64.load8_u'],
    ['u64.load16_s', 'i64.load16_s'],
    ['u64.load16_u', 'i64.load16_u'],
    ['u64.load32_s', 'i64.load32_s'],
    ['u64.load32_u', 'i64.load32_u'],
    ['u32.store', 'i32.store'],
    ['u64.store', 'i64.store'],
    ['u32.store8', 'i32.store8'],
    ['u32.store16', 'i32.store16'],
    ['u64.store8', 'i64.store8'],
    ['u64.store16', 'i64.store16'],
    ['u64.store32', 'i64.store32'],
    ['u32.const', 'i32.const'],
    ['f32.copysing', 'f32.copysign'],
    ['f63.copysing', 'f64.copysign'],
  ];

  const fix = fixes.find(([name1, _]) => {
    return name1 === opcode;
  });

  if (fix !== undefined) {
    return fix[1];
  } else {
    return opcode;
  }
}

export function WasmOpcodeHasImmediate(opcode: WasmOpcodeNumber): boolean {
  switch (opcode) {
    case WasmOpcodeI32Const: // 'i32.const'
    case WasmOpcodeI64Const: // 'i64.const'
    case WasmOpcodeF32Const: // 'f32.const'
    case WasmOpcodeF64Const: // 'f64.const'
    case WasmOpcodeGetGlobal: // 'get_global'
    case WasmOpcodeGetLocal: // 'get_local'
    case WasmOpcodeSetGlobal: // 'set_global'
    case WasmOpcodeBr: // 'br'
    case WasmOpcodeCall: // 'call'
      return true;
    default:
      return false;
  }
}
