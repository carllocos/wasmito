import { type WASM } from '../../state';
import { PlaceholderType, WasmType } from '../../state/opcode_type';

export class WasmInstruction {
  public readonly opcodeNr: WASMOpcodeNumber;
  public readonly name: string;
  public immediate?: number;
  private type: WasmType;
  public args: string[];

  public startAddress?: number;
  public endAddress?: number;
  private _subInstructions: WasmInstruction[];
  private _allSubInstructions: WasmInstruction[];

  constructor(
    opcodeName: string,
    opcodeNr: number,
    immediate?: number,
    opcodeLabels?: string[],
  ) {
    this.name = opcodeName;
    this.opcodeNr = opcodeNr;
    const op = wasmOpcodeFromNr(opcodeNr);
    if (op === undefined) {
      throw Error(`invalid opcode ${opcodeName}`);
    }
    const t = typeFromWasmOpcode(this.opcodeNr);
    if (t === undefined) {
      throw Error(`unexsting opcode type for ${opcodeName}`);
    }
    this.type = t;
    this.args = opcodeLabels ?? [];
    this.immediate = immediate;
    this._subInstructions = [];
    this._allSubInstructions = [];
  }

  get subInstructions(): WasmInstruction[] {
    return this._subInstructions;
  }

  set subInstructions(ins: WasmInstruction[]) {
    this._subInstructions = ins;
    let allSubIns: WasmInstruction[] = [];
    for (const i of this._subInstructions) {
      allSubIns.push(i);
      allSubIns = allSubIns.concat(i.allSubInstructions);
    }
    this._allSubInstructions = allSubIns;
  }

  get allSubInstructions(): WasmInstruction[] {
    return this._allSubInstructions;
  }

  public changeType(type: WasmType): void {
    if (this.type instanceof PlaceholderType) {
      this.type = new WasmType(type.nrArgs, type.nrResults, type.id);
    }
  }

  public getType(): WasmType {
    return this.type;
  }

  public getArgs(): string[] {
    return this.args;
  }
}

export class IfInstruction extends WasmInstruction {
  public readonly label: string;
  public readonly testInstructions: WasmInstruction[];
  public readonly alternateInstructions: WasmInstruction[];
  public readonly consequentInstructions: WasmInstruction[];
  public readonly resultType?: WASM.Type;

  constructor(
    label: string,
    test: WasmInstruction[],
    alternate: WasmInstruction[],
    consequent: WasmInstruction[],
    result?: WASM.Type,
  ) {
    super('if', WASMOpcodeNumber.If);
    this.label = label;
    this.testInstructions = test;
    this.alternateInstructions = alternate;
    this.consequentInstructions = consequent;
    this.resultType = result;
    this.subInstructions = test.concat(alternate, consequent);
  }
}

export class BlockInstruction extends WasmInstruction {
  public readonly label: string;
  constructor(blockLabel: string, subInstructions: WasmInstruction[]) {
    super('block', WASMOpcodeNumber.Block);
    this.label = blockLabel;
    this.subInstructions = subInstructions;
  }
}

export class CallInstruction extends WasmInstruction {
  public readonly funIdx: number;
  constructor(funName: string, funIdx: number) {
    super('call', WASMOpcodeNumber.Block);
    this.args = [funName];
    this.funIdx = funIdx;
  }
}

export function isCallInstruction(
  inst: WasmInstruction,
): inst is CallInstruction {
  return (
    inst.opcodeNr === WASMOpcodeNumber.Call && inst instanceof CallInstruction
  );
}

export class LoopInstruction extends WasmInstruction {
  public readonly label: string;
  public readonly resultType?: string;
  constructor(
    loopLabel: string,
    subInstructions: WasmInstruction[],
    resultType?: string,
  ) {
    super('loop', WASMOpcodeNumber.Loop);
    this.label = loopLabel;
    this.subInstructions = subInstructions;
    this.resultType = resultType;
  }
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
    case WASMOpcodeNumber.I32Const:
    case WASMOpcodeNumber.I64Const:
    case WASMOpcodeNumber.F32Const:
    case WASMOpcodeNumber.F64Const:
    case WASMOpcodeNumber.Get_global:
    case WASMOpcodeNumber.Get_local:
      return new WasmType(0, 1);

