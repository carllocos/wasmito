import assert from 'assert';
import { WasmitoBackendVM } from '../runtimes/wasmito_vm/wasmito_vm';
import {
  ReadOnlyInterrupt,
  ReadOnlyWasmValue,
  WritableInterrupt,
  WritableWasmValue,
} from './interrupts';
import { GroupHooks } from './group_hooks';
import { createLogger, Logger } from '../logger/logger';
import { createCallbackNoArgs, instruction } from './util/analyse_instruction';
import { interrupt } from './util/analyse_interrupts';
import { LanguageAdaptor } from '../language_adaptors';
import {
  SourceCFGNode,
  sourceNodeFirstInstruction,
} from '../cfg/source_cfg_node_edge';
import { StateRequest } from '../runtimes/wasmito_vm/requests/inspect_request';
import { WasmModule } from '../webassembly/wasm/wasm_module';
import {
  WasmAddress,
  WasmInstruction,
} from '../webassembly/wasm/wasm_instruction';
import { WasmOpcode } from '../webassembly/wasm/wasm_opcode';
import { WasmState } from '../webassembly/wasm';
import { assertFatalHookError, Hook } from '../hooks/hook';
import { InspectStateHook } from '../hooks/hook_inspect_state';

export interface AnalysisConfig {
  name: string;
  maxTimeoutMs: number;
}

export class WasmAnalysis {
  private wasm: WasmModule;
  private vm: WasmitoBackendVM;
  private groups: GroupHooks[];
  private _logger: Logger;
  private maxTimeoutMs: number;
  private _adaptor?: LanguageAdaptor;

  constructor(
    wasm: WasmModule | LanguageAdaptor,
    vm: WasmitoBackendVM,
    config?: AnalysisConfig,
  ) {
    if (wasm instanceof WasmModule) {
      this.wasm = wasm;
    } else {
      this._adaptor = wasm;
      this.wasm = wasm.sourceMap.wasm;
    }
    this.vm = vm;
    this.groups = [];
    this._logger = createLogger(config?.name ?? 'WasmAnalyse');
    this.maxTimeoutMs = config?.maxTimeoutMs ?? 30000;
  }
  private addGroup(g: GroupHooks): GroupHooks {
    this.groups.push(g);
    return g;
  }

  /*
   * Register a callback to be executed `before` the given `instr` is executed on the VM.
   *
   */
  before<I>(
    instr: WasmInstruction | WasmAddress | WasmOpcode,
    cb:
      | ((instr: I, args: ReadOnlyWasmValue[], vm: WasmitoBackendVM) => void)
      | ((instr: I, args: ReadOnlyWasmValue[]) => void)
      | ((vm: WasmitoBackendVM) => void)
      | (() => void),
  ): GroupHooks {
    const mutate = false;
    return this.addGroup(
      instruction<I>(
        'before',
        instr,
        this.wasm,
        this.vm,
        this.maxTimeoutMs,
        cb,
        mutate,
      ),
    );
  }

  beforeMut<I>(
    instr: WasmInstruction | WasmAddress | WasmOpcode,
    cb:
      | ((
          instr: I,
          args: WritableWasmValue[],
          vm: WasmitoBackendVM,
        ) => WritableWasmValue[])
      | ((instr: I, args: WritableWasmValue[]) => WritableWasmValue[]),
  ): GroupHooks {
    const mutate = true;
    return this.addGroup(
      instruction<I>(
        'before',
        instr,
        this.wasm,
        this.vm,
        this.maxTimeoutMs,
        cb,
        mutate,
      ),
    );
  }

  after<I>(
    instr: I | WasmAddress | WasmOpcode,
    cb:
      | ((
          instr: I,
          result: ReadOnlyWasmValue | undefined,
          vm: WasmitoBackendVM,
        ) => void)
      | ((instr: I, result: ReadOnlyWasmValue | undefined) => void)
      | ((vm: WasmitoBackendVM) => void)
      | (() => void),
  ): GroupHooks {
    const mutate = false;
    return this.addGroup(
      instruction<I>(
        'after',
        instr,
        this.wasm,
        this.vm,
        this.maxTimeoutMs,
        cb,
        mutate,
      ),
    );
  }

  afterMut<I>(
    instr: I | WasmAddress | WasmOpcode,
    cb:
      | ((
          instr: I,
          result: WritableWasmValue | undefined,
          vm: WasmitoBackendVM,
        ) => WritableWasmValue | undefined)
      | ((
          instr: I,
          result: WritableWasmValue | undefined,
        ) => WritableWasmValue | undefined),
  ): GroupHooks {
    const mutate = true;
    return this.addGroup(
      instruction<I>(
        'after',
        instr,
        this.wasm,
        this.vm,
        this.maxTimeoutMs,
        cb,
        mutate,
      ),
    );
  }

