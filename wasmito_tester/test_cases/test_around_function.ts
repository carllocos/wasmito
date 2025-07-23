import { createSystemSetup, oneM5StickCDev } from '../reausable_system_setups';
import { SystemTester, type TestScenario } from '../system_tester';
import {
  registerFuncForProxyCallAction,
  unregisterFuncForProxyCallAction,
} from '../reusable_actions';
import {
  AroundFunctionRequest,
  type AroundHookResponse,
} from '../../src/runtimes/requests/around_function_request';
import { type WasmitoBackendVM } from '../../src/runtimes/vm/warduino_vm';
import { ResponseType } from '../../src/runtimes/api/request_interface';
import {
  type TestScenarioResult,
  type TestProgram,
} from '../shared_interfaces';
import { TargetLanguage } from '../../src/compilers/prog_language_selection';
import { type WasmCompilerArgs } from '../../src/compilers/wasm_compiler';

const wasmArgs: WasmCompilerArgs = {
  wasmPath: './tool_examples/wat_examples/dimmer-double-button.wasm',
};
const program: TestProgram = {
  targetLanguage: TargetLanguage.Wasm,
  sourceCodeCompilationArgs: wasmArgs,
};

/*
 * System Setup
 */

// Dev m5stick C

const m5stickDev = oneM5StickCDev('2');

const systemSetup = createSystemSetup('System with one M5StickCDev', [
  m5stickDev,
]);
/*
 * Test Cases
 */

const testRegisterProxyCall: TestScenario = {
  skipTest: false,
  testName: 'Test register and unregister function for proxyCall',
  testProgram: program,
  actions: [
    registerFuncForProxyCallAction(2, 3000),
    unregisterFuncForProxyCallAction(2, 3000),
    registerFuncForProxyCallAction(2, 3000),
    unregisterFuncForProxyCallAction(2, 3000),
  ],
};

const testFailUnregisterProxyCall: TestScenario = {
  skipTest: false,
  testName:
    'Unregister not yet registered function for proxy call gives error response',
  testProgram: program,
  actions: [
    {
      timeout: 3000,
      description: 'unregister a function not yet registered',
      doAction: async (device: WasmitoBackendVM): Promise<AroundHookResponse> => {
        const aroundRequest = new AroundFunctionRequest(2);
        return await device.sendRequest(aroundRequest.removeRequest());
      },
      checkActionSuccess: async (
        response: AroundHookResponse,
      ): Promise<boolean> => {
        return response.responseType === ResponseType.ErrorResponse;
      },
      ifFail: (response: AroundHookResponse): string => {
        return `Error Response expected got ${response.responseType}`;
      },
    },
  ],
};

// uncomment for testing on external vm
// import { Target } from '../shared_interfaces';
// m5stickDev.toolPort = 8300;
// m5stickDev.target = Target.devExternal;
export async function run(): Promise<TestScenarioResult[]> {
  const tester = new SystemTester(systemSetup);
  tester.addTestScenario(testRegisterProxyCall, m5stickDev.id);
  tester.addTestScenario(testFailUnregisterProxyCall, m5stickDev.id);
  return await tester.runTests();
}
