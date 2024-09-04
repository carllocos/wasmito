import type winston from 'winston';
import { TimeoutPromise, maybeTimeoutPromise } from '../src/util/promise_util';
import { SystemDeployer } from './system_deployer';
import {
  type SubscriptionEmitterAction,
  type Action,
  isSubscriptionEmitterAction,
  type TestScenario,
  type TestScenarioResult,
  ActionRunState,
  type ActionRunResult,
  TestScenarioResultState,
  type DevicesLab,
  type Act,
  isDelayedAction,
  isAction,
  isActionThatSubscribesTo,
  type SubscribeAction,
  type DeviceID,
} from './shared_interfaces';
import { type WARDuinoVM } from '../src/warduino';
import { HookWithSubscription } from '../src/hooks/hook';

type DelayResolver = (value: boolean | PromiseLike<boolean>) => void;

export class SystemTester {
  private readonly systemDeployer: SystemDeployer;
  private readonly testScenarios: Array<
    [DeviceID, TestScenario, TestScenarioResult]
  >;

  private readonly deviceTestsMap: Map<DeviceID, TestScenario[]>;
  private readonly storedHookValues: Map<string, any>;

  constructor(setup: DevicesLab) {
    this.systemDeployer = new SystemDeployer(setup);
    this.testScenarios = [];
    this.deviceTestsMap = new Map();
    this.storedHookValues = new Map();
  }

  get logger(): winston.Logger {
    return this.systemDeployer.logger;
  }

  addTestScenario(scenario: TestScenario, targetDeviceID: DeviceID): void {
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
      result: TestScenarioResultState.Running,
      actionRunResults,
      expectRunResults,
    };

