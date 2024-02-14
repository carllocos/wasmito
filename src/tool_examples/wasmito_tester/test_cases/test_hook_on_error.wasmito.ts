import { createSystemSetup, oneM5StickCDev } from '../reausable_system_setups';
import { SystemTester, type TestScenario } from '../system_tester';
import { createOnErrorActionEmitter, runVMAction } from '../reusable_actions';
import { type WasmState } from '../../../state';
import { Target } from '../shared_interfaces';

/*
 * Note on the program
 * The following program is not supported on Dev VM because some imported primitive functions cannot run on the dev and need to run on a MCU.
 * The lack of the primitive functions will cause the DevVM to triger an error when the unexisting primitive function needs to be called.
 * The triggered error is exactly what we are testing here.
 */
const program = './src/tool_examples/wat_examples/dimmer-double-button.wat';

/*
 * System Setup
 */

// Dev m5stick C

const m5stickDev = oneM5StickCDev('2');

const systemSetup = createSystemSetup(
  'System with M5stickCMCU and one M5StickCDev',
  [m5stickDev],
);

systemSetup.logger = {
  name: 'ScenarioTestHookOnError',
  level: 'debug',
};

/*
 * Test Cases
 */

const testAddHookOnError: TestScenario = {
  skipTest: false,
  testName: 'Test if hookOnError gets triggered',
  testProgram: program,
  expect: [
    createOnErrorActionEmitter('OnError', 3000),
    runVMAction(1000, 1000),
    {
      subscribeToID: 'OnError',
      description: 'wait max 10000ms for a new error to occurr',
      checkSubscription: async (state: WasmState): Promise<boolean> => {
        return (
          state.exception !== undefined &&
          state.exception !== '' &&
          /^Primitive \d+ not supported$/.test(state.exception)
        );
      },
      ifFail: (state: WasmState): string => {
        return `The received exception does not match the expected state "Primitive [number] not supported". Instead got ${state.exception}`;
      },
      timeout: 20000,
    },
  ],
};

m5stickDev.toolPort = 8300;
m5stickDev.target = Target.devExternal;
const tester = new SystemTester(systemSetup);
tester.addTestScenario(testAddHookOnError, m5stickDev.id);
tester.runTests().catch(console.error);
