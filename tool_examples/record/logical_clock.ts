import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WriteFileOptions, writeFileSync } from 'node:fs';

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

function logToFile(s: string): void {
  const writeFlags: WriteFileOptions = {
    encoding: 'utf-8',
    flag: 'a',
    mode: 0o666,
  };
  // Use a relative path
  writeFileSync(
    '/home/bebenk/Desktop/VUB/3BA/bachelorproef/wasmito/recording.csv',
    s,
    writeFlags,
  );
}

export function logRecord(r: Record): void {
  let s = `${r.clock.instrs},${r.clock.interrupts}`;
  if (isRecordInterrupt(r)) {
    s += `,${r.topic},${r.payload},,,`;
  } else {
    s += ',,';
    const argsStr =
      r.instrArgs.length === 0
        ? ''
        : `${r.instrArgs.map((a) => a.value).join(';')}`;
    s += `${r.instrAddr.toString(16)},${r.instrName},${argsStr}\n`;
  }

  logToFile(s);
}

// initializing the outputfile
const writeFlags: WriteFileOptions = {
  encoding: 'utf-8',
  flag: 'w',
  mode: 0o666,
};
writeFileSync(
  '/home/bebenk/Desktop/VUB/3BA/bachelorproef/wasmito/recording.csv',
  'clk,interrupt,topic,payload,addr,instrname,args\n',
  writeFlags,
);
