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
const m5stickcMCU = oneM5StickCMCU(program, '1');

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
const m5stickDev = oneM5StickCDev(program, '2', postSetupConfigM5Dev);

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
  testForDeviceID: m5stickcMCU.id,
  actions: [
    onHandledEventSubscription('Event handled', 3000),
    addBreakpointSubscription(
      'breakpoint line 28',
      new Breakpoint({ linenr: 28 }),
      10000,
    ),
    runVMAction(3000),
  ],
  expects: [
    {
      subscriptionID: 'Event handled',
      description: 'wait max 10000ms for a new event to occurr',
      subscriptionCheck: async (ev: WASM.Event): Promise<boolean> => {
        return ev.topic === 'interrupt_37';
      },
      ifFail: {
        message: 'Did not receive event in expected time',
        timeout: 10000,
      },
    },
    {
      subscriptionID: 'breakpoint line 28',
      description:
        'wait max 10000ms breakpoint to be reached after handling event',
      subscriptionCheck: async (state: WasmState): Promise<boolean> => {
        return true;
      },
      ifFail: {
        message: 'Did not reach bp at line 28',
        timeout: 10000,
      },
    },
  ],
};

const testHookOnMCUScenario2: TestScenario = {
  skipTest: true,
  testName:
    'Test if event is received after adding event hooks, manually pressing on button, and event is not handled due to removal',
  testForDeviceID: m5stickcMCU.id,
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
  expects: [
    {
      subscriptionID: 'Event handling hook',
      description: 'wait max 10000ms for a new event to occurr',
      subscriptionCheck: async (ev: WASM.Event): Promise<boolean> => {
        return ev.topic === 'interrupt_37';
      },
      ifFail: {
        message: 'Did not receive event in expected time',
        timeout: 10000,
      },
    },
    {
      subscriptionID: 'breakpoint line 28',
      description:
        'wait max 10000ms breakpoint to be reached after handling event',
      subscriptionCheck: async (state: WasmState): Promise<boolean> => {
        return true;
      },
      ifFail: {
        message: 'Did not reach bp at line 28',
        timeout: 10000,
      },
    },
  ],
};

const testHookOnDevScenario: TestScenario = {
  skipTest: true,
  testName:
    'Test if event is received after adding event hooks and manually pressing on button',
  testForDeviceID: m5stickDev.id,
  actions: [
    onHandledEventSubscription('Event handled', 3000),
    runVMAction(3000),
  ],
  expects: [
    {
      subscriptionID: 'Event handled',
      description: 'wait max 10000ms for a new event to occurr',
      subscriptionCheck: async (ev: WASM.Event): Promise<boolean> => {
        return true;
      },
      ifFail: {
        message: 'Did not receive event in expected time',
        timeout: 10000,
      },
    },
  ],
};

const tester = new SystemTester(systemSetup);
tester.addTestScenario(testHookOnMCUScenario);
tester.addTestScenario(testHookOnMCUScenario2);
tester.addTestScenario(testHookOnDevScenario);
tester.runTests().catch(console.error);
