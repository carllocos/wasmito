import type winston from 'winston';
import { TimeoutPromise, maybeTimeoutPromise } from '../../util/promise_util';
import { type SystemSetup, SystemDeployer } from './system_deployer';
import {
  type SubscriptionAction,
  type Action,
  type TestFailure,
  isSubscriptionAction,
} from './shared_interfaces';
import { type WARDuinoVM } from '../../warduino';
import { HookWithSubscription } from '../../hooks/hook';

export interface WhenSubscriptionCondition {
  todo?: string;
  subscriptionCheck?: (value: any) => Promise<boolean>;
  ifFail?: TestFailure;
}

export interface ExpectDescription<SubscriptionType> {
  description: string;
  subscriptionID: string | number; // action number that generates subscription data
  subscriptionCheck: (value: SubscriptionType) => Promise<boolean>;
  ifFail?: TestFailure; // TODO change to ifFail?: (value: SubscriptionType) => string; where string is exception msg
}

export interface TestScenario {
  skipTest?: boolean;
  testName: string;
  testForDeviceID: string;
  whens?: WhenSubscriptionCondition[];
  actions?: Array<Action<any> | SubscriptionAction<any, any, any>>;
  expects?: Array<ExpectDescription<any>>;
}

export enum ActionRunState {
  Failed = 'Failed',
  Success = 'Success',
  Cancelled = 'Cancelled',
  TimedOut = 'Timedout',
}

export interface ActionRunResult {
  action: Action<any> | SubscriptionAction<any, any, any>;
  result: ActionRunState;
  failMsg?: string;
  reasonFailure?: string;
}

export interface ExpectRunResult {
  expect: ExpectDescription<any>;
  result: ActionRunState;
  failMsg?: string;
  reasonFailure?: string;
}

export enum TestScenarioState {
  Success = 'Success',
  Failed = 'Failed',
  Running = 'Running',
}

export interface TestScenarioResult {
  scenario: TestScenario;
  result: TestScenarioState;
  actionRunResults: ActionRunResult[];
  expectRunResults: ExpectRunResult[];
}

export interface SystemTest {
  systemSetup: SystemSetup;
  testScenarios: TestScenario[];
}

export class SystemTester {
  private readonly systemDeployer: SystemDeployer;
  private readonly testScenarios: TestScenario[];
  private readonly deviceTestsMap: Map<string, TestScenario[]>;
  private readonly scenariosRunResults: TestScenarioResult[];

  constructor(setup: SystemSetup) {
    this.systemDeployer = new SystemDeployer(setup);
    this.testScenarios = [];
    this.deviceTestsMap = new Map();
    this.scenariosRunResults = [];
  }

  get logger(): winston.Logger {
    return this.systemDeployer.logger;
  }

  addTestScenario(scenario: TestScenario): void {
    if (scenario.skipTest !== undefined && scenario.skipTest) {
      return;
    }
    this.assertNotEmptyScenario(scenario);
    this.assertValidScenarioFields(scenario);
    this.assertDeviceIDExists(scenario);
    this.assertValidSubscriptionIDs(scenario);
    this.assertSubscriptionActionsAllHaveSubscribers(scenario);

    this.testScenarios.push(scenario);
    const deviceTests = this.deviceTestsMap.get(scenario.testForDeviceID) ?? [];
    deviceTests.push(scenario);
    this.deviceTestsMap.set(scenario.testForDeviceID, deviceTests);
    // TODO generate testrunREsutls files
  }

  async runTests(): Promise<void> {
    try {
      const devicesToIgnore = this.systemDeployer
        .devices()
        .filter((dev) => {
          return !this.deviceTestsMap.has(dev.id);
        })
        .map((dev) => dev.id);
      await this.systemDeployer.deploy(devicesToIgnore);
    } catch (e) {
      this.logger.error('Failed during System setup');
      this.logger.debug('TODO: Close VM connections');
      throw e;
    }

    for (let i = 0; i < this.testScenarios.length; i++) {
      const scenario = this.testScenarios[i];
      this.scenariosRunResults.push(await this.runTestScenario(scenario));
    }

    this.reportScenarios(this.scenariosRunResults);
  }

