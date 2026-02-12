import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';

export interface LogicalClock {
  instrs: number;
  interrupts: number;
}

export function copyClock(c: LogicalClock): LogicalClock {
  return {
    instrs: c.instrs,
    interrupts: c.interrupts,
  };
}

export function newLogicalClock(): LogicalClock {
  return {
    instrs: 0,
    interrupts: 0,
  };
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
  clock: LogicalClock;
}

export type Record = RecordInterrupt | RecordInstruction;

export function isRecordInterrupt(r: any): r is RecordInterrupt {
  return r.topic !== undefined;
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
