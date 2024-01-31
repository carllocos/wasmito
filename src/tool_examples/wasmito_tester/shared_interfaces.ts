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
}

export function isAction<ResultType>(obj: any): obj is Action<ResultType> {
  return (
    typeof obj === 'object' &&
    typeof obj.description === 'string' &&
    typeof obj.doAction === 'function' &&
    typeof obj.checkActionSuccess === 'function' &&
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