  private reportScenarios(testScenarios: TestScenarioResult[]): void {
    for (let i = 0; i < testScenarios.length; i++) {
      const result = testScenarios[i];
      const nameLength = result.scenario.testName.length;
      const separator = '='.repeat(nameLength);
      console.log(separator);
      console.log(
        `${result.scenario.testName} [${result.result.toUpperCase()}]`,
      );
      console.log(separator);
      console.log();
      for (let j = 0; j < result.actionRunResults.length; j++) {
        const actionResult = result.actionRunResults[j];
        console.log(
          `Action ${j} - ${actionResult.action.description} [${actionResult.result}]`,
        );
        if (actionResult.result !== ActionRunState.Success) {
          console.log(`\t ${actionResult.failMsg}`);
          console.log(`\t ${actionResult.reasonFailure}`);
          console.log();
        }
      }

      for (let y = 0; y < result.expectRunResults.length; y++) {
        const expectResult = result.expectRunResults[y];
        console.log(
          `Expect ${y} - ${expectResult.expect.description} [${expectResult.result}]`,
        );
        if (expectResult.result !== ActionRunState.Success) {
          console.log(`\t ${expectResult.failMsg}`);
          console.log(`\t ${expectResult.reasonFailure}`);
        }
        console.log();
      }
    }
  }

  private async runTestScenario(
    scenario: TestScenario,
  ): Promise<TestScenarioResult> {
    this.assertVMOfDeviceIDExists(scenario);
    // TODO move the creation of results objects to addScenario
    const actionRunResults: ActionRunResult[] =
      scenario.actions?.map((action) => {
        return {
          action,
          result: ActionRunState.Cancelled,
        };
      }) ?? [];

    const expectRunResults: ExpectRunResult[] =
      scenario.expects?.map((expect) => {
        return {
          expect,
          result: ActionRunState.Cancelled,
        };
      }) ?? [];
    const testResult: TestScenarioResult = {
      scenario,
      result: TestScenarioState.Running,
      actionRunResults,
      expectRunResults,
    };

    const vm = this.systemDeployer.deviceVM(scenario.testForDeviceID);

    const actionHooksMap = new Map<string, HookWithSubscription<any>>();
    const actionHooksMapNr = new Map<number, HookWithSubscription<any>>();
    const actions = scenario.actions ?? [];
    for (let i = 0; i < actions.length; i++) {
      const actionRunResult = actionRunResults[i];
      const action = actions[i];
      const [successful, hook] = await this.runAction(
        vm,
        action,
        actionRunResult,
        i,
      );
      if (!successful) {
        this.logger.error(
          `TestScenario '${scenario.testName}': Action #${i} failed with msg '${actionRunResult.failMsg}' and reason '${actionRunResult.reasonFailure}' `,
        );
        testResult.result = TestScenarioState.Failed;
        return testResult;
      } else {
        this.logger.info(
          `TestScenario '${scenario.testName}': Action #${i} succeeded`,
        );
        actionRunResult.result = ActionRunState.Success;
      }
      if (isSubscriptionAction(action)) {
        if (hook === undefined) {
          throw new Error(
            'a subscription action is expected to produce a hook',
          );
        }
        actionHooksMap.set(action.subscriptionID, hook);
        actionHooksMapNr.set(i, hook);
      }
    }

    const expects = scenario.expects ?? [];
    for (let i = 0; i < expects.length; i++) {
      const expect = expects[i];
      const hook =
        typeof expect.subscriptionID === 'number'
          ? actionHooksMapNr.get(expect.subscriptionID)
          : actionHooksMap.get(expect.subscriptionID);
      if (hook === undefined) {
        throw new Error(
          `Hook cannot be undefined for subscription ID ${expect.subscriptionID}`,
        );
      }
      const succeeded = await this.createSubscriptionForExpect(
        expect,
        hook,
        expectRunResults[i],
        i,
      );
      if (succeeded) {
        expectRunResults[i].result = ActionRunState.Success;
      } else {
        break;
      }
    }

    return testResult;
  }

