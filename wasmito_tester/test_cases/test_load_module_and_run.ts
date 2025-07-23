import { createSystemSetup, oneM5StickCDev } from '../reausable_system_setups';
import { SystemTester, type TestScenario } from '../system_tester';
import {
  type TestScenarioResult,
  type TestProgram,
} from '../shared_interfaces';
import { TargetLanguage } from '../../src/compilers/prog_language_selection';
import { runVMAction } from '../reusable_actions';
import { StateRequest } from '../../src/runtimes/requests/inspect_request';
import { type WasmitoBackendVM } from '../../src/runtimes/vm/warduino_vm';
import { type WasmState } from '../../src/webassembly/wasm';

/*
 * Test case that will deploy a wasm module on a DevVM
 * and run it for a max of seconds
 */

export async function run(
  wasmPath: string,
  runningTime: number,
): Promise<TestScenarioResult[]> {
  const m5stickDev = oneM5StickCDev('2');
  m5stickDev.disableStrictModuleLoad = false;
  const systemSetup = createSystemSetup('DevVM', [m5stickDev]);
  systemSetup.logger = {
    name: 'LoadWasmAndRun',
    level: 'debug',
  };

  const program: TestProgram = {
    targetLanguage: TargetLanguage.Wasm,
    sourceCodeCompilationArgs: {
      wasmPath,
    },
  };

  let firstPC: number | undefined;
  const milliSecs = runningTime * 1000;
  const testLoadAndRunModule: TestScenario = {
    testName: `Test If wasm ${wasmPath} loads and runs on DevVm`,
    testProgram: program,
    actions: [
      {
        description: 'Ask for initial pc',
        timeout: milliSecs,
        doAction: async (dev: WasmitoBackendVM): Promise<WasmState> => {
          const request = new StateRequest();
          request.includePC();
          return await dev.inspect(request);
        },

        checkActionSuccess: async (s: WasmState): Promise<boolean> => {
          const success = s.pc !== undefined && s.pc > 0;
          if (success) {
            firstPC = s.pc;
          }
          return success;
        },
      },
      runVMAction(milliSecs),
    ],
    expect: [
      {
        description: `Ask for pc after running for ${runningTime} s`,
        delay: milliSecs,
        timeout: milliSecs,
        doAction: async (dev: WasmitoBackendVM): Promise<WasmState> => {
          const request = new StateRequest();
          request.includePC();
          return await dev.inspect(request);
        },
        checkActionSuccess: async (s: WasmState): Promise<boolean> => {
          return s.pc !== undefined && s.pc > 0 && firstPC !== s.pc;
        },
        ifFail: (s: WasmState): string => {
          return `oldPC ${firstPC} has mismatch with current pc ${s.pc}`;
        },
      },
    ],
  };
  const tester = new SystemTester(systemSetup);
  tester.addTestScenario(testLoadAndRunModule, m5stickDev.id);
  return await tester.runTests();
}
