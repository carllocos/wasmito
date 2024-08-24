import type winston from 'winston';
import {
  TimeoutPromise,
  maybeTimeoutPromise,
} from '../src/util/promise_util';
import { SystemDeployer } from './system_deployer';
import {
  type SubscriptionEmitterAction,
  type Action,
  isSubscriptionEmitterAction,
  type TestScenario,
  type TestScenarioResult,
  ActionRunState,
  type ActionRunResult,
  TestScenarioState,
  type DevicesLab,
  type Act,
  isDelayedAction,
  isAction,
  isActionThatSubscribesTo,
  type SubscribeAction,
} from './shared_interfaces';
import { type WARDuinoVM } from '../src/warduino';
import { HookWithSubscription } from '../src/hooks/hook';

export class SystemTester {
  private readonly systemDeployer: SystemDeployer;
  private readonly testScenarios: Array<
    [string, TestScenario, TestScenarioResult]
  >;

  private readonly deviceTestsMap: Map<string, TestScenario[]>;

  constructor(setup: DevicesLab) {
    this.systemDeployer = new SystemDeployer(setup);
    this.testScenarios = [];
    this.deviceTestsMap = new Map();
  }

  get logger(): winston.Logger {
    return this.systemDeployer.logger;
  }

  addTestScenario(scenario: TestScenario, targetDeviceID: string): void {
    if (scenario.skipTest !== undefined && scenario.skipTest) {
      return;
    }
    this.assertNotEmptyScenario(scenario);
    this.assertValidScenarioFields(scenario);
    this.assertDeviceIDExists(targetDeviceID);
    this.assertUniqueSubscriptionIDs(scenario);
    this.assertSubscriptionOnlyToExistingID(scenario);
    this.assertSubscriptionActionsAllHaveSubscribers(scenario);

    const deviceTests = this.deviceTestsMap.get(targetDeviceID) ?? [];
    deviceTests.push(scenario);
    this.deviceTestsMap.set(targetDeviceID, deviceTests);

    this.testScenarios.push([
      targetDeviceID,
      scenario,
      this.createTestScenarioResult(scenario),
    ]);
  }

  private createTestScenarioResult(scenario: TestScenario): TestScenarioResult {
    const actionRunResults: ActionRunResult[] =
      scenario.actions?.map((action) => {
        return {
          action,
          result: ActionRunState.Cancelled,
        };
      }) ?? [];

    const expectRunResults: ActionRunResult[] =
      scenario.expect?.map((expect) => {
        return {
          action: expect,
          result: ActionRunState.Cancelled,
        };
      }) ?? [];
    const testResult: TestScenarioResult = {
      scenario,
      result: TestScenarioState.Running,
      actionRunResults,
      expectRunResults,
    };

    return testResult;
  }

  private async setupDevice(
    scenario: TestScenario,
    deviceID: string,
  ): Promise<void> {
    try {
      await this.systemDeployer.deployOnDevice(scenario, deviceID);
    } catch (e) {
      this.logger.error('Failed during System setup');
      this.logger.debug('TODO: Close VM connections');
      throw e;
    }
  }

  async runTests(): Promise<void> {
    for (let i = 0; i < this.testScenarios.length; i++) {
      const [targetDeviceID, scenario, scenarioResult] = this.testScenarios[i];
      await this.setupDevice(scenario, targetDeviceID);
      await this.runTestScenario(targetDeviceID, scenario, scenarioResult);
    }

    this.reportScenarios(
      this.testScenarios.map((v) => {
        return v[2];
      }),
    );
  }

  private reportScenarios(testScenarios: TestScenarioResult[]): void {
    for (let i = 0; i < testScenarios.length; i++) {
      const result = testScenarios[i];
      const testNameTitle = `${
        result.scenario.testName
      } [${result.result.toUpperCase()}]`;
      const titleLength = testNameTitle.length;
      const separator = '='.repeat(titleLength);
      console.log(separator);
      console.log(testNameTitle);
      console.log(separator);
      console.log();
      for (let j = 0; j < result.actionRunResults.length; j++) {
        const actionResult = result.actionRunResults[j];
        console.log(
          `Action ${j} - ${actionResult.action.description} [${actionResult.result}]`,
        );
        if (
          actionResult.result !== ActionRunState.Success &&
          actionResult.result !== ActionRunState.Delayed &&
          actionResult.result !== ActionRunState.Cancelled
        ) {
          console.log(`\t ${actionResult.failMsg}`);
          console.log();
        }
      }

      for (let y = 0; y < result.expectRunResults.length; y++) {
        const expectResult = result.expectRunResults[y];
        console.log(
          `Expect ${y} - ${expectResult.action.description} [${expectResult.result}]`,
        );
        if (expectResult.result !== ActionRunState.Success) {
          console.log(`\t ${expectResult.failMsg}`);
        }
        console.log();
      }
    }
  }

