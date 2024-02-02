import { type HookWithSubscription } from '../../hooks/hook';
import { type WARDuinoVM } from '../../warduino/vm/warduino_vm';

export enum Target {
  mcu = 'mcu',
  dev = 'dev',
  devExternal = 'dev-external',
}

export interface TestFailure {
  timeout?: number;
  message: string;
}

export function isTestFailure(obj: any): obj is TestFailure {
  return (
    typeof obj === 'object' &&
    typeof obj.message === 'string' &&
    (obj.timeout === undefined || typeof obj.timeout === 'number')
  );
}

export type SubActReturn<
  ActionResultType,
  SubscriptionType,
  HookType extends HookWithSubscription<SubscriptionType>,
> = [ActionResultType, HookType];

export interface Action<ResultType> {
  description: string;
  doAction: (device: WARDuinoVM) => Promise<ResultType>;
  checkActionSuccess: (actionResult: ResultType) => Promise<boolean>;
  ifFail?: TestFailure;

  delay?: number; // delay ms before run
}

export function isAction<ResultType>(obj: any): obj is Action<ResultType> {
  return (
    typeof obj === 'object' &&
    typeof obj.description === 'string' &&
    typeof obj.doAction === 'function' &&
    typeof obj.checkActionSuccess === 'function' &&
    (obj.delay === undefined || typeof obj.delay === 'number') &&
    (obj.ifFail === undefined || isTestFailure(obj))
  );
}

export interface SubscriptionAction<
  ActionResultType,
  SubscriptionType,
  HookType extends HookWithSubscription<SubscriptionType>,
> {
  subscriptionID: string;
  description: string;
  doAction: (
    device: WARDuinoVM,
  ) => Promise<SubActReturn<ActionResultType, SubscriptionType, HookType>>;
  checkActionSuccess: (actionResult: ActionResultType) => Promise<boolean>;
  ifFail?: TestFailure;
}

export function isSubscriptionAction<
  ActionResultType,
  SubscriptionType,
  HookType extends HookWithSubscription<SubscriptionType>,
>(
  obj: any,
): obj is SubscriptionAction<ActionResultType, SubscriptionType, HookType> {
  return (
    typeof obj === 'object' &&
    typeof obj.description === 'string' &&
    typeof obj.subscriptionID === 'string' &&
    typeof obj.doAction === 'function' &&
    typeof obj.checkActionSuccess === 'function' &&
    (obj.ifFail === undefined || isTestFailure(obj.ifFail))
  );
}

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
  Delayed = 'Delayed',
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

export interface PostSetupConfig {
  pauseAfterSetup: boolean;
  actions?: Array<Action<any>>;
}

export interface DeviceSetup {
  name?: string;
  program: string;
  target: string; // must be a string from Target enum
  id: string;

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

export interface SystemSetup {
  setupName: string;
  devices: DeviceSetup[];
  rebootDevices?: boolean;
  logger?: LoggerConfig;
}