    // binary operators that produce one result
    case WASMOpcodeNumber.I32Add:
    case WASMOpcodeNumber.I32Sub:
    case WASMOpcodeNumber.I32Mult:
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
    case WASMOpcodeNumber.GTSigned:
    case WASMOpcodeNumber.GTUnsigned:
    case WASMOpcodeNumber.LESigned:
    case WASMOpcodeNumber.LE_Unsigned:
    case WASMOpcodeNumber.GESigned:
    case WASMOpcodeNumber.GEUnsinged:
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
      return new WasmType(1, 1);
    default:
      return undefined;
  }
}

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

  I32Const = 0x41, // i32.const
  I64Const = 0x42, // i64.const
  F32Const = 0x43, // f32.const
  F64Const = 0x44, // f64.const

  I32Eq = 0x46,
  I32Eqz = 0x45,
  I32Ne = 0x47,
  I32LTSigned = 0x48,
  I32LTUnsigned = 0x49,
  GTSigned = 0x4a,
  GTUnsigned = 0x4b,
  LESigned = 0x4c,
  LE_Unsigned = 0x4d,
  GESigned = 0x4e,
  GEUnsinged = 0x4f,

  I32CLZ = 0x67,
  I32CTZ = 0x68,
  I32POPCNT = 0x69,

  I32Add = 0x6a,
  I32Sub = 0x6b,
  I32Mult = 0x6c,
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

// export function wasmOpcodeFromNr(
//   opcodeNumber: number,
// ): WASMOpcodeNumber | undefined {
//   switch (opcodeNumber) {
//     case 0x00:
//       return WASMOpcodeNumber.Unreachable;
//     case 0x01:
//       return WASMOpcodeNumber.Nop;
//     case 0x02:
//       return WASMOpcodeNumber.Block;
//     case 0x03:
//       return WASMOpcodeNumber.Loop;
//     case 0x04: // if
//       return WASMOpcodeNumber.If;

//     case 0x05: // else
//       return WASMOpcodeNumber.Else;
//     case 0x0b: // end
//       return WASMOpcodeNumber.End;
//     case 0x0c: // br
//       return WASMOpcodeNumber.Br;
//     case 0x0d: // br_if
//       return WASMOpcodeNumber.Br_if;
//     case 0x0e: // br_table
//       return WASMOpcodeNumber.Br_table;
//     case 0x0f: // return
//       return WASMOpcodeNumber.Return;
//     case 0x10: // call
//       return WASMOpcodeNumber.Call;
//     case 0x11: // call_indirect
//       return WASMOpcodeNumber.Call_indirect;
//     case 0x1a: // drop
//       return WASMOpcodeNumber.Drop;
//     case 0x1b: // select
//       return WASMOpcodeNumber.Select;
//     case 0x20: // get_local
//       return WASMOpcodeNumber.Get_local;
//     case 0x21: // set_local
//       return WASMOpcodeNumber.Set_local;
//     case 0x22: // tee_local
//       return WASMOpcodeNumber.Tee_local;
//     case 0x23: // get_global
//       return WASMOpcodeNumber.Get_global;
//     case 0x24: // set_global
//       return WASMOpcodeNumber.Set_global;

//     case 0x41: // i32.const
//       return WASMOpcodeNumber.I32Const;
//     case 0x42: // i64.const
//       return WASMOpcodeNumber.I64Const;
//     case 0x43: // f32.const
//       return WASMOpcodeNumber.F32Const;
//     case 0x44: // f64.const
//       return WASMOpcodeNumber.F64Const;

//     case 0x46:
//       return WASMOpcodeNumber.I32Eq;
//     case 0x47:
//       return WASMOpcodeNumber.I32Ne;
//     case 0x48:
//       return WASMOpcodeNumber.I32LTSigned;
//     case 0x49:
//       return WASMOpcodeNumber.I32LTUnsigned;
//     case 0x4a:
//       return WASMOpcodeNumber.GTSigned;
//     case 0x4b:
//       return WASMOpcodeNumber.GTUnsigned;
//     case 0x4c:
//       return WASMOpcodeNumber.LESigned;
//     case 0x4d:
//       return WASMOpcodeNumber.LE_Unsigned;
//     case 0x4e:
//       return WASMOpcodeNumber.GESigned;
//     case 0x4f:
//       return WASMOpcodeNumber.GEUnsinged;

//     case 0x7c:
//       return WASMOpcodeNumber.I64Add;
//     case 0x7d:
//       return WASMOpcodeNumber.I64Sub;
//     case 0x7e:
//       return WASMOpcodeNumber.I64Mul;
//     case 0x7f:
//       return WASMOpcodeNumber.I64DivSigned;

