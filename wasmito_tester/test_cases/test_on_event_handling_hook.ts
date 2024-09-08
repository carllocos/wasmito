import { type WasmState, type WASM } from '../../src/webassembly/wasm';
import {
  createSystemSetup,
  oneM5StickCDev,
  oneM5StickCMCU,
} from '../reausable_system_setups';
import { SystemTester, type TestScenario } from '../system_tester';
import {
  addBPAndRunUntil,
  addBreakpointSubscription,
  mockPrimitiveFuncAction,
  onHandledEventAction,
  onHandledEventSubscription,
  runVMAction,
  TriggerInterrupt,
} from '../reusable_actions';
import { EventRemoveHook } from '../../src/hooks/hook_event';
import {
  type TestProgram,
  type PostSetupConfig,
  type TestScenarioResult,
} from '../shared_interfaces';
import { Breakpoint } from '../../src/debugger/breakpoint';
import { TargetLanguage } from '../../src/compilers/prog_language_selection';
import { type WasmCompilerArgs } from '../../src/compilers/wasm_compiler';
import {
  type SourceCodeLocation,
  SourceMap,
} from '../../src/source_mappers/source_map';
import { isConst } from '../../src/webassembly/wasm/wasm_instruction';

/*
 * System Setup
 */

const wasmArgs: WasmCompilerArgs = {
  wasmPath: './tool_examples/wat_examples/dimmer-double-button.wasm',
};

const sm = new SourceMap(wasmArgs.wasmPath, [], []);
const mainFunc = sm.wasm.getFunction(12); // fun id 12 is the main func
if (mainFunc === undefined) {
  throw new Error(`Failed to find main fun 12 in module ${wasmArgs.wasmPath}`);
}

const [localGetBrightness] = mainFunc.getLocalGetInstructions();
const getBrightness: SourceCodeLocation = {
  source: '',
  linenr: 88,
  colnr: -1,
  address: localGetBrightness.startAddress,
  name: '',
};
const program: TestProgram = {
  targetLanguage: TargetLanguage.Wasm,
  sourceCodeCompilationArgs: wasmArgs,
};

// hardware m5stick C
const m5stickcMCU = oneM5StickCMCU('1');

// Dev m5stick C
const postSetupConfigM5Dev: PostSetupConfig = {
  pauseAfterSetup: true,
  actions: [
    mockPrimitiveFuncAction(5, 2000),
    mockPrimitiveFuncAction(6, 2000),
    mockPrimitiveFuncAction(7, 2000),
    addBPAndRunUntil(getBrightness, 5000),
  ],
};
const m5stickDev = oneM5StickCDev('2', postSetupConfigM5Dev);

const systemSetup = createSystemSetup(
  'System with M5stickCMCU and one M5StickCDev',
  [m5stickcMCU, m5stickDev],
);

/*
 * Test Cases
 */

const decreateDeltaFun = sm.wasm.getFunction(8);
if (decreateDeltaFun === undefined) {
  throw new Error(
    `Failed to find decreaseDeltaFun 8 in module ${wasmArgs.wasmPath}`,
  );
}

const [i32ConstInstr] = decreateDeltaFun.allInstructions;
if (!isConst(i32ConstInstr)) {
  throw new Error(
    `first instr of decrease_delta is not an i32.const got: ${JSON.stringify(i32ConstInstr.toJSONObj())}`,
  );
}

const i32ConstLoc: SourceCodeLocation = {
  source: '',
  linenr: 28,
  colnr: 0,
  name: '',
  address: i32ConstInstr.startAddress,
};

const testHookOnMCUScenario: TestScenario = {
  skipTest: true,
  testName: 'Test if event is received after adding event hooks and handled',
  testProgram: program,
  actions: [
    onHandledEventSubscription('Event handled', 3000),
    addBreakpointSubscription(
      'breakpoint line 28',
      new Breakpoint(i32ConstLoc),
      10000,
    ),
    runVMAction(3000),
  ],
  expect: [
    {
      subscribeToID: 'Event handled',
      description: 'wait max 10000ms for a new event to occurr',
      checkSubscription: async (ev: WASM.Event): Promise<boolean> => {
        return ev.topic === 'interrupt_37';
      },
      ifFail: 'Did not receive event in expected time',
      timeout: 10000,
    },
    {
      subscribeToID: 'breakpoint line 28',
      description:
        'wait max 10000ms breakpoint to be reached after handling event',
      checkSubscription: async (state: WasmState): Promise<boolean> => {
        return true;
      },
      ifFail: 'Did not reach bp at line 28',
      timeout: 10000,
    },
  ],
};

const testHookOnMCUScenario2: TestScenario = {
  skipTest: true,
  testName:
    'Test if event is received after adding event hooks, manually pressing on button, and event is not handled due to removal',

  testProgram: program,
  actions: [
    onHandledEventSubscription('Event handling hook', 3000),
    onHandledEventAction(new EventRemoveHook(), 3000),
    addBreakpointSubscription(
      'breakpoint line 28',
      new Breakpoint(i32ConstLoc),
      10000,
    ),
    runVMAction(3000),
  ],
  expect: [
    {
      subscribeToID: 'Event handling hook',
      description: 'wait max 10000ms for a new event to occurr',
      checkSubscription: async (ev: WASM.Event): Promise<boolean> => {
        return ev.topic === 'interrupt_37';
      },
      ifFail: 'Did not receive event in expected time',
      timeout: 10000,
    },
    {
      description:
        'wait max 10000ms breakpoint to be reached after handling event',
      ifFail: 'Did not reach bp at line 28',
      timeout: 10000,

      subscribeToID: 'breakpoint line 28',
      checkSubscription: async (state: WasmState): Promise<boolean> => {
        return true;
      },
    },
  ],
};

const testHookOnDevScenario: TestScenario = {
  skipTest: true,
  testName:
    'Test if event is received after adding event hooks and manually pressing on button',
  testProgram: program,
  actions: [
    onHandledEventSubscription('Event handled', 3000),
    runVMAction(3000),
    TriggerInterrupt(39, 3000, 3000),
  ],
  expect: [
    {
      subscribeToID: 'Event handled',
      description: 'wait max 10000ms for a new event to occurr',
      checkSubscription: async (ev: WASM.Event): Promise<boolean> => {
        return true;
      },
      ifFail: 'Did not receive event in expected time',
      timeout: 10000,
    },
  ],
};

export async function run(): Promise<TestScenarioResult[]> {
  const tester = new SystemTester(systemSetup);

  // testHookOnDevScenario fails event is oonhandledEventSubscription
  tester.addTestScenario(testHookOnDevScenario, m5stickDev.id);
  tester.addTestScenario(testHookOnMCUScenario, m5stickcMCU.id);
  tester.addTestScenario(testHookOnMCUScenario2, m5stickcMCU.id);

  return await tester.runTests();
}
