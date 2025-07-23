import { type WASM } from '../../src/webassembly/wasm';
import {
  createSystemSetup,
  oneM5StickCDev,
  oneM5StickCMCU,
} from '../reausable_system_setups';
import { SystemTester, type TestScenario } from '../system_tester';
import {
  addBPAndRunUntil,
  mockPrimitiveFuncAction,
  onNewEventAction,
  proxyCallAction,
  removeBPAt,
  runVMAction,
  stepAction,
  TriggerInterrupt,
} from '../reusable_actions';
import { type WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { StateRequest } from '../../src/runtimes/wasmito_vm/requests/inspect_request';
import { WasmValuesBuilder } from '../../src/webassembly/wasm_value_array_builder';
import { type TestProgram, type PostSetupConfig } from '../shared_interfaces';
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

const psM5StickCMCU: PostSetupConfig = {
  pauseAfterSetup: true,
  actions: [
    addBPAndRunUntil(getBrightness, 5000),
    removeBPAt(getBrightness, 3000),
  ],
};

const m5stickcMCU = oneM5StickCMCU('1', psM5StickCMCU);

const postSetupConfigM5Dev: PostSetupConfig = {
  pauseAfterSetup: true,
  actions: [
    mockPrimitiveFuncAction(5, 2000),
    mockPrimitiveFuncAction(6, 2000),
    mockPrimitiveFuncAction(7, 2000),
    addBPAndRunUntil(getBrightness, 5000),
    removeBPAt(getBrightness, 5000),
  ],
};

const m5stickDev = oneM5StickCDev('2', postSetupConfigM5Dev);

const systemSetup = createSystemSetup(
  'System with M5stickCMCU and one M5StickCDev',
  [m5stickcMCU, m5stickDev],
);
systemSetup.logger = {
  name: 'ScenarioThatRedirectsEventsFromCPU',
  level: 'debug',
};

/*
 * Test Cases
 */

const testHookScenario: TestScenario = {
  skipTest: true,
  testName:
    'Test if event is received after adding event hooks and manually triggering event',
  testProgram: program,
  actions: [
    onNewEventAction('OnNewEventHook', 3000),
    TriggerInterrupt(39),
    runVMAction(3000),
  ],
  expect: [
    {
      subscribeToID: 'OnNewEventHook',
      description: 'wait max 10000ms for a new event to occurr',
      checkSubscription: async (ev: WASM.Event): Promise<boolean> => {
        return true;
      },
      ifFail: 'Did not receive event in expected time',
      timeout: 10000,
    },
  ],
};

const testAddEvent: TestScenario = {
  skipTest: false,
  testName: 'Test whether adding event works',
  testProgram: program,
  actions: [
    {
      description: 'Callbacks mapping',
      doAction: async (device: WasmitoBackendVM): Promise<boolean> => {
        const ins = new StateRequest().includeCallbackMappings();
        const v = await device.sendRequest(ins);
        return v.callbacks !== undefined;
      },
      checkActionSuccess: async (v: boolean): Promise<boolean> => {
        return v;
      },
      ifFail: 'could not get callback mappings',
      timeout: 3000,
    },
  ],
};

const delayID = 0;
const [callDelay] = mainFunc.getCallInstructions(delayID);

const testPrimitiveDelayVM: TestScenario = {
  skipTest: false,
  testName: 'Test delay has right argument',
  testProgram: program,
  actions: [
    addBPAndRunUntil(
      {
        source: '',
        linenr: 113,
        colnr: -1,
        address: callDelay.startAddress,
        name: '',
      },
      5000,
    ),
    stepAction(1000),
  ],
};

const testRemoteCallPrimitiveDelayVM: TestScenario = {
  skipTest: false,
  testName: 'Test Remote call of primitive delay has right argument',
  testProgram: program,
  actions: [proxyCallAction(0, new WasmValuesBuilder().addI32Value(100), 5000)],
};

export async function run(): Promise<void> {
  const tester = new SystemTester(systemSetup);
  tester.addTestScenario(testHookScenario, m5stickDev.id);
  tester.addTestScenario(testAddEvent, m5stickDev.id);
  tester.addTestScenario(testPrimitiveDelayVM, m5stickDev.id);
  tester.addTestScenario(testRemoteCallPrimitiveDelayVM, m5stickDev.id);
  tester.addTestScenario(testHookScenario, m5stickcMCU.id); // fails leads to a block stack underflow Warduino.cpp:236
  await tester.runTests();
}

// run().catch(console.error);
