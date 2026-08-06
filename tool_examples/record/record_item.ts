import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { LogicalClock } from './logical_clock';

function equalLogicalClocks(_i: any, _u: any): boolean {
  return true;
}
export interface RecordInstruction {
  instrAddr: number;
  instrName: string;
  instrArgs: ReadOnlyWasmValue[];
  clock: LogicalClock;
}

export interface RecordInterrupt {
  topic: string;
  payload: string;
  pin: number;
  clock: LogicalClock;
}

export type Record = RecordInterrupt | RecordInstruction;

export function isRecordInterrupt(r: any): r is RecordInterrupt {
  return r.topic !== undefined;
}

export function isRecordInstruction(r: any): r is RecordInstruction {
  return r.topic === undefined;
}

export function logRecordings(records: Record[]): void {
  console.log(`Recorded #${records.length} entries`);
  for (const r of records) {
    logRecord(r);
  }
}

export function logRecord(r: Record): void {
  let s = `LC{instrs=${r.clock.instrs},interrupts=${r.clock.interrupts}}`;
  if (isRecordInterrupt(r)) {
    s += ` Interrupt{topic='${r.topic}', payload='${r.payload}'}\n`;
  } else {
    const argsStr =
      r.instrArgs.length === 0
        ? ''
        : `[${r.instrArgs.map((a) => a.value).join(', ')}]`;
    s += ` 0x${r.instrAddr.toString(16)} ${r.instrName} ${argsStr}\n`;
  }
  console.log(s);
}

export function sortRecords(records: Record[]): Record[] {
  records.sort((r1: Record, r2: Record) => {
    const c1 = r1.clock;
    const c2 = r2.clock;
    if (c1.instrs < c2.instrs) return -1;
    else if (c1.instrs === c2.instrs) {
      if (c1.interrupts < c2.interrupts) {
        return -1;
      } else if (c1.interrupts > c2.interrupts) {
        return 1;
      } else {
        return 0;
      }
    } else {
      return 1;
    }
  });
  return records;
}

export function getRecordedItem(
  lc: LogicalClock,
  records: Record[],
): Record | undefined {
  return records.find((r) => equalLogicalClocks(r.clock, lc));
}
