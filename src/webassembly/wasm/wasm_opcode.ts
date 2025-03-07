import { PlaceholderType, WasmType } from './opcode_type';

export type WasmOpcodeNumber = number;
export type WasmOpcodeName = string;
export type WasmOpcode = [
  WasmOpcodeName,
  WasmOpcodeNumber,
  WasmOpcodeNumber | undefined,
  WasmType,
];

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

export const WasmOpcodes: WasmOpcode[] = [
  ['unreachable', WasmOpcodeUnreachable, undefined, new WasmType(0, 0)],
  ['nop', 1, undefined, new WasmType(0, 0)],
  ['block', WasmOpcodeBlock, undefined, new WasmType(0, 0)],
  ['loop', WasmOpcodeLoop, undefined, new WasmType(0, 0)], // loop
  ['if', WasmOpcodeIf, undefined, new WasmType(1, 0)], // if
  ['else', WasmOpcodeElse, undefined, new WasmType(0, 0)], // else
  ['end', WasmOpcodeEnd, undefined, new WasmType(0, 0)], // end
  ['br', WasmOpcodeBr, undefined, new WasmType(0, 0)], // br
  ['br_if', WasmOpcodeBrIf, undefined, new WasmType(1, 0)], // br_if
  ['br_table', WasmOpcodeBrTable, undefined, new WasmType(1, 0)], // br_table
  ['return', WasmOpcodeReturn, undefined, new WasmType(0, 0)], // return
  ['call', WasmOpcodeCall, undefined, new PlaceholderType()], // call
  ['call_indirect', WasmOpcodeCallIndirect, undefined, new PlaceholderType()], // call_indirect
  ['drop', WasmOpcodeDrop, undefined, new WasmType(1, 0)], // drop
  ['select', WasmOpcodeSelect, undefined, new WasmType(1, 0)], // select
  ['get_local', WasmOpcodeGetLocal, undefined, new WasmType(0, 1)], // get_local
  ['set_local', WasmOpcodeSetLocal, undefined, new WasmType(1, 0)], // set_local
  ['tee_local', 0x22, undefined, new WasmType(1, 0)], // tee_local
  ['get_global', WasmOpcodeGetGlobal, undefined, new WasmType(0, 1)], // get_global
  ['set_global', WasmOpcodeSetGlobal, undefined, new WasmType(1, 0)], // set_global
  ['i32.load', WasmOpcodeI32Load, undefined, new WasmType(1, 1)],
  ['i64.load', 0x29, undefined, new WasmType(1, 1)],
  ['f32.load', 0x2a, undefined, new WasmType(1, 1)],
  ['f64.load', 0x2b, undefined, new WasmType(1, 1)],
  ['i32.load8_s', 0x2c, undefined, new WasmType(1, 1)],
  ['i32.load8_u', 0x2d, undefined, new WasmType(1, 1)],
  ['i32.load16_s', 0x2e, undefined, new WasmType(1, 1)],
  ['i32.load16_u', 0x2f, undefined, new WasmType(1, 1)],
  ['i64.load8_s', 0x30, undefined, new WasmType(1, 1)],
  ['i64.load8_u', 0x31, undefined, new WasmType(1, 1)],
  ['i64.load16_s', 0x32, undefined, new WasmType(1, 1)],
  ['i64.load16_u', 0x33, undefined, new WasmType(1, 1)],
  ['i64.load32_s', 0x34, undefined, new WasmType(1, 1)],
  ['i64.load32_u', 0x35, undefined, new WasmType(1, 1)],

  ['i32.store', 0x36, undefined, new WasmType(2, 0)],
  ['i64.store', 0x37, undefined, new WasmType(2, 0)],
  ['f32.store', 0x38, undefined, new WasmType(2, 0)],
  ['f64.store', 0x39, undefined, new WasmType(2, 0)],
  ['i32.store8', 0x3a, undefined, new WasmType(2, 0)],
  ['i32.store16', 0x3b, undefined, new WasmType(2, 0)],
  ['i64.store8', 0x3c, undefined, new WasmType(2, 0)],
  ['i64.store16', 0x3d, undefined, new WasmType(2, 0)],
  ['i64.store32', 0x3e, undefined, new WasmType(2, 0)],
  ['current_memory', 0x3f, undefined, new WasmType(0, 1)],
  ['grow_memory', 0x40, undefined, new WasmType(1, 1)],

  ['i32.const', WasmOpcodeI32Const, undefined, new WasmType(0, 1)], // i32.const
  ['i64.const', WasmOpcodeI64Const, undefined, new WasmType(0, 1)], // i64.const
  ['f32.const', WasmOpcodeF32Const, undefined, new WasmType(0, 1)], // f32.const
  ['f64.const', WasmOpcodeF64Const, undefined, new WasmType(0, 1)], // f64.const

  ['i32.eq', 0x46, undefined, new WasmType(2, 1)],
  ['i32.eqz', 0x45, undefined, new WasmType(1, 1)],
  ['i32.ne', 0x47, undefined, new WasmType(2, 1)],
  ['i32.lt_s', 0x48, undefined, new WasmType(2, 1)],
  ['i32.lt_u', 0x49, undefined, new WasmType(2, 1)],
  ['i32.gt_s', 0x4a, undefined, new WasmType(2, 1)],
  ['i32.gt_u', 0x4b, undefined, new WasmType(2, 1)],
  ['i32.le_s', 0x4c, undefined, new WasmType(2, 1)],
  ['i32.le_u', 0x4d, undefined, new WasmType(2, 1)],
  ['i32.ge_s', 0x4e, undefined, new WasmType(2, 1)],
  ['i32.ge_u', 0x4f, undefined, new WasmType(2, 1)],
  ['i32.clz', 0x67, undefined, new WasmType(1, 1)],
  ['i32.ctz', 0x68, undefined, new WasmType(1, 1)],
  ['i32.popcnt', 0x69, undefined, new WasmType(1, 1)],
  ['i32.add', 0x6a, undefined, new WasmType(2, 1)],
  ['i32.sub', 0x6b, undefined, new WasmType(2, 1)],
  ['i32.mul', 0x6c, undefined, new WasmType(2, 1)],
  ['i32.div_s', 0x6d, undefined, new WasmType(2, 1)],
  ['i32.div_u', 0x6e, undefined, new WasmType(2, 1)],
  ['i32.rem_s', 0x6f, undefined, new WasmType(2, 1)],
  ['i32.rem_u', 0x70, undefined, new WasmType(2, 1)],
  ['i32.and', 0x71, undefined, new WasmType(2, 1)],
  ['i32.or', 0x72, undefined, new WasmType(2, 1)],
  ['i32.xor', 0x73, undefined, new WasmType(2, 1)],
  ['i32.shl', 0x74, undefined, new WasmType(2, 1)],
  ['i32.shr_s', 0x75, undefined, new WasmType(2, 1)],
  ['i32.shr_u', 0x76, undefined, new WasmType(2, 1)],
  ['i32.rotl', 0x77, undefined, new WasmType(2, 1)],
  ['i32.rotr', 0x78, undefined, new WasmType(2, 1)],
  ['i64.add', 0x7c, undefined, new WasmType(2, 1)],
  ['i64.sub', 0x7d, undefined, new WasmType(2, 1)],
  ['i64.mul', 0x7e, undefined, new WasmType(2, 1)],
  ['i64.div_s', 0x7f, undefined, new WasmType(2, 1)],
  ['i64.div_u', 0x80, undefined, new WasmType(2, 1)],
  ['i64.rem_s', 0x81, undefined, new WasmType(2, 1)],
  ['i64.rem_u', 0x82, undefined, new WasmType(2, 1)],
  ['i64.and', 0x83, undefined, new WasmType(2, 1)],
  ['i64.or', 0x84, undefined, new WasmType(2, 1)],
  ['i64.xor', 0x85, undefined, new WasmType(2, 1)],
  ['i64.shl', 0x86, undefined, new WasmType(2, 1)],
  ['i64.shr_s', 0x87, undefined, new WasmType(2, 1)],
  ['i64.shr_u', 0x88, undefined, new WasmType(2, 1)],
  ['i64.rotl', 0x89, undefined, new WasmType(2, 1)],
  ['i64.rotr', 0x8a, undefined, new WasmType(2, 1)],
  ['i64.clz', 0x79, undefined, new WasmType(1, 1)],
  ['i64.ctz', 0x7a, undefined, new WasmType(1, 1)],
  ['i64.popcnt', 0x7b, undefined, new WasmType(1, 1)],
  ['i64.eqz', 0x50, undefined, new WasmType(1, 1)],
  ['i64.eq', 0x51, undefined, new WasmType(2, 1)],
  ['i64.ne', 0x52, undefined, new WasmType(2, 1)],
  ['i64.lt_s', 0x53, undefined, new WasmType(2, 1)],
  ['i64.lt_u', 0x54, undefined, new WasmType(2, 1)],
  ['i64.gt_s', 0x55, undefined, new WasmType(2, 1)],
  ['i64.gt_u', 0x56, undefined, new WasmType(2, 1)],
  ['i64.le_s', 0x57, undefined, new WasmType(2, 1)],
  ['i64.le_u', 0x58, undefined, new WasmType(2, 1)],
  ['i64.ge_s', 0x59, undefined, new WasmType(2, 1)],
  ['i64.ge_u', 0x5a, undefined, new WasmType(2, 1)],
  ['f32.add', 0x92, undefined, new WasmType(2, 1)],
  ['f32.sub', 0x93, undefined, new WasmType(2, 1)],
  ['f32.mul', 0x94, undefined, new WasmType(2, 1)],
  ['f32.div', 0x95, undefined, new WasmType(2, 1)],
  ['f32.min', 0x96, undefined, new WasmType(2, 1)],
  ['f32.max', 0x97, undefined, new WasmType(2, 1)],
  ['f32.copysign', 0x98, undefined, new WasmType(2, 1)],
  ['f32.abs', 0x8b, undefined, new WasmType(1, 1)],
  ['f32.neg', 0x8c, undefined, new WasmType(1, 1)],
  ['f32.ceil', 0x8d, undefined, new WasmType(1, 1)],
  ['f32.floor', 0x8e, undefined, new WasmType(1, 1)],
  ['f32.trunc', 0x8f, undefined, new WasmType(1, 1)],
  ['f32.nearest', 0x90, undefined, new WasmType(1, 1)],
  ['f32.sqrt', 0x91, undefined, new WasmType(1, 1)],
  ['f32.eq', 0x5b, undefined, new WasmType(2, 1)],
  ['f32.ne', 0x5c, undefined, new WasmType(2, 1)],
  ['f32.lt', 0x5d, undefined, new WasmType(2, 1)],
  ['f32.gt', 0x5e, undefined, new WasmType(2, 1)],
  ['f32.le', 0x5f, undefined, new WasmType(2, 1)],
  ['f32.ge', 0x60, undefined, new WasmType(2, 1)],
  ['f64.eq', 0x61, undefined, new WasmType(2, 1)],
  ['f64.ne', 0x62, undefined, new WasmType(2, 1)],
  ['f64.lt', 0x63, undefined, new WasmType(2, 1)],
  ['f64.gt', 0x64, undefined, new WasmType(2, 1)],
  ['f64.le', 0x65, undefined, new WasmType(2, 1)],
  ['f64.ge', 0x66, undefined, new WasmType(2, 1)],
  ['f64.add', 0xa0, undefined, new WasmType(2, 1)],
  ['f64.sub', 0xa1, undefined, new WasmType(2, 1)],
  ['f64.mul', 0xa2, undefined, new WasmType(2, 1)],
  ['f64.div', 0xa3, undefined, new WasmType(2, 1)],
  ['f64.min', 0xa4, undefined, new WasmType(2, 1)],
  ['f64.max', 0xa5, undefined, new WasmType(2, 1)],
  ['f64.copysign', 0xa6, undefined, new WasmType(2, 1)],
  ['f64.abs', 0x99, undefined, new WasmType(1, 1)],
  ['f64.neg', 0x9a, undefined, new WasmType(1, 1)],
  ['f64.ceil', 0x9b, undefined, new WasmType(1, 1)],
  ['f64.floor', 0x9c, undefined, new WasmType(1, 1)],
  ['f64.trunc', 0x9d, undefined, new WasmType(1, 1)],
  ['f64.nearest', 0x9e, undefined, new WasmType(1, 1)],
  ['f64.sqrt', 0x9f, undefined, new WasmType(1, 1)],
  ['i32.wrap/i64', 0xa7, undefined, new WasmType(1, 1)],
  ['i32.trunc_s/f32', 0xa8, undefined, new WasmType(1, 1)],
  ['i32.trunc_u/f32', 0xa9, undefined, new WasmType(1, 1)],
  ['i32.trunc_s/f64', 0xaa, undefined, new WasmType(1, 1)],
  ['i32.trunc_u/f64', 0xab, undefined, new WasmType(1, 1)],
  ['i32.extend8_s', 0xc0, undefined, new WasmType(1, 1)],
  ['i32.extend16_s', 0xc1, undefined, new WasmType(1, 1)],
  ['i64.extend_s/i32', 0xac, undefined, new WasmType(1, 1)],
  ['i64.extend_u/i32', 0xad, undefined, new WasmType(1, 1)],
  ['i64.trunc_s/f32', 0xae, undefined, new WasmType(1, 1)],
  ['i64.trunc_u/f32', 0xaf, undefined, new WasmType(1, 1)],
  ['i64.trunc_s/f64', 0xb0, undefined, new WasmType(1, 1)],
  ['i64.trunc_u/f64', 0xb1, undefined, new WasmType(1, 1)],
  ['i64.extend16_s', 0xc3, undefined, new WasmType(1, 1)],
  ['f32.convert_s/i32', 0xb2, undefined, new WasmType(1, 1)],
  ['f32.convert_u/i32', 0xb3, undefined, new WasmType(1, 1)],
  ['f32.convert_s/i64', 0xb4, undefined, new WasmType(1, 1)],
  ['f32.convert_u/i64', 0xb5, undefined, new WasmType(1, 1)],
  ['f32.demote/f64', 0xb6, undefined, new WasmType(1, 1)],
  ['f64.convert_s/i32', 0xb7, undefined, new WasmType(1, 1)],
  ['f64.convert_u/i32', 0xb8, undefined, new WasmType(1, 1)],
  ['f64.convert_s/i64', 0xb9, undefined, new WasmType(1, 1)],
  ['f64.convert_u/i64', 0xba, undefined, new WasmType(1, 1)],
  ['f64.promote/f32', 0xbb, undefined, new WasmType(1, 1)],
  ['i32.reinterpret/f32', 0xbc, undefined, new WasmType(1, 1)],
  ['i64.reinterpret/f64', 0xbd, undefined, new WasmType(1, 1)],
  ['f32.reinterpret/i32', 0xbe, undefined, new WasmType(1, 1)],
  [
    'f64.reinterpret/i64',
    WasmOpcodeF64ReinterpretI64,
    undefined,
    new WasmType(1, 1),
  ],
  // Wasm version 2
  ['tableset', WasmOpcodeTableSet, undefined, new WasmType(1, 0)],
  ['memory.fill', 0xfc, 0x0b, new WasmType(3, 0)],
  ['memory.copy', 0xfc, 0x0a, new WasmType(3, 0)],
  ['table.copy', 0xfc, 0x0e, new WasmType(3, 0)],
  ['table.size', 0xfc, 0x10, new WasmType(0, 1)],
  ['table.init', 0xfc, 0x0c, new WasmType(3, 0)],
  ['table.grow', 0xfc, 0x0f, new WasmType(1, 1)],
  ['table.get', 0x25, undefined, new WasmType(1, 1)],
  ['table.set', 0x26, undefined, new WasmType(2, 0)],
  ['table.fill', 0xfc, 0x11, new WasmType(3, 0)],
  ['ref.null', 0xd0, undefined, new WasmType(0, 1)],
  ['ref.is_null', 0xd1, undefined, new WasmType(1, 1)],
  ['ref.func', 0xd2, undefined, new WasmType(0, 1)],
  ['i64.extend8_s', 0xc2, undefined, new WasmType(1, 1)],
  ['i64.extend32_s', 0xc4, undefined, new WasmType(1, 1)],
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