  private async runAction(
    vm: WARDuinoVM,
    action: SubscriptionAction<any, any, any> | Action<any>,
    actionRunResult: ActionRunResult,
    actionIndex: number,
  ): Promise<[boolean, HookWithSubscription<any> | undefined]> {
    const isSubscription = isSubscriptionAction(action);
    try {
      const result = await maybeTimeoutPromise(
        action.doAction(vm),
        action.ifFail?.timeout,
      );
      let valueForCheck: any;
      let hook: HookWithSubscription<any> | undefined;
      if (isSubscription) {
        if (!Array.isArray(result) || result.length !== 2) {
          throw new Error(
            `The return type of 'doAction' is expected to be an array of 2 elements. Current type is ${typeof result}`,
          );
        }
        if (!(result[1] instanceof HookWithSubscription)) {
          throw new Error(
            `The 2th element of the array returned by 'doAction' is expected to be of type 'HookWithSubscription' current type is ${typeof result[1]}`,
          );
        }
        valueForCheck = result[0];
        hook = result[1];
      } else {
        valueForCheck = result;
      }

      const successfulCheck = await action.checkActionSuccess(valueForCheck);
      if (!successfulCheck) {
        this.fillRunActionResult(
          action,
          actionRunResult,
          `action with index #${actionIndex} failed`,
          `'checkActionSuccess' failed`,
        );
      }
      return [successfulCheck, hook];
    } catch (e) {
      this.fillRunActionResult(
        action,
        actionRunResult,
        `action with index #${actionIndex} failed`,
        `exception caused by `,
        e,
      );
      return [false, undefined];
    }
  }

  private async createSubscriptionForExpect<T>(
    expect: ExpectDescription<T>,
    hook: HookWithSubscription<T>,
    expectResult: ExpectRunResult,
    expectIdx: number,
  ): Promise<boolean> {
    const p = new Promise<boolean>((resolve, reject) => {
      // const cb: ((v: T) => void) | undefined;
      const cb = (v: T): void => {
        expect
          .subscriptionCheck(v)
          .then((v: boolean) => {
            if (cb !== undefined) {
              hook.unSubscribe(cb);
            }
            resolve(v);
          })
          .catch((err) => {
            if (cb !== undefined) {
              hook.unSubscribe(cb);
            }
            reject(err);
          });
      };

      hook.subscribe(cb);
    });
    try {
      const success = await maybeTimeoutPromise(p, expect.ifFail?.timeout);
      if (!success) {
        this.fillRunExpectResult(
          expect,
          expectResult,
          `expect at index ${expectIdx} failed`,
          `'subscriptionCheck' returns false`,
        );
      }
      return success;
    } catch (err) {
      this.fillRunExpectResult(
        expect,
        expectResult,
        `expect at index ${expectIdx} failed`,
        'exception occurred',
      );
      return false;
    }
  }

  private fillRunActionResult(
    action: SubscriptionAction<any, any, any> | Action<any>,
    actionRunResult: ActionRunResult,
    fallbackFailMsg: string,
    reasonFailMsg?: string,
    error?: any,
  ): void {
    // determine type of failure
    if (error instanceof TimeoutPromise) {
      actionRunResult.result = ActionRunState.TimedOut;
    } else {
      actionRunResult.result = ActionRunState.Failed;
    }

    actionRunResult.failMsg = action.ifFail?.message ?? fallbackFailMsg;

    // determine reason failure
    if (error !== undefined && error !== null) {
      actionRunResult.reasonFailure =
        `caused by an exception:` + error.toString();
      if (error instanceof Error) {
        actionRunResult.reasonFailure = `${error.name}: ${error.message} with stack ${error.stack}`;
      }
    } else {
      actionRunResult.reasonFailure = reasonFailMsg ?? '';
    }
  }

