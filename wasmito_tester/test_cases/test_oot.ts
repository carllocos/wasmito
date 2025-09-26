import { type WasmState } from '../../src/webassembly/wasm';
import { createSystemSetup, oneM5StickCDev } from '../reausable_system_setups';
import { SystemTester, type TestScenario } from '../system_tester';
import {
  addBreakpointSubscription,
  mockPrimitiveFuncAction,
  runVMAction,
} from '../reusable_actions';
import { Breakpoint } from '../../src/debugger/breakpoint';
import {
  type TestProgram,
  type PostSetupConfig,
  type TestScenarioResult,
} from '../shared_interfaces';
import { RemoveAndProceedBreakpointPolicy } from '../../src/debugger/breakpoint_policies';
import { type WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { TargetLanguage } from '../../src/compilers/prog_language_selection';
import { type WasmCompilerArgs } from '../../src/compilers/wasm_compiler';
import {
  type SourceCodeLocation,
  SourceMap,
} from '../../src/source_mappers/source_map';

/*
 * System Setup
 */

const wasmArgs: WasmCompilerArgs = {
  wasmPath: './tool_examples/wat_examples/dimmer-double-button.wasm',
};

const program: TestProgram = {
  targetLanguage: TargetLanguage.Wasm,
  sourceCodeCompilationArgs: wasmArgs,
};

const postSetupConfigM5Dev: PostSetupConfig = {
  pauseAfterSetup: true,
  actions: [
    mockPrimitiveFuncAction(5, 2000),
    mockPrimitiveFuncAction(6, 2000),
    mockPrimitiveFuncAction(7, 2000),
  ],
};
const m5stickDev = oneM5StickCDev('2', postSetupConfigM5Dev);

const systemSetup = createSystemSetup('System with one M5StickCDev', [
  m5stickDev,
]);

// systemSetup.logger = {
//   name: 'ScenarioTestOutOfThings',
//   level: 'debug',
// };

const sm = new SourceMap(wasmArgs.wasmPath, [], []);
const mainFunc = sm.wasm.getFunction(12); // fun id 12 is the main func
if (mainFunc === undefined) {
  throw new Error(`Failed to find main fun 12 in module ${wasmArgs.wasmPath}`);
}

const [localSetBrightness] = mainFunc.getLocalSetInstructions();
const setBrightness: SourceCodeLocation = {
  source: '',
  linenr: 91,
  colnr: -1,
  address: localSetBrightness.startAddress,
  name: '',
};

/*
 * Test Cases
 */

const normalBP: TestScenario = {
  skipTest: true,
  testName: 'Test normal breakpoint',
  testProgram: program,
  actions: [
    addBreakpointSubscription(
      'BP line 91',
      new Breakpoint(setBrightness),
      3000,
    ),
    runVMAction(3000, 3000),
  ],
  expect: [
    {
      subscribeToID: 'BP line 91',
      description: 'wait max 10000ms for bp reach',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      checkSubscription: async (state: WasmState): Promise<boolean> => {
        return true;
      },
      ifFail: 'Did not hit breakpoint',
      timeout: 10000,
    },
  ],
};

const singleStopBp: TestScenario = {
  skipTest: true,
  testName: 'Test single stop breakpoint',
  testProgram: program,
  actions: [
    {
      description: 'Change breakpoint Policy',
      doAction: async (device: WasmitoBackendVM): Promise<boolean> => {
        const policy = new RemoveAndProceedBreakpointPolicy(device);
        device.changeBreakpointPolicy(policy);
        return true;
      },
      checkActionSuccess: async (
        successfullResponse: boolean,
      ): Promise<boolean> => {
        return successfullResponse;
      },
      ifFail: `failed to change Breakpoint Policy`,
    },
    addBreakpointSubscription(
      'BP line 91',
      new Breakpoint(setBrightness),
      3000,
    ),
    runVMAction(3000, 3000), // wait 3 seconds before executing runVMAction
  ],
  expect: [
    {
      subscribeToID: 'BP line 91',
      description: 'wait max 10000ms for bp reach',
      checkSubscription: async (state: WasmState): Promise<boolean> => {
        return state.isSnapshot();
      },
      ifFail: 'Did not hit breakpoint',
      timeout: 10000,
    },
  ],
};

export async function run(): Promise<TestScenarioResult[]> {
  const tester = new SystemTester(systemSetup);
  tester.addTestScenario(normalBP, m5stickDev.id);
  // singleStopBP fails
  tester.addTestScenario(singleStopBp, m5stickDev.id);
  return await tester.runTests();
}

// run().catch(console.error);
