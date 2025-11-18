import path from 'path';
import {
  createSystemSetup,
  M5StickCFromJSON,
  oneM5StickCDev,
} from '../reausable_system_setups';
import { SystemTester, type TestScenario } from '../system_tester';
import {
  type TestScenarioResult,
  type TestProgram,
  type PostSetupConfig,
} from '../shared_interfaces';
import {
  addBreakpointSubscription,
  PauseAction,
  runVMAction,
  SubscribeOnBPReached,
  TriggerInterrupt,
} from '../reusable_actions';
import { Breakpoint } from '../../src/debugger/breakpoint';
import { NodeFromLocation } from '../util_scfgs';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';

/**
 * Device Config
 */
const postSetupConfigM5Dev: PostSetupConfig = {
  pauseAfterSetup: true,
  actions: [],
};
const m5stickDev = oneM5StickCDev('m5StickCDev', postSetupConfigM5Dev);
m5stickDev.disableStrictModuleLoad = true;
const mcu = M5StickCFromJSON('./wasmito_tester/mcus/m5stickc.json');

const systemSetup = createSystemSetup('DevVM', [m5stickDev, mcu]);
const rootDir = path.resolve('./app_examples/rust/toggle_led');
const wasmPath = path.resolve(rootDir, 'wasm/toggle_led.wasm');
const mappingsPath = path.resolve(rootDir, 'wasm/mappings.json');

const program: TestProgram = LanguageAdaptor.fromMappingsPath(mappingsPath, {
  newWasmPath: wasmPath,
  relativePaths: true,
});

const SCFGs = program.sourceCFG!;
const node = NodeFromLocation(SCFGs, {
  linenr: 27,
  colnr: -1,
  address: 0,
  source: '',
  name: '',
});

const ButtonPin = 39;
const subscriptionID = 'break on linenr 27 col 2';
const testButtonTrigger: TestScenario = {
  testName: 'Test If `ToggleLed` updates `LED_STATE`',
  testProgram: program,
  actions: [
    addBreakpointSubscription(
      subscriptionID,
      new Breakpoint(node.sourceLocation),
    ),
    runVMAction(),
    PauseAction({
      executeAfterMs: 3000,
    }),
    TriggerInterrupt(ButtonPin, { timeoutMs: 3000 }),
  ],
  expect: [
    runVMAction({
      executeAfterMs: 5000,
    }),
    SubscribeOnBPReached(subscriptionID, { timeoutMs: 3000 }),
    runVMAction({ executeAfterMs: 5000 }),
    TriggerInterrupt(ButtonPin, { executeAfterMs: 5000 }),
    SubscribeOnBPReached(subscriptionID, { timeoutMs: 3000 }),
  ],
};

export async function run(): Promise<TestScenarioResult[]> {
  const tester = new SystemTester(systemSetup);
  //tester.addTestScenario(testButtonTrigger, m5stickDev.id);
  tester.addTestScenario(testButtonTrigger, mcu.id);
  return await tester.runTests();
}
