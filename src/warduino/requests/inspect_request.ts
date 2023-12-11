import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../api/request_interface';
import { Instruction } from '../api/instructions';
import { WasmStack } from '../../state/wasm_stack';
import { serializeUInt16BE } from '../../util/encoder';
import { type WasmState, WASM } from '../../state/wasm';

export enum InspectableState {
  pcState = '01',
  breakpointState = '02',
  callstackState = '03',
  globalsState = '04',
  tableState = '05',
  memState = '06',
  branchingTableState = '07',
  stackState = '08',
  callbacksState = '09',
  eventsState = '0a',
}

export interface StackInpsectResponse {
  stack: WASM.Value[];
}

export class InspectStack extends APIRequestNoSubscription<WasmStack> {
  getData(): string {
    return `${Instruction.Inspect}${InspectableState.stackState}\n`;
  }

  parse(input: string): WasmStack {
    try {
      const resp: StackInpsectResponse = JSON.parse(input);
      return new WasmStack(resp.stack);
    } catch (e) {
      throw new APIRequestInvalidParse('No response for inspect stack');
    }
  }
}

export class StateRequest extends APIRequestNoSubscription<WasmState> {
  private state: string[] = [];

  public includeAll(): void {
    this.state = [];
    const allStates = Object.values(InspectableState) as string[];
    allStates
      .filter((s) => !isNaN(parseInt(s, 16)))
      .forEach((s) => {
        this.pushState(s);
      });
  }

  public isRequestEmpty(): boolean {
    return this.state.length === 0;
  }

  public includePC(): StateRequest {
    this.pushState(InspectableState.pcState);
    return this;
  }

  public includeStack(): StateRequest {
    this.pushState(InspectableState.stackState);
    return this;
  }

  public includeCallstack(): StateRequest {
    this.pushState(InspectableState.callstackState);
    return this;
  }

  public includeGlobals(): StateRequest {
    this.pushState(InspectableState.globalsState);
    return this;
  }

  public includeMemory(): StateRequest {
    this.pushState(InspectableState.memState);
    return this;
  }

  public includeTable(): StateRequest {
    this.pushState(InspectableState.tableState);
    return this;
  }

  public includeBranchingTable(): StateRequest {
    this.pushState(InspectableState.branchingTableState);
    return this;
  }

  public includeBreakpoints(): StateRequest {
    this.pushState(InspectableState.breakpointState);
    return this;
  }

  public includeCallbackMappings(): StateRequest {
    this.pushState(InspectableState.callbacksState);
    return this;
  }

  public includeEvents(): StateRequest {
    this.pushState(InspectableState.eventsState);
    return this;
  }

  public generateInterrupt(): string {
    this.state.sort();
    const numberBytes = serializeUInt16BE(this.state.length);
    const stateToReq = this.state.join('');
    return `${Instruction.Inspect}${numberBytes}${stateToReq}`;
  }

  getData(): string {
    return `${this.generateInterrupt()}\n`;
  }

  private pushState(s: string): void {
    const present = this.state.find((s2) => s === s2);
    if (present === undefined) {
      this.state.push(s);
    }
  }

  public parse(line: any): any {
    let response: any = {};
    if (typeof line === 'string') {
      response = JSON.parse(line);
    } else if (typeof line === 'object') {
      response = line;
    }

    this.assertAllRequestedStateArePresent(response);
    return this.convertToWasmState(response);
  }

  private assertAllRequestedStateArePresent(response: any): void {
    for (let i = 0; i < this.state.length; i++) {
      const s = this.state[i];
      if (s === InspectableState.pcState && response.pc === undefined) {
        throw new Error('invalid state');
      } else if (
        s === InspectableState.breakpointState &&
        response.breakpoints === undefined
      ) {
        throw new Error('invalid state');
      } else if (
        s === InspectableState.callstackState &&
        response.callstack === undefined
      ) {
        throw new Error('invalid state');
      } else if (
        s === InspectableState.globalsState &&
        response.globals === undefined
      ) {
        throw new Error('invalid state');
      } else if (
        s === InspectableState.tableState &&
        response.table === undefined
      ) {
        throw new Error('invalid state');
      } else if (
        s === InspectableState.memState &&
        response.memory === undefined
      ) {
        throw new Error('invalid state');
      } else if (
        s === InspectableState.branchingTableState &&
        response.br_table === undefined
      ) {
        throw new Error('invalid state');
      } else if (
        s === InspectableState.stackState &&
        response.stack === undefined
      ) {
        throw new Error('invalid state');
      } else if (
        s === InspectableState.callbacksState &&
        response.callbacks === undefined
      ) {
        throw new Error('invalid state');
      } else if (
        s === InspectableState.eventsState &&
        response.events === undefined
      ) {
        throw new Error('invalid state');
      }
    }
  }

