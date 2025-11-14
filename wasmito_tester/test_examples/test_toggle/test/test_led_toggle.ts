import {
  createSystemSetup,
  oneM5StickCDev,
  oneM5StickCMCU,
} from '../../../reausable_system_setups';
import { SystemTester, type TestScenario } from '../../../system_tester';
import {
  type TestScenarioResult,
  type PostSetupConfig,
  TestProgram,
} from '../../../shared_interfaces';
import {
  addBreakpointSubscription,
  PauseAction,
  runVMAction,
  SubscribeOnBPReached,
  TriggerInterrupt,
} from '../../../reusable_actions';
import { Breakpoint } from '../../../../src/debugger/breakpoint';
import { SourceMapFromJSON } from '../../../../src/source_mappers/source_map_builder';
import { LanguageAdaptor } from '../../../../src/language_adaptors/language_adaptor';

/**
 * Device Config
 */
const postSetupConfigM5Dev: PostSetupConfig = {
  pauseAfterSetup: true,
  actions: [],
};
const m5stickDev = oneM5StickCDev('m5StickCDev', postSetupConfigM5Dev);
m5stickDev.disableStrictModuleLoad = true;

const mcu = oneM5StickCMCU('m5stickCMCU', postSetupConfigM5Dev);
mcu.serialPort = '/dev/cu.usbserial-8952FFEE8B';
mcu.fqbn = 'm5stack:esp32:m5stick-c';

const systemSetup = createSystemSetup('DevVM', [m5stickDev, mcu]);
const mappingsJSON =
  './wasmito_tester/test_examples/test_toggle/wasm/mappings.json';
const sourceMap = SourceMapFromJSON(mappingsJSON);
const program: TestProgram = new LanguageAdaptor(sourceMap);

const ButtonPin = 37;
const subscriptionID = 'break on linenr 41 col 5';
const testLoadAndRunModule: TestScenario = {
  testName: 'Test If `ToggleLed` updates `LED_STATE`',
  testProgram: program,
  actions: [
    addBreakpointSubscription(
      subscriptionID,
      new Breakpoint({
        linenr: 41,
        colnr: 5,
        address: 0,
        source: '',
        name: '',
      }),
    ),
    runVMAction(),
    PauseAction({
      executeAfterMs: 3000,
    }),
    TriggerInterrupt(ButtonPin, { timeoutMs: 3000 }),
  ],
  expect: [
    runVMAction({ executeAfterMs: 5000 }),
    SubscribeOnBPReached(subscriptionID, { timeoutMs: 3000 }),
    runVMAction({ executeAfterMs: 3000 }),
    TriggerInterrupt(ButtonPin, { executeAfterMs: 5000 }),
    SubscribeOnBPReached(subscriptionID, { timeoutMs: 3000 }),
  ],
};

export async function run(): Promise<TestScenarioResult[]> {
  const tester = new SystemTester(systemSetup);
  tester.addTestScenario(testLoadAndRunModule, m5stickDev.id);
  tester.addTestScenario(testLoadAndRunModule, mcu.id);
  return await tester.runTests();
}
