import { type WasmState, type WASM } from '../../../state/wasm';
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
} from '../reusable_actions';
import { EventRemoveHook } from '../../../hooks/hook_event';
import { Breakpoint } from '../../../debugger';
import { type PostSetupConfig } from '../shared_interfaces';

/*
 * System Setup
 */

const program = './src/tool_examples/wat_examples/dimmer-double-button.wat';

// hardware m5stick C
const m5stickcMCU = oneM5StickCMCU('1');

// Dev m5stick C
const postSetupConfigM5Dev: PostSetupConfig = {
  pauseAfterSetup: true,
  actions: [
    mockPrimitiveFuncAction(5, 2000),
    mockPrimitiveFuncAction(6, 2000),
    mockPrimitiveFuncAction(7, 2000),
    addBPAndRunUntil(88, 5000),
  ],
};
const m5stickDev = oneM5StickCDev('2', postSetupConfigM5Dev);

const systemSetup = createSystemSetup(
  'System with M5stickCMCU and one M5StickCDev',
  [m5stickcMCU, m5stickDev],
);
systemSetup.logger = {
  name: 'ScenarioThatRedirectsHandledEvents',
  level: 'debug',
};

/*
 * Test Cases
 */

const testHookOnMCUScenario: TestScenario = {
  skipTest: false,
  testName:
    'Test if event is received after adding event hooks, manually pressing on button, and handled',
  testProgram: program,
  actions: [
    onHandledEventSubscription('Event handled', 3000),
    addBreakpointSubscription(
      'breakpoint line 28',
      new Breakpoint({ linenr: 28 }),
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
      new Breakpoint({ linenr: 28 }),
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

const tester = new SystemTester(systemSetup);
tester.addTestScenario(testHookOnMCUScenario, m5stickcMCU.id);
tester.addTestScenario(testHookOnMCUScenario2, m5stickcMCU.id);
tester.addTestScenario(testHookOnDevScenario, m5stickDev.id);
tester.runTests().catch(console.error);
