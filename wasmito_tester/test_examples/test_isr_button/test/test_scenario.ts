import {
  createSystemSetup,
  oneM5StickCDev,
  oneM5StickCMCU,
} from '../../../reausable_system_setups';
import { SystemTester, type TestScenario } from '../../../system_tester';
import {
  type TestScenarioResult,
  type TestProgram,
  type PostSetupConfig,
} from '../../../shared_interfaces';
import { TargetLanguage } from '../../../../src/compilers/prog_language_selection';
import {
  addBreakpointSubscription,
  PauseAction,
  runVMAction,
  SubscribeOnBPReached,
  TriggerInterrupt,
} from '../../../reusable_actions';
import { Breakpoint } from '../../../../src/debugger/breakpoint';
import { type WasmCompilerArgs } from '../../../../src/compilers/wasm_compiler';

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

const systemSetup = createSystemSetup('DevVM', [m5stickDev, mcu]);
const arg: WasmCompilerArgs = {
  wasmPath: './wasmito_tester/test_examples/test_isr_button/wasm/main.wasm',
  mappingsJSON:
    './wasmito_tester/test_examples/test_isr_button/wasm/isr_mappings.json',
};

const program: TestProgram = {
  targetLanguage: TargetLanguage.Wasm,
  sourceCodeCompilationArgs: arg,
};

const ButtonPin = 39;
const subscriptionID = 'break on linenr 27 col 2';
const testLoadAndRunModule: TestScenario = {
  testName: 'Test If `ToggleLed` updates `LED_STATE`',
  testProgram: program,
  actions: [
    addBreakpointSubscription(
      subscriptionID,
      new Breakpoint({
        linenr: 27,
        colnr: 2,
        address: 0,
        source: '',
        name: '',
      }),
    ),
    runVMAction(),
    PauseAction(undefined, 3000),
    TriggerInterrupt(ButtonPin, 3000),
  ],
  expect: [
    runVMAction(undefined, 5000),
    SubscribeOnBPReached(subscriptionID, 3000),
    runVMAction(undefined, 5000),
    TriggerInterrupt(ButtonPin, undefined, 5000),
    SubscribeOnBPReached(subscriptionID, 3000),
  ],
};

export async function run(): Promise<TestScenarioResult[]> {
  const tester = new SystemTester(systemSetup);
  tester.addTestScenario(testLoadAndRunModule, m5stickDev.id);
  tester.addTestScenario(testLoadAndRunModule, mcu.id);
  return await tester.runTests();
}