//     case 0x80:
//       return WASMOpcodeNumber.I64DivUnsigned;
//     case 0x81:
//       return WASMOpcodeNumber.I64RemSigned;
//     case 0x82:
//       return WASMOpcodeNumber.I64RemUnsigned;
//     case 0x83:
//       return WASMOpcodeNumber.I64And;
//     case 0x84:
//       return WASMOpcodeNumber.I64Or;
//     case 0x85:
//       return WASMOpcodeNumber.I64Xor;
//     case 0x86:
//       return WASMOpcodeNumber.I64SHL;
//     case 0x87:
//       return WASMOpcodeNumber.I64SHR_Signed;
//     case 0x88:
//       return WASMOpcodeNumber.I64SHR_Unsigned;
//     case 0x89:
//       return WASMOpcodeNumber.I64Rotl;
//     case 0x8a:
//       return WASMOpcodeNumber.I64Rotr;

//     case 0x45: // i32.eqz
//       return WASMOpcodeNumber.I32Eqz;
//     case 0x50: // i64.eqz
//       return WASMOpcodeNumber.I64Eqz;
//     case 0x51:
//       return WASMOpcodeNumber.I64Eq;
//     case 0x52:
//       return WASMOpcodeNumber.I64Neq;
//     case 0x53:
//       return WASMOpcodeNumber.I64LTSigned;
//     case 0x54:
//       return WASMOpcodeNumber.I64LTUnsigned;
//     case 0x55:
//       return WASMOpcodeNumber.I64GTSigned;
//     case 0x56:
//       return WASMOpcodeNumber.I64GTUnsigned;
//     case 0x57:
//       return WASMOpcodeNumber.I64LESigned;
//     case 0x58:
//       return WASMOpcodeNumber.I64LEUnsigned;
//     case 0x59:
//       return WASMOpcodeNumber.I64GESigned;
//     case 0x5a:
//       return WASMOpcodeNumber.I64GEUnsigned;

//     case 0x5b:
//       return WASMOpcodeNumber.F32Eq;
//     case 0x5c:
//       return WASMOpcodeNumber.F32Neq;
//     case 0x5d:
//       return WASMOpcodeNumber.F32LT;
//     case 0x5e:
//       return WASMOpcodeNumber.F32GT;
//     case 0x5f:
//       return WASMOpcodeNumber.F32LE;
//     case 0x60:
//       return WASMOpcodeNumber.F32GE;

//     case 0x67:
//       return WASMOpcodeNumber.I32CLZ;
//     case 0x68:
//       return WASMOpcodeNumber.I32CTZ;
//     case 0x69:
//       return WASMOpcodeNumber.I32POPCNT;
//     case 0x6a:
//       return WASMOpcodeNumber.I32Add;
//     case 0x6b:
//       return WASMOpcodeNumber.I32Sub;
//     case 0x6c:
//       return WASMOpcodeNumber.I32Mult;
//     case 0x6d:
//       return WASMOpcodeNumber.I32DivSigned;
//     case 0x6e:
//       return WASMOpcodeNumber.I32DivUnsigned;
//     case 0x6f:
//       return WASMOpcodeNumber.I32RemSigned;
//     case 0x70:
//       return WASMOpcodeNumber.I32RemUnsigned;
//     case 0x71:
//       return WASMOpcodeNumber.I32And;
//     case 0x72:
//       return WASMOpcodeNumber.I32Or;
//     case 0x73:
//       return WASMOpcodeNumber.I32Xor;
//     case 0x74:
//       return WASMOpcodeNumber.I32Shl;
//     case 0x75:
//       return WASMOpcodeNumber.I32ShrSigned;
//     case 0x76:
//       return WASMOpcodeNumber.I32ShrUnsigned;
//     case 0x77:
//       return WASMOpcodeNumber.I32ROTL;
//     case 0x78:
//       return WASMOpcodeNumber.I32ROTR;

//     case 0x79:
//       return WASMOpcodeNumber.I64CLZ;
//     case 0x7a:
//       return WASMOpcodeNumber.I64CTZ;
//     case 0x7b:
//       return WASMOpcodeNumber.I64POPCNT;

//     case 0x92:
//       return WASMOpcodeNumber.F32Add;
//     case 0x93:
//       return WASMOpcodeNumber.F32Sub;
//     case 0x94:
//       return WASMOpcodeNumber.F32Mul;
//     case 0x95:
//       return WASMOpcodeNumber.F32Div;
//     case 0x96:
//       return WASMOpcodeNumber.F32Min;
//     case 0x97:
//       return WASMOpcodeNumber.F32Max;
//     case 0x98:
//       return WASMOpcodeNumber.F32CopySign;

