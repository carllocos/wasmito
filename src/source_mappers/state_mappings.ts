import assert from 'assert';
import { HookKind, HookWithSubscription, InspectStateHook } from '../hooks';
import { createLogger } from '../logger/logger';
import { StateRequest } from '../runtimes';
import { WasmState } from '../webassembly';
import {
  SourceCodeLocation,
  sourceCodeLocationToString,
  SourceMap,
} from './source_map';

const logger = createLogger('LexicalScopeRequest');

// TODO: scenario1 : want lexicalScope on given address, optionally specify which state you want (e.g., location, parameters, globals, stack, etc)-> generate request to ask for that state
// TODO: scenario2 : want lexicalScope but address is not given, optionally specify which state you want (e.g., location, parameters, globals, stack, etc)-> generate request to ask for that state

class LexicalScopeBuilder {
  private loc: SourceCodeLocation;
  constructor() {
    this.loc = {
      source: '',
      linenr: 0,
      colnr: 0,
      address: 0,
      name: '',
    };
  }
  addLocation(loc: SourceCodeLocation) {
    this.loc.address = loc.address;
    this.loc.colnr = loc.colnr;
    this.loc.linenr = loc.linenr;
    this.loc.name = loc.name;
    this.loc.source = loc.source;
  }
  seal() {
    return new LexicalScope(this.loc);
  }
}

export class LexicalScope {
  readonly sourceLocation: SourceCodeLocation;
  constructor(loc: SourceCodeLocation) {
    this.sourceLocation = loc;
  }
}

type StateParser = (b: LexicalScopeBuilder, m: boolean, w: WasmState) => void;

export class LexicalScopeRequest extends HookWithSubscription<LexicalScope> {
  private sourceMap: SourceMap;
  private loc?: SourceCodeLocation;
  private req: StateRequest;
  private hook: InspectStateHook;
  private parsers: Array<[boolean, StateParser]>;

  constructor(sourceMap: SourceMap, location?: SourceCodeLocation) {
    super(HookKind.StateToInspect, logger);
    this.sourceMap = sourceMap;
    this.loc = location;
    this.req = new StateRequest();
    this.hook = new InspectStateHook(this.req);
    this.hook.subscribe(this.parseSubscriptionData.bind(this));
    this.parsers = [];
  }

  description(): string {
    let locStr = '';
    if (this.loc !== undefined) {
      locStr = `of ${sourceCodeLocationToString(this.loc)}`;
    }
    return `Inspect lexical scope ${locStr}`;
  }

  serializeBinary(): string {
    assert(this.parsers.length > 0, 'no state has been requested');
    assert(this.parsers.length > 0, 'no state has been requested');
    return this.hook.serializeBinary();
  }

  locationOfScope(location: SourceCodeLocation): void {
    this.loc = location;
    this.req.includePC();
    const missingStateAllowed = false;
    this.parsers.push([missingStateAllowed, this.parseLocation.bind(this)]);
  }

  parseSubscriptionData(input: WasmState): LexicalScope {
    const b = new LexicalScopeBuilder();
    for (const [missingStateAllowed, parser] of this.parsers) {
      parser(b, missingStateAllowed, input);
    }
    return b.seal();
  }

  private parseLocation(
    builder: LexicalScopeBuilder,
    missingStateAllowed: boolean,
    wasmState: WasmState,
  ): void {
    const pc = wasmState.pc;
    if (pc === undefined && !missingStateAllowed) {
      throw new Error(
        `Could not construct SourceLocation due to missing Wasm PC`,
      );
    } else if (pc === undefined) return;

    const locs = this.sourceMap.getOriginalPositionFor(pc);
    if (locs.length === 0) return;
    if (locs.length > 1) {
      const strs = locs.map(sourceCodeLocationToString).join(', ');
      logger.warn(
        `Found more than one location for address ${pc}. Locs: [${strs}]`,
      );
    }
    const loc = locs[0];
    builder.addLocation(loc);
  }
}