  private fillRunExpectResult(
    expect: ExpectDescription<any>,
    expectResult: ExpectRunResult,
    fallbackFailMsg: string,
    reasonFailMsg?: string,
    error?: any,
  ): void {
    // determine type of failure
    if (error instanceof TimeoutPromise) {
      expectResult.result = ActionRunState.TimedOut;
    } else {
      expectResult.result = ActionRunState.Failed;
    }

    expectResult.failMsg = expect.ifFail?.message ?? fallbackFailMsg;

    // determine reason failure
    if (error !== undefined && error !== null) {
      expectResult.reasonFailure = `caused by an exception:` + error.toString();
      if (error instanceof Error) {
        expectResult.reasonFailure = `${error.name}: ${error.message} with stack ${error.stack}`;
      }
    } else {
      expectResult.reasonFailure = reasonFailMsg ?? '';
    }
  }

  private assertValidSubscriptionIDs(scenario: TestScenario): void {
    // Assert that the defined actions have unique subscriptionIDs
    const encounteredSubIDs = new Set<string>();
    scenario.actions?.forEach((ac) => {
      if (isSubscriptionAction(ac)) {
        if (encounteredSubIDs.has(ac.subscriptionID)) {
          throw new Error(
            `'${scenario.testName}': Action for subscription cannot have duplicate subscription IDs. ID  ${ac.subscriptionID}`,
          );
        }
      }
    });

    // Assert that the expects subscribe to actions that generate subcription data
    const actions = scenario.actions ?? [];
    const expects = scenario.expects ?? [];
    for (let i = 0; i < expects.length; i++) {
      const expect = expects[i];
      const id = expect.subscriptionID;
      if (typeof id === 'number') {
        if (id >= actions.length || id < 0) {
          throw new Error(
            `'${scenario.testName}': expect uses unexisting action with index ${id}`,
          );
        }
        if (isSubscriptionAction(actions[id])) {
          throw new Error(
            `'${scenario.testName}': expect uses action at index ${id} which does not produce subscription data`,
          );
        }
      } else {
        const foundAction = scenario.actions?.find((ac) => {
          return isSubscriptionAction(ac) && ac.subscriptionID === id;
        });
        if (foundAction === undefined) {
          throw new Error(
            `'${scenario.testName}': expect attempts to subsribe to an action with subscriptionID=${id} but no such action was provided`,
          );
        }
      }
    }
  }

  private assertSubscriptionActionsAllHaveSubscribers(
    scenario: TestScenario,
  ): void {
    if (scenario.expects === undefined) {
      return;
    }
    const actions = scenario.actions ?? [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (!isSubscriptionAction(action)) {
        continue;
      }
      const found = scenario.expects?.find((e) => {
        if (typeof e.subscriptionID === 'number') {
          return e.subscriptionID === i;
        } else {
          return e.subscriptionID === action.subscriptionID;
        }
      });

      if (found === undefined) {
        throw new Error(
          `No 'expect' subscribed to action ID ${action.subscriptionID} at index #${i}`,
        );
      }
    }
  }

  private assertDeviceIDExists(scenario: TestScenario): void {
    const device = this.systemDeployer.device(scenario.testForDeviceID);
    if (device === undefined) {
      throw Error(
        `Test scenario written for unexisting device with id ${scenario.testForDeviceID}`,
      );
    }
  }

  private assertVMOfDeviceIDExists(scenario: TestScenario): void {
    if (!this.systemDeployer.hasVMDevice(scenario.testForDeviceID)) {
      throw Error(
        `Test scenario written device id ${scenario.testForDeviceID} has no VM assigned to it`,
      );
    }
  }

  private assertNotEmptyScenario(scenario: TestScenario): void {
    if (
      scenario.actions === undefined &&
      scenario.whens === undefined &&
      scenario.expects === undefined
    ) {
      throw Error('Test scenario written has nothing to test');
    }
  }

  private assertValidScenarioFields(scenario: TestScenario): void {
    this.logger.warn('Test if scenario has all required fields');
  }
}