  onNewInterrupt(
    cb:
      | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => void)
      | ((ev: ReadOnlyInterrupt) => void)
      | (() => void),
  ): GroupHooks {
    const mutate = false;
    return this.addGroup(
      interrupt(
        this.vm,
        this.maxTimeoutMs,
        'onNewInterrupt',
        mutate,
        mutate,
        cb,
      ),
    );
  }

  onNewInterruptMut(
    cb:
      | ((ev: WritableInterrupt, vm: WasmitoBackendVM) => WritableInterrupt)
      | ((ev: WritableInterrupt) => WritableInterrupt)
      | (() => void),
  ): GroupHooks {
    const mutate = true;
    return this.addGroup(
      interrupt(
        this.vm,
        this.maxTimeoutMs,
        'onNewInterrupt',
        mutate,
        mutate,
        cb,
      ),
    );
  }

  beforeHandlingInterrupt(
    cb:
      | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => void)
      | ((ev: ReadOnlyInterrupt) => void)
      | (() => void),
  ): GroupHooks {
    const mutate = false;
    return this.addGroup(
      interrupt(
        this.vm,
        this.maxTimeoutMs,
        'beforeInterruptHandled',
        mutate,
        mutate,
        cb,
      ),
    );
  }

  beforeHandlingInterruptMut(
    cb:
      | ((ev: WritableInterrupt, vm: WasmitoBackendVM) => WritableInterrupt)
      | ((ev: WritableInterrupt) => WritableInterrupt)
      | (() => void),
  ): GroupHooks {
    const mutate = true;
    return this.addGroup(
      interrupt(
        this.vm,
        this.maxTimeoutMs,
        'beforeInterruptHandled',
        mutate,
        mutate,
        cb,
      ),
    );
  }

  afterHandlingInterrupt(
    cb:
      | ((ev: ReadOnlyInterrupt) => void)
      | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => void)
      | (() => void),
  ): GroupHooks {
    const mutate = false;
    return this.addGroup(
      interrupt(
        this.vm,
        this.maxTimeoutMs,
        'afterHandlingInterrupt',
        mutate,
        mutate,
        cb,
      ),
    );
  }

  onNodeEntry(
    node: SourceCFGNode,
    cb: (
      n: SourceCFGNode,
      instr: WasmInstruction,
      args: ReadOnlyWasmValue[],
      vm: WasmitoBackendVM,
    ) => void,
  ): GroupHooks;
  onNodeEntry(
    node: SourceCFGNode,
    cb: (
      n: SourceCFGNode,
      instr: WasmInstruction,
      args: ReadOnlyWasmValue[],
    ) => void,
  ): GroupHooks;
  onNodeEntry(
    node: SourceCFGNode,
    cb: (n: SourceCFGNode, instr: WasmInstruction) => void,
  ): GroupHooks;
  onNodeEntry(
    node: SourceCFGNode,
    cb: (vm: WasmitoBackendVM) => void,
  ): GroupHooks;
  onNodeEntry(node: SourceCFGNode, cb: () => void): GroupHooks;
  onNodeEntry(node: SourceCFGNode, cb: (...args: any[]) => any): GroupHooks {
    // TODO fix incomingEdges
    // const reachableInstrs = node.incomingEdges.map(SourceCFGEdgeToInstruction);
    const reachableInstrs = [sourceNodeFirstInstruction(node)];
    assert(reachableInstrs.length > 0);
    const g = new GroupHooks('before');
    for (const i of reachableInstrs) {
      const [actions, actionToSubscribe] = createActionsNode(i, cb.length);
      const newCB = createCallbackNode(node, this.vm, this.wasm, i, cb);
      actionToSubscribe.subscribe(newCB);
      g.addInstructionActions(i, actions);
    }
    return this.addGroup(g);
  }

  onError(_cb: (...args: any[]) => any): GroupHooks {
    throw new Error(`TODO`);

    // async function closeOnError(
    //   wasm: WasmModule,
    //   vmConnection: WasmitoBackendVM,
    // ): Promise<void> {
    //   const inspectAction = new InspectStateHook().includePC().includeException();
    //   inspectAction.subscribe((wasmState) => {
    //     assert(wasmState.pc !== undefined);
    //     const instr = wasm.getInstruction(wasmState.pc);
    //     assert(instr !== undefined);
    //     console.log(
    //       `Exception occurred at 0x${instr.startAddress} ${instr.name}: ${wasmState.exception}\n`,
    //     );
    //   });
    //   await hookOnError([inspectAction], vmConnection);
    // }
  }

  aroundFunction(_cb: (...args: any[]) => any): GroupHooks {
    // async function aroundDigitalWrite(
    //   wasm: WasmModule,
    //   vmConnection: WasmitoBackendVM,
    // ): Promise<void> {
    //   // BUG
    //   // (;@48    ;)  (import "env" "chip_digital_write" (func $src/arduino/chip_digital_write (;1;) (type $#type0)))
    //   const digitalWrite = wasm.getFunction(1);
    //   assert(digitalWrite !== undefined);
    //   await aroundFunction(digitalWrite, vmConnection);
    // }
    throw new Error('TODO');
  }

  private assertValidGroups(): GroupHooks[] {
    const gps = this.groups.filter((g) => !g.deployed);
    assert(gps.length > 0, `No hooks registed to deploy`);
    for (const g of gps) {
      assert(g.actions.length > 0, 'No action registered for group');
    }
    return gps;
  }

  async deploy(timeoutMs?: number): Promise<void> {
    const gps = this.assertValidGroups();
    for (const g of gps) {
      if (g.instructions.length > 0) {
        await this.deployOnInstructions(g, timeoutMs);
      } else {
        await this.deployOnInterrupts(g, timeoutMs);
      }
    }
  }

  async remove(): Promise<void> {}

  private async deployOnInterrupts(
    g: GroupHooks,
    timeoutMs?: number,
  ): Promise<void> {
    let cb;
    switch (g.mode) {
      case 'onNewInterrupt':
        cb = this.vm.addHookOnNewEvent.bind(this.vm);
        break;
      case 'beforeInterruptHandled':
        cb = this.vm.addHookOnEventHandling.bind(this.vm);
        break;
      // case 'afterHandlingInterrupt':
      default:
        throw new Error(`unsupported moment ${g.mode}`);
    }
    for (const a of g.actions) {
      const success = await cb(a, timeoutMs);
      if (!success) {
        throw new Error(
          `failed to add action '${a.description()}' onNewInterrupt`,
        );
      }
    }
  }

  private async deployOnInstructions(
    g: GroupHooks,
    timeoutMs?: number,
  ): Promise<void> {
    for (const i of g.instructions) {
      for (const a of g.getInstructionActions(i)) {
        const added = await this.vm.addHookOnAddr(
          i.startAddress,
          a,
          g.internalInstructionMode,
          timeoutMs,
        );
        if (!added) {
          throw new Error(
            `failed to register action '${a.description}' on instr '${i.name}' at address '${i.startAddress}'}`,
          );
        }
      }
    }
    g.deployed = true;
  }

  async run(timeoutMs?: number): Promise<void> {
    await this.vm.run(timeoutMs);
  }
}