  private async runTestScenario(
    targetDeviceID: string,
    scenario: TestScenario,
    scenarioResult: TestScenarioResult,
  ): Promise<void> {
    this.assertVMOfDeviceIDExists(targetDeviceID);
    const vm = this.systemDeployer.deviceVM(targetDeviceID);
    const actionHooksMap = new Map<string, HookWithSubscription<any>>();

    const doExpects = await this.runActions(
      vm,
      scenario.testName,
      scenario.actions ?? [],
      scenarioResult.actionRunResults,
      actionHooksMap,
    );

    if (!doExpects) {
      return;
    }

    await this.runExpects(
      vm,
      scenario.testName,
      scenario.expect ?? [],
      scenarioResult.expectRunResults,
      actionHooksMap,
    );
  }

  private async runActions(
    vm: WARDuinoVM,
    scenarioName: string,
    actions: Array<Act<any, any, any>>,
    actionRunResults: ActionRunResult[],
    hookMap: Map<string, HookWithSubscription<any>>,
  ): Promise<boolean> {
    for (let i = 0; i < actions.length; i++) {
      const actionRunResult = actionRunResults[i];
      const action = actions[i];
      if (isDelayedAction(action)) {
        actionRunResult.result = ActionRunState.Delayed;
        this.delayAction(scenarioName, action, actionRunResult, i, vm);
        continue;
      }

      try {
        let success = false;
        let resultValue: any;
        if (isSubscriptionEmitterAction(action)) {
          [resultValue, success] = await this.runActionToEmitSubscriptionValues(
            vm,
            action,
            i,
            hookMap,
          );
        } else if (isActionThatSubscribesTo(action)) {
          [resultValue, success] = await this.runActionThatSubscribesTo(
            action,
            i,
            hookMap,
          );
        } else if (isAction(action)) {
          [resultValue, success] = await this.runAction(vm, action);
        } else {
          throw new Error(`Invalid type action`);
        }

        if (success) {
          actionRunResult.result = ActionRunState.Success;
        } else {
          this.fillRunActionAsFailed(
            resultValue,
            action,
            actionRunResult,
            `check on action with index #${i} is false`,
          );
          return false;
        }
      } catch (e) {
        this.fillRunActionDueToError(
          e,
          actionRunResult,
          `action with index #${i} failed due to exception`,
        );
        return false;
      }
    }
    return true;
  }

  private async runActionToEmitSubscriptionValues<
    R,
    H,
    S extends HookWithSubscription<H>,
  >(
    vm: WARDuinoVM,
    action: SubscriptionEmitterAction<R, H, S>,
    actionIndex: number,
    hookMap: Map<string, HookWithSubscription<any>>,
  ): Promise<[R, boolean]> {
    const result = await maybeTimeoutPromise(
      action.setupSubscription(vm),
      action.timeout,
    );
    this.assertValidSubscriptionActionReturnType(actionIndex, result);
    const valueForCheck = result[0];
    const successfulCheck = await action.checkSetupSuccess(valueForCheck);
    if (successfulCheck) {
      const hook = result[1];
      hookMap.set(action.subscriptionID, hook);
    }
    return [valueForCheck, successfulCheck];
  }

  private async runExpects(
    vm: WARDuinoVM,
    scenarioName: string,
    expects: Array<Act<any, any, any>>,
    expectsResults: ActionRunResult[],
    hookMap: Map<string, HookWithSubscription<any>>,
  ): Promise<boolean> {
    return await this.runActions(
      vm,
      scenarioName,
      expects,
      expectsResults,
      hookMap,
    );
  }

  private logActionSuccess(
    successful: boolean,
    scenarioName: string,
    actionIndex: number,
    actionRunResult: ActionRunResult,
  ): void {
    if (!successful) {
      this.logger.error(
        `TestScenario '${scenarioName}': Action #${actionIndex} failed with msg '${actionRunResult.failMsg}'`,
      );
    } else {
      this.logger.info(
        `TestScenario '${scenarioName}': Action #${actionIndex} succeeded`,
      );
    }
  }

  private async runActionThatSubscribesTo<
    T,
    H,
    S extends HookWithSubscription<H>,
  >(
    action: SubscribeAction<H, S>,
    actionIndex: number,
    hookMap: Map<string, HookWithSubscription<any>>,
  ): Promise<[T, boolean]> {
    const hook = hookMap.get(action.subscribeToID);
    if (hook === undefined) {
      throw Error(
        `Action ${actionIndex} is attempting to subscribe to an unexisting subscriptionID '${action.subscribeToID}'`,
      );
    }
    return await this.subscribeToHook(action, hook);
  }

