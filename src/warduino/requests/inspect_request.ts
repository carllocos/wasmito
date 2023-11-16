import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../api/request_interface';
import { Instruction } from '../api/instructions';
import { WasmStack } from '../../state/wasm_stack';
import { serializeUInt16BE } from '../../util/encoder';
import { type WasmState, type WASM } from '../../state/wasm';

enum InspectableState {
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
    return response;
  }
}
