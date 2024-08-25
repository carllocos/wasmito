import { type HookWithSubscription } from '../src/hooks/hook';
import { type TargetLanguage } from '../src/compilers/prog_language_selection';
import { type WARDuinoVM } from '../src/warduino/vm/warduino_vm';

export enum Target {
  mcu = 'mcu',
  dev = 'dev',
  devExternal = 'dev-external',
}

type FailureHandler<V> = ((v: V) => string) | string;

export function isTestFailure<V>(obj: any): obj is FailureHandler<V> {
  return typeof obj === 'function' || typeof obj === 'string';
}

export interface Action<ResultType> {
  timeout?: number;
  ifFail?: FailureHandler<ResultType>;

  // delay ms before run
  // Next actions are not run as long as this
  // action does not run
  delay?: number;

  description: string;
  doAction: (device: WARDuinoVM) => Promise<ResultType>; // ignored if subscribeTo set
  checkActionSuccess: (actionResult: ResultType) => Promise<boolean>;

  subscribeTo?: string;
}

export function isAction<ResultType>(obj: any): obj is Action<ResultType> {
  return (
    typeof obj === 'object' &&
    typeof obj.description === 'string' &&
    typeof obj.doAction === 'function' &&
    typeof obj.checkActionSuccess === 'function' &&
    (obj.timeout === undefined || typeof obj.timeout === 'number') &&
    (obj.delay === undefined || typeof obj.delay === 'number') &&
    (obj.subscribeTo === undefined || typeof obj.subscribeTo === 'string') &&
    (obj.ifFail === undefined || isTestFailure(obj.ifFail))
  );
}

export function isDelayedAction<ResultType>(
  obj: any,
): obj is Action<ResultType> {
  return isAction(obj) && obj.delay !== undefined;
}

export interface SubscribeAction<
  Hook,
  ResultType extends HookWithSubscription<Hook>,
> {
  description: string;
  timeout?: number;
  subscribeToID: string;
  checkSubscription: (v: ResultType) => Promise<boolean>;
  ifFail?: FailureHandler<ResultType>;
}

export function isActionThatSubscribesTo<
  HookType,
  ResultType extends HookWithSubscription<HookType>,
>(obj: any): obj is SubscribeAction<HookType, ResultType> {
  return (
    typeof obj === 'object' &&
    typeof obj.description === 'string' &&
    typeof obj.subscribeToID === 'string' &&
    typeof obj.checkSubscription === 'function' &&
    (obj.timeout === undefined || typeof obj.timeout === 'number') &&
    (obj.ifFail === undefined || isTestFailure(obj.ifFail))
  );
}

export type SubActReturn<
  ActionResultType,
  SubscriptionType,
  HookType extends HookWithSubscription<SubscriptionType>,
> = [ActionResultType, HookType];

// Is an action that can generate periodically content and other actions can subscribe to
export interface SubscriptionEmitterAction<
  ActionResultType,
  SubscriptionType,
  HookType extends HookWithSubscription<SubscriptionType>,
> {
  subscriptionID: string;
  description: string;
  setupSubscription: (
    device: WARDuinoVM,
  ) => Promise<SubActReturn<ActionResultType, SubscriptionType, HookType>>;
  checkSetupSuccess: (actionResult: ActionResultType) => Promise<boolean>;
  ifFail?: FailureHandler<ActionResultType>;
  timeout?: number;
}

export function isSubscriptionEmitterAction<
  ActionResultType,
  SubscriptionType,
  HookType extends HookWithSubscription<SubscriptionType>,
>(
  obj: any,
): obj is SubscriptionEmitterAction<
  ActionResultType,
  SubscriptionType,
  HookType
> {
  return (
    typeof obj === 'object' &&
    typeof obj.description === 'string' &&
    typeof obj.subscriptionID === 'string' &&
    typeof obj.setupSubscription === 'function' &&
    typeof obj.checkSetupSuccess === 'function' &&
    (obj.timeout === undefined || typeof obj.timeout === 'number') &&
    (obj.ifFail === undefined || isTestFailure(obj.ifFail))
  );
}

export type Act<V, Y, Z extends HookWithSubscription<Y>> =
  | Action<V>
  | SubscriptionEmitterAction<V, Y, Z>
  | SubscribeAction<Y, Z>;

export interface TestProgram {
  targetLanguage: TargetLanguage;
  sourceCodeCompilationArgs: any;
}

export interface TestScenario {
  skipTest?: boolean;
  testName: string;
  testProgram: TestProgram;
  when?: Array<Act<any, any, any>>;
  actions?: Array<Act<any, any, any>>;
  expect?: Array<Act<any, any, any>>;
}

export function isTestScenarioAction(obj: any): boolean {
  return (
    isAction(obj) ||
    isActionThatSubscribesTo(obj) ||
    isSubscriptionEmitterAction(obj)
  );
}

export function isTestScenario(obj: any): obj is TestScenario {
  if (typeof obj !== 'object') {
    return false;
  }

  if (typeof obj.testName !== 'string') {
    return false;
  }

  if (typeof obj.testProgram !== 'string') {
    return false;
  }

  if (obj.skipTest !== undefined && typeof obj.skipTest !== 'boolean') {
    return false;
  }

  if (obj.actions !== undefined) {
    if (!(obj.actions instanceof Array)) {
      return false;
    }
    const found = obj.actions.find((o: any) => {
      return !isTestScenarioAction(o);
    });

    if (found !== undefined) {
      return false;
    }
  }

  if (obj.when !== undefined) {
    if (!(obj.when instanceof Array)) {
      return false;
    }
    const found = obj.when.find((o: any) => {
      return !isTestScenarioAction(o);
    });

    if (found !== undefined) {
      return false;
    }
  }

  if (obj.expect !== undefined) {
    if (!(obj.expect instanceof Array)) {
      return false;
    }
    const found = obj.expect.find((o: any) => {
      return !isTestScenarioAction(o);
    });

    if (found !== undefined) {
      return false;
    }
  }

  return true;
}

export enum ActionRunState {
  Failed = 'Failed',
  Success = 'Success',
  Cancelled = 'Cancelled',
  TimedOut = 'Timedout',
  Delayed = 'Delayed',
}

export interface ActionRunResult {
  action: Act<any, any, any>;
  result: ActionRunState;
  failMsg?: string;
}

export enum TestScenarioResultState {
  Success = 'Success',
  Failed = 'Failed',
  Running = 'Running',
}

export interface TestScenarioResult {
  scenario: TestScenario;
  result: TestScenarioResultState;
  actionRunResults: ActionRunResult[];
  expectRunResults: ActionRunResult[];
}

export interface SystemTest {
  systemSetup: DevicesLab;
  testScenarios: TestScenario[];
}

export interface PostSetupConfig {
  pauseAfterSetup: boolean;
  actions?: Array<Action<any>>;
}

export type DeviceID = string;

export interface DeviceSetup {
  name?: string;
  deviceClass?: string; // TODO

  target: string; // must be a string from Target enum
  id: DeviceID;

  toolPort?: number; // in case we connect to an already spawned Dev vm

  serialPort?: string;
  baudrate?: number;
  fqbn?: string;

  postSetup: PostSetupConfig;
}

export interface LoggerConfig {
  name: string;
  level: string;
}

export interface DevicesLab {
  setupName: string;
  devices: DeviceSetup[];
  rebootDevices?: boolean;
  logger?: LoggerConfig;
}