//     case 0x8b:
//       return WASMOpcodeNumber.F32Abs;
//     case 0x8c:
//       return WASMOpcodeNumber.F32Neg;
//     case 0x8d:
//       return WASMOpcodeNumber.F32Ceil;
//     case 0x8e:
//       return WASMOpcodeNumber.F32Floor;
//     case 0x8f:
//       return WASMOpcodeNumber.F32Trunc;
//     case 0x90:
//       return WASMOpcodeNumber.F32Nearest;
//     case 0x91:
//       return WASMOpcodeNumber.F32Sqrt;

//     case 0x61:
//       return WASMOpcodeNumber.F64Eq;
//     case 0x62:
//       return WASMOpcodeNumber.F64Neq;
//     case 0x63:
//       return WASMOpcodeNumber.F64LT;
//     case 0x64:
//       return WASMOpcodeNumber.F64GT;
//     case 0x65:
//       return WASMOpcodeNumber.F64Leq;
//     case 0x66:
//       return WASMOpcodeNumber.F64Geq;

//     case 0xa0:
//       return WASMOpcodeNumber.F64Add;
//     case 0xa1:
//       return WASMOpcodeNumber.F64Sub;
//     case 0xa2:
//       return WASMOpcodeNumber.F64Mul;
//     case 0xa3:
//       return WASMOpcodeNumber.F64Div;
//     case 0xa4:
//       return WASMOpcodeNumber.F64Min;
//     case 0xa5:
//       return WASMOpcodeNumber.F64Max;
//     case 0xa6:
//       return WASMOpcodeNumber.F64CopySing;

//     case 0x99:
//       return WASMOpcodeNumber.F64Abs;
//     case 0x9a:
//       return WASMOpcodeNumber.F64Neg;
//     case 0x9b:
//       return WASMOpcodeNumber.F64Ceil;
//     case 0x9c:
//       return WASMOpcodeNumber.F64Floor;
//     case 0x9d:
//       return WASMOpcodeNumber.F64Trunc;
//     case 0x9e:
//       return WASMOpcodeNumber.F64Nearest;
//     case 0x9f:
//       return WASMOpcodeNumber.F64Sqrt;

//     case 0xa7:
//       return WASMOpcodeNumber.I32Wrap_I64;
//     case 0xa8:
//       return WASMOpcodeNumber.I32Trunc_s_F32;
//     case 0xa9:
//       return WASMOpcodeNumber.I32Trunc_u_F32;
//     case 0xaa:
//       return WASMOpcodeNumber.I32Trunc_s_F64;
//     case 0xab:
//       return WASMOpcodeNumber.I32Trunc_u_F64;
//     case 0xac:
//       return WASMOpcodeNumber.I64Extend_s_I32;
//     case 0xad:
//       return WASMOpcodeNumber.I64Extend_u_I32;
//     case 0xae:
//       return WASMOpcodeNumber.I64Trunc_s_F32;
//     case 0xaf:
//       return WASMOpcodeNumber.I64Trunc_u_F32;
//     case 0xb0:
//       return WASMOpcodeNumber.I64Trunc_s_F64;
//     case 0xb1:
//       return WASMOpcodeNumber.I64Trunc_u_F64;
//     case 0xb2:
//       return WASMOpcodeNumber.F32Convert_s_I32;
//     case 0xb3:
//       return WASMOpcodeNumber.F32Convert_u_I32;
//     case 0xb4:
//       return WASMOpcodeNumber.F32Convert_s_I64;
//     case 0xb5:
//       return WASMOpcodeNumber.F32Convert_u_I64;
//     case 0xb6:
//       return WASMOpcodeNumber.F32Demote_F64;
//     case 0xb7:
//       return WASMOpcodeNumber.F64Convert_s_I32;
//     case 0xb8:
//       return WASMOpcodeNumber.F64Convert_u_I32;
//     case 0xb9:
//       return WASMOpcodeNumber.F64Convert_s_I64;
//     case 0xba:
//       return WASMOpcodeNumber.F64Convert_u_I64;
//     case 0xbb:
//       return WASMOpcodeNumber.F64Promote_F32;
//     case 0xbc:
//       return WASMOpcodeNumber.I32Reinterpret_F32;
//     case 0xbd:
//       return WASMOpcodeNumber.I64Reinterpret_F64;
//     case 0xbe:
//       return WASMOpcodeNumber.F32Reinterpret_I32;
//     case 0xbf:
//       return WASMOpcodeNumber.F64Reinterpret_I64;

//     default:
//       return undefined;
//   }
// }

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