    return testResult;
  }

  private async setupDevice(
    scenario: TestScenario,
    deviceID: DeviceID,
  ): Promise<void> {
    try {
      await this.systemDeployer.deployOnDevice(scenario, deviceID);
    } catch (e) {
      this.logger.error('Failed during System setup');
      this.logger.debug('TODO: Close VM connections');
      throw e;
    }
  }

  async runTests(): Promise<TestScenarioResult[]> {
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
    await this.systemDeployer.close();
    return this.testScenarios.map((v) => v[2]);
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
    targetDeviceID: DeviceID,
    scenario: TestScenario,
    scenarioResult: TestScenarioResult,
  ): Promise<void> {
    this.assertVMOfDeviceIDExists(targetDeviceID);
    const vm = this.systemDeployer.deviceVM(targetDeviceID);
    const actionHooksMap = new Map<string, HookWithSubscription<any>>();

    console.debug(`'${scenario.testName}'`);
    const doExpects = await this.runActions(
      vm,
      scenario.testName,
      scenario.actions ?? [],
      scenarioResult.actionRunResults,
      actionHooksMap,
    );

    if (!doExpects) {
      scenarioResult.result = TestScenarioResultState.Failed;
      return;
    }

    const successExpects = await this.runExpects(
      vm,
      scenario.testName,
      scenario.expect ?? [],
      scenarioResult.expectRunResults,
      actionHooksMap,
    );
    scenarioResult.result = successExpects
      ? TestScenarioResultState.Success
      : TestScenarioResultState.Failed;
  }

  private async runActions(
    vm: WARDuinoVM,
    scenarioName: string,
    actions: Array<Act<any, any, any>>,
    actionRunResults: ActionRunResult[],
    hookMap: Map<string, HookWithSubscription<any>>,
    logPrefix: string = 'Action',
  ): Promise<boolean> {
    for (let i = 0; i < actions.length; i++) {
      const actionRunResult = actionRunResults[i];
      const action = actions[i];

      try {
        let success = false;
        let resultValue: any;
        if (isSubscriptionEmitterAction(action)) {
          [resultValue, success] = await this.runActionToEmitSubscriptionValues(
            vm,
            action,
            hookMap,
            logPrefix,
            i,
          );
        } else if (isActionThatSubscribesTo(action)) {
          [resultValue, success] = await this.runActionThatSubscribesTo(
            action,
            hookMap,
            logPrefix,
            i,
          );
        } else if (isDelayedAction(action)) {
          let res: DelayResolver | undefined;
          const p = new Promise<boolean>((resolve) => {
            res = resolve;
          });
          if (res === undefined) {
            throw new Error(`laal`);
          }
          this.delayAction(
            scenarioName,
            action,
            actionRunResult,
            vm,
            res,
            logPrefix,
            i,
          );
          success = await p;
          // the actionRunResult is filled by delayAction.
          // Thus continue
          if (success) {
            continue;
          } else {
            return false;
          }
        } else if (isAction(action)) {
          // important has to be the last case of the if
          [resultValue, success] = await this.runAction(
            vm,
            action,
            logPrefix,
            i,
          );
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
            logPrefix,
            i,
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

  private storeEmittedHookValue(hookID: string, v: any): void {
    this.storedHookValues.set(hookID, v);
  }

  private async runActionToEmitSubscriptionValues<
    R,
    H,
    S extends HookWithSubscription<H>,
  >(
    vm: WARDuinoVM,
    action: SubscriptionEmitterAction<R, H, S>,
    hookMap: Map<string, HookWithSubscription<any>>,
    logPrefix: string,
    actionIndex: number,
  ): Promise<[R, boolean]> {
    console.debug(
      `${logPrefix} #${actionIndex}: Setting subscription for '${action.subscriptionID}'`,
    );
    const result = await maybeTimeoutPromise(
      action.setupSubscription(vm),
      action.timeout,
    );
    this.assertValidSubscriptionActionReturnType(actionIndex, result);
    const valueForCheck = result[0];
    const successfulCheck = await action.checkSetupSuccess(valueForCheck);
    if (successfulCheck) {
      console.debug(
        `${logPrefix} #${actionIndex}: successful Subscription setup for '${action.subscriptionID}'`,
      );
      const hook = result[1];
      if (action.store === undefined || action.store) {
        hook.subscribe((v: any) => {
          this.storeEmittedHookValue(action.subscriptionID, v);
        });
      }
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
    const logPrefix = 'Expect';
    return await this.runActions(
      vm,
      scenarioName,
      expects,
      expectsResults,
      hookMap,
      logPrefix,
    );
  }

  private logActionSuccess(
    successful: boolean,
    scenarioName: string,
    actionRunResult: ActionRunResult,
    logPrefix: string,
    actionIndex: number,
  ): void {
    if (!successful) {
      console.error(
        `${logPrefix} #${actionIndex}: failed with msg '${actionRunResult.failMsg}'`,
      );
    } else {
      console.debug(`${logPrefix} #${actionIndex}: succeeded`);
    }
  }

  private async runActionThatSubscribesTo<
    T,
    H,
    S extends HookWithSubscription<H>,
  >(
    action: SubscribeAction<H, S>,
    hookMap: Map<string, HookWithSubscription<any>>,
    logPrefix: string,
    actionIdx: number,
  ): Promise<[T, boolean]> {
    const hook = hookMap.get(action.subscribeToID);
    if (hook === undefined) {
      throw Error(
        `${logPrefix} # ${actionIdx}: is attempting to subscribe to an unexisting subscriptionID '${action.subscribeToID}'`,
      );
    }
    return await this.subscribeToHook(action, hook, logPrefix, actionIdx);
  }

  private async runAction<T>(
    vm: WARDuinoVM,
    action: Action<T>,
    logPrefix: string,
    actionIdx: number,
  ): Promise<[T, boolean]> {
    console.debug(
      `${logPrefix} #${actionIdx}: running '${action.description}'`,
    );
    const r = await action.doAction(vm);
    const s = await action.checkActionSuccess(r);
    return [r, s];
  }

  private delayAction<T>(
    scenarioName: string,
    action: Action<T>,
    actionRunResult: ActionRunResult,
    vm: WARDuinoVM,
    resolveDelay: DelayResolver,
    logPrefix: string,
    actionIndex: number,
  ): void {
    const isDelayed = action.delay !== undefined;
    actionRunResult.result = ActionRunState.Delayed;
    setTimeout(() => {
      this.runDelayedAction(
        scenarioName,
        action,
        actionRunResult,
        vm,
        resolveDelay,
        logPrefix,
        actionIndex,
      );
    }, action.delay);

    if (isDelayed) {
      console.debug(
        `${logPrefix} #${actionIndex}: '${action.description}' delayed for #${action.delay} ms`,
      );
    } else {
      console.error(
        `${logPrefix}' ${actionIndex}: attempting to delay '${action.description}' which cannot be delayed without 'delay' field`,
      );
    }
  }

  private runDelayedAction<T>(
    scenarioName: string,
    action: Action<T>,
    actionRunResult: ActionRunResult,
    vm: WARDuinoVM,
    resolveDelay: DelayResolver,
    logPrefix: string,
    actionIndex: number,
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
            `${logPrefix} #${actionIndex}: check is false`,
            logPrefix,
            actionIndex,
          );
        }
        successFul = successCheck;
      })
      .catch((err) => {
        errorOccurred = true;
        this.fillRunActionDueToError(
          err,
          actionRunResult,
          `${logPrefix} #${actionIndex}: failed due to exception`,
        );
      })
      .finally(() => {
        if (errorOccurred) {
          successFul = false;
        }
        actionRunResult.result = successFul
          ? ActionRunState.Success
          : ActionRunState.Failed;
        this.logActionSuccess(
          successFul,
          scenarioName,
          actionRunResult,
          logPrefix,
          actionIndex,
        );
        resolveDelay(successFul);
      });
  }

  private async subscribeToHook<T>(
    action: SubscribeAction<any, any>,
    hook: HookWithSubscription<any>,
    logPrefix: string,
    actionIdx: number,
  ): Promise<[T, boolean]> {
    console.debug(
      `${logPrefix} #${actionIdx}: setting up subscribe to '${action.subscribeToID}'`,
    );
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

      if (this.storedHookValues.has(action.subscribeToID)) {
        const v = this.storedHookValues.get(action.subscribeToID);
        this.storedHookValues.delete(action.subscribeToID);
        cb(v);
      } else {
        hook.subscribe(cb);
      }
    });
    return await maybeTimeoutPromise(p, action.timeout);
  }

  private fillRunActionAsFailed(
    actionResult: any,
    action: Act<any, any, any>,
    actionRunResult: ActionRunResult,
    fallbackFailMsg: string,
    logPrefix: string,
    actionIdx: number,
  ): void {
    actionRunResult.result = ActionRunState.Failed;

    let msg = fallbackFailMsg;
    if (action.ifFail !== undefined) {
      if (typeof action.ifFail === 'function') {
        msg = action.ifFail(actionResult);
      } else if (typeof action.ifFail === 'string') {
        msg = action.ifFail;
      } else {
        console.error(
          `${logPrefix} #${actionIdx}: does not provide a function or a string for ifFail value`,
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

  private assertDeviceIDExists(targetDeviceID: DeviceID): void {
    const device = this.systemDeployer.device(targetDeviceID);
    if (device === undefined) {
      throw Error(
        `Test scenario written for unexisting device with id ${targetDeviceID}`,
      );
    }
  }

  private assertVMOfDeviceIDExists(targetDeviceID: DeviceID): void {
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
