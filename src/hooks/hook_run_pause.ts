import { HookKind, HookWithoutSubscription } from './hook';

export enum WARDuinoRunState {
  WARDuinoRun = '02',
  WARDuinoPause = '03',
}

export class ChangeRunningStateHook extends HookWithoutSubscription {
  public readonly runState: WARDuinoRunState;
  constructor(runState: WARDuinoRunState) {
    super(HookKind.ChangeRunningState);
    this.runState = runState;
  }

  serializeBinary(): string {
    // format: HookKind (1 BYTE) | RunState (1 BYTE)
    return `${this.kind}${this.runState}`;
  }

  description(): string {
    if (this.runState === WARDuinoRunState.WARDuinoPause) {
      return 'Pause VM';
    } else {
      return 'Run VM';
    }
  }
}

export class PauseVMHook extends ChangeRunningStateHook {
  constructor() {
    super(WARDuinoRunState.WARDuinoPause);
  }
}

export class RunVMHook extends ChangeRunningStateHook {
  constructor() {
    super(WARDuinoRunState.WARDuinoRun);
  }
}