  private convertToWasmState(parsed: any): WasmState {
    const state: WasmState = {};
    if (parsed.pc !== undefined) {
      state.pc = parsed.pc;
    }
    if (parsed.breakpoints !== undefined) {
      state.breakpoints = parsed.breakpoints;
    }
    if (parsed.stack !== undefined) {
      state.stack = parsed.stack.map(
        (sv: { idx: number; type: string; value: number }) => {
          return {
            idx: sv.idx,
            type: WASM.typing.get(sv.type),
            value: sv.value,
          };
        },
      );
    }

    if (parsed.globals !== undefined) {
      state.globals = parsed.globals.map(
        (gv: { idx: number; type: string; value: number }) => {
          return {
            idx: gv.idx,
            type: WASM.typing.get(gv.type),
            value: gv.value,
          };
        },
      );
    }

    if (parsed.callstack !== undefined) {
      state.callstack = parsed.callstack;
    }
    if (parsed.table !== undefined) {
      if (isNaN(parsed.table.max)) {
        throw new Error(`Table max isNaN ${parsed.table.max}`);
      }

      if (isNaN(parsed.table.init)) {
        throw new Error(`Table init isNaN ${parsed.table.init}`);
      }
      state.table = {
        max: parsed.table.max,
        init: parsed.table.init,
        elements: parsed.table.elements.map((v: any) => {
          if (isNaN(v)) {
            throw new Error(`Table element isNaN ${v}`);
          }
          return v;
        }),
      };
    }
    if (parsed.memory !== undefined) {
      if (isNaN(parsed.memory.pages)) {
        throw new Error(`Memory pages isNaN ${parsed.memory.pages}`);
      }
      if (isNaN(parsed.memory.max)) {
        throw new Error(`Memory max isNaN ${parsed.memory.max}`);
      }
      if (isNaN(parsed.memory.init)) {
        throw new Error(`Memory init isNaN ${parsed.memory.init}`);
      }
      const memBytes = Uint8Array.from(parsed.memory.bytes);
      if (memBytes === undefined) {
        throw new Error(`Memory bytes are invalid ${parsed.memory.bytes}`);
      }
      state.memory = {
        pages: parsed.memory.pages,
        max: parsed.memory.max,
        init: parsed.memory.init,
        bytes: memBytes,
      };
    }
    if (parsed.br_table !== undefined) {
      const brTableSize = parseInt(parsed.br_table.size, 16);
      if (isNaN(brTableSize)) {
        throw new Error(`Invalid BR_table size ${parsed.br_table.size}`);
      }
      state.br_table = {
        size: brTableSize,
        labels: parsed.br_table.labels.map((v: any) => {
          if (isNaN(v)) {
            throw new Error(`Invalid BR_table label is NaN ${v}`);
          }
          return v;
        }),
      };
    }
    if (parsed.callbacks !== undefined) {
      state.callbacks = parsed.callbacks.map((cb: any) => {
        if (isNaN(cb.callbackid)) {
          throw new Error(`Callback id is NaN ${cb.callbackid}`);
        }
        return {
          callbackid: cb.callbackid,
          tableIndexes: cb.tableIndexes.map((i: any) => {
            if (isNaN(i)) {
              throw new Error(`Callback index is NaN ${i}`);
            }
            return i;
          }),
        };
      });
    }
    if (parsed.events !== undefined) {
      state.events = parsed.events.map((ev: any) => {
        if (typeof ev.topic !== 'string') {
          throw new Error(`event topic should be string got ${ev.topic}`);
        }

        if (typeof ev.payload !== 'string') {
          throw new Error(`event topic should be string got ${ev.topic}`);
        }
        return {
          topic: ev.topic,
          payload: ev.payload,
        };
      });
    }

    return state;
  }
}