  private async runAction<T>(
    vm: WARDuinoVM,
    action: Action<T>,
  ): Promise<[T, boolean]> {
    const r = await action.doAction(vm);
    const s = await action.checkActionSuccess(r);
    return [r, s];
  }

  private delayAction<T>(
    scenarioName: string,
    action: Action<T>,
    actionRunResult: ActionRunResult,
    actionIndex: number,
    vm: WARDuinoVM,
  ): void {
    const isDelayed = action.delay !== undefined;
    actionRunResult.result = ActionRunState.Delayed;
    setTimeout(() => {
      this.runDelayedAction(
        scenarioName,
        action,
        actionRunResult,
        actionIndex,
        vm,
      );
    }, action.delay);

    if (isDelayed) {
      this.logger.info(
        `TestScenario '${scenarioName}': Action #${actionIndex} '${action.description}' delayed for #${action.delay} ms`,
      );
    } else {
      this.logger.error(
        `TestScenario '${scenarioName}': attempting to delay Action #${actionIndex} '${action.description}' which cannot be delayed without 'delay' field`,
      );
    }
  }

  private runDelayedAction<T>(
    scenarioName: string,
    action: Action<T>,
    actionRunResult: ActionRunResult,
    actionIndex: number,
    vm: WARDuinoVM,
  ): void {
    let successFul = false;
    let errorOccurred = false;
    let actionResult: any;
    const p = new Promise<boolean>((resolve, reject) => {
      action
        .doAction(vm)
        .then((v) => {
          actionResult = v;
          action.checkActionSuccess(v).then(resolve).catch(reject);
        })
        .catch(reject);
    });

    maybeTimeoutPromise(p, action.timeout)
      .then((successCheck) => {
        if (!successCheck) {
          this.fillRunActionAsFailed(
            actionResult,
            action,
            actionRunResult,
            `check on action with index #${actionIndex} is false`,
          );
        }
        successFul = successCheck;
      })
      .catch((err) => {
        errorOccurred = true;
        this.fillRunActionDueToError(
          err,
          actionRunResult,
          `action with index #${actionIndex} failed due to exception`,
        );
      })
      .finally(() => {
        if (!errorOccurred) {
          if (successFul) {
            actionRunResult.result = ActionRunState.Success;
          } else {
            actionRunResult.result = ActionRunState.Failed;
          }
          this.logActionSuccess(
            successFul,
            scenarioName,
            actionIndex,
            actionRunResult,
          );
        } else {
          this.logActionSuccess(
            false,
            scenarioName,
            actionIndex,
            actionRunResult,
          );
        }
      });
  }

