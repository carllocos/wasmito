import type winston from 'winston';
import { type WARDuinoVM } from '../warduino';
import { BreakpointRemoveAndProceed, type Breakpoint } from './breakpoint';
import { createLogger } from '../logger/logger';

export abstract class BreakpointPolicy {
  protected readonly vm: WARDuinoVM;
  protected readonly MAX_DEFAULT_TIMEOUT: number = 10000;
  protected abstract readonly logger: winston.Logger;

  constructor(vm: WARDuinoVM) {
    this.vm = vm;
  }

  abstract toString(): string;

  abstract onAddbreakPoint(bp: Breakpoint): Breakpoint;
}

export class BreakpointDefaultPolicy extends BreakpointPolicy {
  readonly logger: winston.Logger = createLogger('DefaultBreakpointPolicy');

  toString(): string {
    return 'Default Breakpoint Policy';
  }

  onAddbreakPoint(bp: Breakpoint): Breakpoint {
    return bp;
  }
}

export class SingleStopBreakpointPolicy extends BreakpointPolicy {
  readonly logger: winston.Logger = createLogger('SingleStopBreakpointPolicy');

  toString(): string {
    return 'Single Stop Breakpoint Policy';
  }

  onAddbreakPoint(bp: Breakpoint): Breakpoint {
    if (bp instanceof BreakpointRemoveAndProceed) {
      return bp;
    }
    const alteredBP = new BreakpointRemoveAndProceed(bp.sourceCodeLocation);
    alteredBP.subscribe((state) => {
      this.removeAllBreakpoints();
      bp.onSubscriptionData(state);
    });
    return alteredBP;
  }

  private removeAllBreakpoints(): void {
    this.logger.info(`Enforcing '${this.toString()}'`);
    const removes = this.vm.breakpoints.map(async (bp) => {
      return this.vm.removeBreakpoint(bp, this.MAX_DEFAULT_TIMEOUT);
    });

    Promise.all(removes).catch((err) => {
      this.logger.error(
        `Error occurred while enforcing '${this.toString()}'. Error`,
        err,
      );
    });
  }
}
