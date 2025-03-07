import {
  type SourceCodeLocation,
  type SourceMap,
} from '../../src/source_mappers';
import { type RuntimeDebugAPI } from '../runtimes/runtime_api';

export interface DebugAPI {
  debuggerName: string;
  sourceMap: SourceMap;
  runtime: RuntimeDebugAPI;

  stepInto: (
    location: SourceCodeLocation,
    timeout?: number,
  ) => Promise<SourceCodeLocation>;

  stepOut: (
    location: SourceCodeLocation,
    timeout?: number,
    endAddress?: number[],
  ) => Promise<SourceCodeLocation>;

  stepOver: (
    location: SourceCodeLocation,
    timeout?: number,
    endAddress?: number[],
  ) => Promise<SourceCodeLocation>;

  startDebugger: (timeout: number) => Promise<boolean>;

  stopDebugger: (timeout: number) => Promise<boolean>;
}
