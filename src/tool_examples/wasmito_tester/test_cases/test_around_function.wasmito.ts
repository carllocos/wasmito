import { createSystemSetup, oneM5StickCDev } from '../reausable_system_setups';
import { SystemTester, type TestScenario } from '../system_tester';
import {
  registerFuncForProxyCallAction,
  unregisterFuncForProxyCallAction,
} from '../reusable_actions';
import {
  AroundFunctionRequest,
  type AroundHookResponse,
} from '../../../warduino/requests/around_function_request';
import { type WARDuinoVM } from '../../../warduino/vm/warduino_vm';
import { ResponseType } from '../../../warduino/api/request_interface';
import { type TestProgram } from '../shared_interfaces';
import { TargetLanguage } from '../../../source_mappers/compilers/prog_language_selection';
import { type WATCompilerArgs } from '../../../source_mappers/compilers/wat_compilers';

const watArgs: WATCompilerArgs = {
  sourceCodePath: './src/tool_examples/wat_examples/dimmer-double-button.wat',
};
const program: TestProgram = {
  targetLanguage: TargetLanguage.WAT,
  sourceCodeCompilationArgs: watArgs,
};

/*
 * System Setup
 */

// Dev m5stick C

const m5stickDev = oneM5StickCDev('2');

const systemSetup = createSystemSetup('System with one M5StickCDev', [
  m5stickDev,
]);

systemSetup.logger = {
  name: 'ScenarioTestAroundFunction',
  level: 'debug',
};

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
      doAction: async (device: WARDuinoVM): Promise<AroundHookResponse> => {
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
const tester = new SystemTester(systemSetup);
tester.addTestScenario(testRegisterProxyCall, m5stickDev.id);
tester.addTestScenario(testFailUnregisterProxyCall, m5stickDev.id);
tester.runTests().catch(console.error);
