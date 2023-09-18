import {
  type APIRequest,
  APIRequestInvalidParse,
  Instruction,
} from './request_interface';
import { WasmStack } from '../../state/wasm_stack';
import { type WASM } from '../../state/wasm';

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
  errorState = '0b',
}

export interface StackInpsectResponse {
  stack: WASM.Value[];
}

export class InspectStack implements APIRequest<WasmStack> {
  getData(): string {
    return `${Instruction.Inspect}${InspectableState.stackState}`;
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