function createActionsNode(
  instr: WasmInstruction,
  cbNrOfArgs: number,
): [Hook[], InspectStateHook] {
  const hooks: Hook[] = [];
  const inspectAction = new InspectStateHook(
    new StateRequest(),
    instr.startAddress,
  );
  inspectAction.includePC();
  switch (cbNrOfArgs) {
    case 0:
    case 1:
    case 2:
      break;
    case 3:
    case 4:
      if (instr.signature.nrArgs > 0) {
        inspectAction.includeStack();
      }
      break;
    default:
      throw new Error(
        `Callback has not the right type signature. Given nr of arguments ${cbNrOfArgs}. Expected at most 5`,
      );
  }
  hooks.push(inspectAction);
  return [hooks, inspectAction];
}

//   cb: (
//     n: SourceCFGNode,
//     instr: WasmInstruction,
//     args: ReadOnlyWasmValue[],
//     vm: WasmitoBackendVM,
//   ) => void,
//   cb: (
//     n: SourceCFGNode,
//     instr: WasmInstruction,
//     args: ReadOnlyWasmValue[],
//   ) => void,
function createCallbackNode(
  node: SourceCFGNode,
  vm: WasmitoBackendVM,
  mod: WasmModule,
  instr: WasmInstruction,
  cb: (...args: any[]) => any,
): (s: WasmState) => void {
  switch (cb.length) {
    case 0:
    case 1:
      return createCallbackNoArgs(vm, cb);
    case 2:
      return callbackArgs(node, mod, instr, false, vm, cb);
    case 3:
    case 4:
      return callbackArgs(node, mod, instr, true, vm, cb);
    default:
      throw new Error(`Callback has incorrect number of arguments`);
  }
}

function callbackArgs(
  node: SourceCFGNode,
  mod: WasmModule,
  instr: WasmInstruction,
  includeInstrArgs: boolean,
  vm: WasmitoBackendVM,
  cb: (...args: any[]) => any,
): (s: WasmState) => void {
  return (s: WasmState) => {
    assertFatalHookError(s.pc !== undefined, 'pc is empty');
    const i = mod.getInstruction(s.pc);
    assertFatalHookError(
      i !== undefined,
      `No instruction found for address ${s.pc}`,
    );

    assertFatalHookError(
      i.signature.nrArgs === instr.signature.nrArgs,
      `mismatch between expect args of instr ${i.name} and ${instr.name}`,
    );

    let args: WritableWasmValue[] | ReadOnlyWasmValue[] = [];
    if (includeInstrArgs && i.signature.nrArgs > 0) {
      assertFatalHookError(
        s.stack !== undefined,
        'VM failed to provide the stack needed to construct args',
      );
      assertFatalHookError(
        s.stack.length >= i.signature.nrArgs,
        `Stack is expected to have #${i.signature.nrArgs} values but has ${s.stack.length} to reconstruct args for '${i.name}' inst at addr ${i.startAddress}`,
      );

      const vals = s.stack.slice(-i.signature.nrArgs);
      args = vals.map((v) => new ReadOnlyWasmValue(v));
    }

    const newArgs = cb(node, i, args, vm);
    assertFatalHookError(
      newArgs === undefined,
      `Registered callback should not return any value as no update is expected`,
    );
  };
}