  private async subscribeToHook<T>(
    action: SubscribeAction<any, any>,
    hook: HookWithSubscription<any>,
  ): Promise<[T, boolean]> {
    const p = new Promise<[T, boolean]>((resolve, reject) => {
      const cb = (r: T): void => {
        action
          .checkSubscription(r)
          .then((v: boolean) => {
            if (cb !== undefined) {
              hook.unSubscribe(cb);
            }
            resolve([r, v]);
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
    return await maybeTimeoutPromise(p, action.timeout);
  }

  private fillRunActionAsFailed(
    actionResult: any,
    action: Act<any, any, any>,
    actionRunResult: ActionRunResult,
    fallbackFailMsg: string,
  ): void {
    actionRunResult.result = ActionRunState.Failed;

    let msg = fallbackFailMsg;
    if (action.ifFail !== undefined) {
      if (typeof action.ifFail === 'function') {
        msg = action.ifFail(actionResult);
      } else if (typeof action.ifFail === 'string') {
        msg = action.ifFail;
      } else {
        this.logger.error(
          `Action does not provide a function or a string for ifFail value`,
        );
      }
    }

    actionRunResult.failMsg = msg;
  }

  private fillRunActionDueToError(
    error: any,
    actionRunResult: ActionRunResult,
    fallbackFailMsg: string,
  ): void {
    // determine type of failure
    if (error instanceof TimeoutPromise) {
      actionRunResult.result = ActionRunState.TimedOut;
    } else {
      actionRunResult.result = ActionRunState.Failed;
    }

    if (error !== undefined && error !== null) {
      if (error instanceof Error) {
        actionRunResult.failMsg = `exception occurred: ${error.name}: ${error.message} with stack ${error.stack}`;
      } else {
        actionRunResult.failMsg = `exception occurred: ` + error.toString();
      }
    } else {
      actionRunResult.failMsg = fallbackFailMsg ?? 'exception occurred';
    }
  }

  private assertUniqueSubscriptionIDs(scenario: TestScenario): void {
    // Assert that the defined actions have unique subscriptionIDs
    const encounteredSubIDs = new Set<string>();
    scenario.actions?.forEach((ac) => {
      if (isSubscriptionEmitterAction(ac)) {
        if (encounteredSubIDs.has(ac.subscriptionID)) {
          throw new Error(
            `'${scenario.testName}': Subscription Action cannot have duplicate subscription IDs. ID  ${ac.subscriptionID}`,
          );
        }
      }
    });
    scenario.expect?.forEach((ac) => {
      if (isSubscriptionEmitterAction(ac)) {
        if (encounteredSubIDs.has(ac.subscriptionID)) {
          throw new Error(
            `'${scenario.testName}': Subscription Action cannot have duplicate subscription IDs. ID  ${ac.subscriptionID}`,
          );
        }
      }
    });
  }

  private assertSubscriptionOnlyToExistingID(scenario: TestScenario): void {
    const encounteredSubIDs = new Set<string>();
    scenario.actions?.forEach((ac) => {
      if (isSubscriptionEmitterAction(ac)) {
        encounteredSubIDs.add(ac.subscriptionID);
      } else if (
        isAction(ac) &&
        ac.subscribeTo !== undefined &&
        !encounteredSubIDs.has(ac.subscribeTo)
      ) {
        throw new Error(
          `'${scenario.testName}': Action can only subscribe to previously introduced subscription actions. No subscription action with ID  ${ac.subscribeTo} introduced`,
        );
      }
    });
    scenario.expect?.forEach((ac) => {
      if (isSubscriptionEmitterAction(ac)) {
        encounteredSubIDs.add(ac.subscriptionID);
      } else if (
        isAction(ac) &&
        ac.subscribeTo !== undefined &&
        !encounteredSubIDs.has(ac.subscribeTo)
      ) {
        throw new Error(
          `'${scenario.testName}': Action can only subscribe to previously introduced subscription actions. No subscription action with ID  ${ac.subscribeTo} was previously introduced`,
        );
      }
    });
  }

  private assertSubscriptionActionsAllHaveSubscribers(
    scenario: TestScenario,
  ): void {
    const encounteredSubIDs = new Set<string>();
    scenario.actions?.filter(isSubscriptionEmitterAction)?.forEach((ac) => {
      encounteredSubIDs.add(ac.subscriptionID);
    });
    scenario.expect?.filter(isSubscriptionEmitterAction)?.forEach((ac) => {
      encounteredSubIDs.add(ac.subscriptionID);
    });

    const actions = scenario.actions ?? [];
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (isActionThatSubscribesTo(action)) {
        if (encounteredSubIDs.has(action.subscribeToID)) {
          encounteredSubIDs.delete(action.subscribeToID);
        }
      }
    }

    const expects = scenario.expect ?? [];
    for (let i = 0; i < expects.length; i++) {
      const expect = expects[i];
      if (isActionThatSubscribesTo(expect)) {
        if (encounteredSubIDs.has(expect.subscribeToID)) {
          encounteredSubIDs.delete(expect.subscribeToID);
        }
      }
    }

    if (encounteredSubIDs.size !== 0) {
      throw Error(
        `#${
          encounteredSubIDs.size
        } Subscription actions encountered without subscribers: ${Array.from(
          encounteredSubIDs,
        ).join(', ')}  `,
      );
    }
  }

  private assertDeviceIDExists(targetDeviceID: string): void {
    const device = this.systemDeployer.device(targetDeviceID);
    if (device === undefined) {
      throw Error(
        `Test scenario written for unexisting device with id ${targetDeviceID}`,
      );
    }
  }

  private assertVMOfDeviceIDExists(targetDeviceID: string): void {
    if (!this.systemDeployer.hasVMDevice(targetDeviceID)) {
      throw Error(
        `Test scenario written device id ${targetDeviceID} has no VM assigned to it`,
      );
    }
  }

  private assertNotEmptyScenario(scenario: TestScenario): void {
    if (
      scenario.actions === undefined &&
      scenario.when === undefined &&
      scenario.expect === undefined
    ) {
      throw Error('Test scenario written has nothing to test');
    }
  }

  private assertValidScenarioFields(scenario: TestScenario): void {
    this.logger.warn('Test if scenario has all required fields');
  }

  private assertValidSubscriptionActionReturnType(
    actionIndex: number,
    result: any,
  ): void {
    if (!Array.isArray(result) || result.length !== 2) {
      throw new Error(
        `The return type of 'doAction' of SubscriptionAction #${actionIndex} is expected to be an array of 2 elements. Current type is ${typeof result}`,
      );
    }
    if (!(result[1] instanceof HookWithSubscription)) {
      throw new Error(
        `The 2th element of the array returned by 'doAction' of SubscriptionAction #${actionIndex} is expected to be of type 'HookWithSubscription' current type is ${typeof result[1]}`,
      );
    }
  }
}
export type { TestScenario };
