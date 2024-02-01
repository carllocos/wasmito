import { type WASM } from '../../../state/wasm';
import {
  createSystemSetup,
  oneM5StickCDev,
  oneM5StickCMCU,
} from '../reausable_system_setups';
import { SystemTester, type TestScenario } from '../system_tester';
import { type PostSetupConfig } from '../system_deployer';
import {
  addBPAndRunUntil,
  mockPrimitiveFuncAction,
  onNewEventAction,
  proxyCallAction,
  removeBPAt,
  runVMAction,
  stepAction,
} from '../reusable_actions';
import { type WARDuinoVM } from '../../../warduino/vm/warduino_vm';
import { StateRequest } from '../../../warduino/requests/inspect_request';
import { InspectStateHook } from '../../../hooks/hook_inspect_state';
import { WasmValuesBuilder } from '../../../state/wasm_value_array_builder';

/*
 * System Setup
 */

const program = './src/tool_examples/wat_examples/dimmer-double-button.wat';

const psM5StickCMCU: PostSetupConfig = {
  pauseAfterSetup: true,
  actions: [addBPAndRunUntil(88, 5000), removeBPAt(88, 3000)],
};

const m5stickcMCU = oneM5StickCMCU(program, '1', psM5StickCMCU);
m5stickcMCU.serialPort = '/dev/ttyUSB1';

const postSetupConfigM5Dev: PostSetupConfig = {
  pauseAfterSetup: true,
  actions: [
    mockPrimitiveFuncAction(5, 2000),
    mockPrimitiveFuncAction(6, 2000),
    mockPrimitiveFuncAction(7, 2000),
    addBPAndRunUntil(88, 5000),
    removeBPAt(88, 5000),
  ],
};

const m5stickDev = oneM5StickCDev(program, '2', postSetupConfigM5Dev);

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

const testHookOnMCUScenario: TestScenario = {
  skipTest: true,
  testName:
    'Test if event is received after adding event hooks and manually pressing on button',
  testForDeviceID: m5stickcMCU.id,
  actions: [onNewEventAction('OnNewEventHook', 3000), runVMAction(3000)],
  expects: [
    {
      subscriptionID: 'OnNewEventHook',
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

const testHookOnDevScenario: TestScenario = {
  skipTest: true,
  testName: 'Test if event is received after adding event hooks on Dev VM',
  testForDeviceID: m5stickDev.id,
  actions: [onNewEventAction('OnNewEventHook', 3000), runVMAction(3000)],
  expects: [
    {
      subscriptionID: 'OnNewEventHook',
      description: 'Wait max 10000ms for a new event to occur on VM',
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

const testHookOnDevScenario2: TestScenario = {
  skipTest: true,
  testName: 'Test whether Callbackmapping hook works onNewEvent',
  testForDeviceID: m5stickDev.id,
  actions: [
    onNewEventAction('OnNewEventHook', 3000),
    {
      description: 'Add hook Callbackmapping',
      doAction: async (device: WARDuinoVM): Promise<boolean> => {
        const reply = await device.addHookOnNewEvent(
          new InspectStateHook(new StateRequest().includeCallbackMappings()),
        );
        return reply;
      },

      checkActionSuccess: async (added: boolean): Promise<boolean> => {
        return added;
      },
      ifFail: {
        message: 'Failed to add callbackmapping hook on new event',
        timeout: 3000,
      },
    },
  ],
};

// m5stickDev.target = 'dev-external';
// m5stickDev.toolPort = 8300;

const testAddEvent: TestScenario = {
  skipTest: true,
  testName: 'Test whether adding event works',
  testForDeviceID: m5stickDev.id,
  actions: [
    {
      description: 'Callbacks mapping',
      doAction: async (device: WARDuinoVM): Promise<boolean> => {
        const ins = new StateRequest().includeCallbackMappings();
        const v = await device.sendRequest(ins);
        return v.callbacks !== undefined;
      },
      checkActionSuccess: async (v: boolean): Promise<boolean> => {
        return v;
      },
      ifFail: {
        message: 'could not get callback mappings',
        timeout: 3000,
      },
    },
    // addEventAction('interrupt_1', '', 3000),
    // addEventAction('interrupt_1', '', 3000),
    // updateMappingsAction(
    //   [
    //     {
    //       callbackid: 'interrupt_39',
    //       tableIndexes: [8, 9],
    //     },
    //     { callbackid: 'interrupt_37', tableIndexes: [9, 8] },
    //   ],
    //   3000,
    // ),
  ],
};

m5stickDev.target = 'dev-external';
m5stickDev.toolPort = 8300;
const testPrimitiveDelayVM: TestScenario = {
  skipTest: true,
  testName: 'Test delay has right argument',
  testForDeviceID: m5stickDev.id,
  actions: [addBPAndRunUntil(113, 5000), stepAction(1000)],
};

const testRemoteCallPrimitiveDelayVM: TestScenario = {
  skipTest: false,
  testName: 'Test Remote call of primitive delay has right argument',
  testForDeviceID: m5stickDev.id,
  actions: [proxyCallAction(0, new WasmValuesBuilder().addI32Value(100), 5000)],
};

const tester = new SystemTester(systemSetup);
tester.addTestScenario(testHookOnMCUScenario);
tester.addTestScenario(testHookOnDevScenario);
tester.addTestScenario(testHookOnDevScenario2);
tester.addTestScenario(testAddEvent);
tester.addTestScenario(testPrimitiveDelayVM);
tester.addTestScenario(testRemoteCallPrimitiveDelayVM);
tester.runTests().catch(console.error);
