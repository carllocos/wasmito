import { type WasmState } from '../../../state/wasm';
import {
  createSystemSetup,
  oneM5StickCDev,
  oneM5StickCMCU,
} from '../reausable_system_setups';
import { SystemTester, type TestScenario } from '../system_tester';
import {
  addBreakpointSubscription,
  mockPrimitiveFuncAction,
  runVMAction,
} from '../reusable_actions';
import { Breakpoint } from '../../../debugger/breakpoint';
import { type PostSetupConfig } from '../shared_interfaces';
import { RemoveAndProceedBreakpointPolicy } from '../../../debugger/breakpoint_policies';
import { type WARDuinoVM } from '../../../warduino/vm/warduino_vm';

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
  ],
};
const m5stickDev = oneM5StickCDev('2', postSetupConfigM5Dev);

const systemSetup = createSystemSetup(
  'System with M5stickCMCU and one M5StickCDev',
  [m5stickcMCU, m5stickDev],
);
systemSetup.logger = {
  name: 'ScenarioTestBreakpoints',
  level: 'debug',
};

/*
 * Test Cases
 */

const normalBP: TestScenario = {
  skipTest: false,
  testName: 'Test normal breakpoint',
  testProgram: program,
  actions: [
    addBreakpointSubscription(
      'BP line 91',
      new Breakpoint({ linenr: 91 }),
      3000,
    ),
    runVMAction(3000, 3000),
  ],
  expect: [
    {
      subscribeToID: 'BP line 91',
      description: 'wait max 10000ms for bp reach',
      checkSubscription: async (state: WasmState): Promise<boolean> => {
        return true;
      },
      ifFail: 'Did not hit breakpoint',
      timeout: 10000,
    },
  ],
};

const singleStopBp: TestScenario = {
  skipTest: false,
  testName: 'Test single stop breakpoint',
  testProgram: program,
  actions: [
    {
      description: 'Change breakpoint Policy',
      doAction: async (device: WARDuinoVM): Promise<boolean> => {
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
      new Breakpoint({ linenr: 91 }),
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

const tester = new SystemTester(systemSetup);
tester.addTestScenario(normalBP, m5stickDev.id);
tester.addTestScenario(singleStopBp, m5stickDev.id);
tester.runTests().catch(console.error);
