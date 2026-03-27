import { RemoteCallRequest } from '../../src/runtimes/wasmito_vm/requests/fun_call_request';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { WASMFunction, WasmInstruction, WasmitoBackendVM } from '../../src';
import { SourceCFGNode } from '../../src/cfg/source_cfg_node_edge';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import {
  CodeCoverageToolConfig,
  CodeCoverageToolSourceLocation,
  CodeCoverageToolResult,
} from './CodeCoverageToolTypes';
import assert from 'assert';

export class CodeCoverageTool {
  private readonly languageAdaptor: LanguageAdaptor;
  private readonly vm: WasmitoBackendVM;
  private readonly wasmTestFunctionIds: number[];
  private readonly config: CodeCoverageToolConfig;

  private readonly analysis: WasmAnalysis;

  private readonly allNodes: SourceCFGNode[];
  private readonly exitNodes: SourceCFGNode[];
  private readonly coveredNodes: Set<SourceCFGNode>;
  private readonly allFunctions: WASMFunction[];
  private readonly allFunctionsExceptTests: WASMFunction[];
  private readonly coveredFunctions: Set<number>;
  private readonly coveredSourceCodeLocations: Map<
    string,
    CodeCoverageToolSourceLocation
  >;

  private resolveExitNodeEnteredPromise!: () => void;
  private readonly exitNodeEnteredPromise: Promise<void>; // Gets resolved when an exit node is entered.

  constructor(
    languageAdaptor: LanguageAdaptor,
    vm: WasmitoBackendVM,
    wasmTestFunctionIds: number[],
    config?: Partial<CodeCoverageToolConfig>,
  ) {
    this.languageAdaptor = languageAdaptor;
    this.vm = vm;
    this.wasmTestFunctionIds = wasmTestFunctionIds;
    this.config = { timeoutMs: config?.timeoutMs ?? 1000 };

    this.analysis = new WasmAnalysis(this.languageAdaptor, this.vm);

    const sourceCFG = this.languageAdaptor.sourceCFGs;
    this.allNodes = sourceCFG.allNodes();

    const mainFunction =
      this.languageAdaptor.sourceCFGs.sourceMap.wasm.getMainFunction();
    const mainFunctionCFG = sourceCFG.getFunctionSourceCFG(mainFunction.id);
    assert(mainFunctionCFG);
    this.exitNodes = mainFunctionCFG.exitNodes;

    this.coveredNodes = new Set();

    this.allFunctions =
      this.languageAdaptor.sourceCFGs.sourceMap.wasm.functions;
    // Exclude test functions
    this.allFunctionsExceptTests = this.allFunctions.filter((wasmFunction) => {
      return !this.wasmTestFunctionIds.includes(wasmFunction.id);
    });
    this.coveredFunctions = new Set();

    this.coveredSourceCodeLocations = new Map();

    this.exitNodeEnteredPromise = new Promise((resolve) => {
      this.resolveExitNodeEnteredPromise = resolve;
    });
  }

  private registerOnNodeEntryCallback(): void {
    for (const node of this.allNodes) {
      this.analysis.onNodeEntry(
        node,
        (n: SourceCFGNode, _i: WasmInstruction, _args: ReadOnlyWasmValue[]) => {
          this.coveredNodes.add(n);

          const functionId = n.wasmFunOwner;
          // Exclude test functions in function coverage.
          if (!this.wasmTestFunctionIds.includes(functionId))
            this.coveredFunctions.add(functionId);

          const sourceLocation = n.sourceLocation;
          const key = `${sourceLocation.source}:${sourceLocation.linenr}:${sourceLocation.colnr}`;
          this.coveredSourceCodeLocations.set(key, {
            sourceFile: sourceLocation.source,
            lineNr: sourceLocation.linenr,
            colNr: sourceLocation.colnr,
          });
        },
      );
    }
  }

  private registerOnExitNodeEntryCallback(): void {
    for (const exitNode of this.exitNodes) {
      this.analysis.onNodeEntry(exitNode, this.resolveExitNodeEnteredPromise);
    }
  }

  private getCoverageResults(): CodeCoverageToolResult {
    const totalCoveredNodes = this.coveredNodes.size;
    const totalNodes = this.allNodes.length;
    const branchCoverage = Number((totalCoveredNodes / totalNodes).toFixed(2));
    const totalCoveredFunctions = this.coveredFunctions.size;
    // Exclude test functions in function coverage.
    const totalFunctions = this.allFunctionsExceptTests.length;
    const functionCoverage = Number(
      (totalCoveredFunctions / totalFunctions).toFixed(2),
    );

    return {
      coveredNodes: totalCoveredNodes,
      totalNodes,
      branchCoverage,
      functionCoverage,
      coveredFunctions: Array.from(this.coveredFunctions),
      coveredSourceCodeLocations: Array.from(
        this.coveredSourceCodeLocations.values(),
      ),
    };
  }

  private async exitNodeEnteredOrTimedOut(): Promise<void> {
    let timeout;
    const timeoutPromise = new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, this.config.timeoutMs);
    });

    await Promise.race([this.exitNodeEnteredPromise, timeoutPromise]);
    clearTimeout(timeout);
  }

  async run(): Promise<CodeCoverageToolResult> {
    this.registerOnNodeEntryCallback();
    this.registerOnExitNodeEntryCallback();
    await this.analysis.deploy();

    for (const wasmTestFunctionId of this.wasmTestFunctionIds) {
      const callRequest = new RemoteCallRequest(wasmTestFunctionId, []);
      await this.vm.sendRequest(callRequest);
    }

    await this.exitNodeEnteredOrTimedOut();
    await this.vm.close();
    return this.getCoverageResults();
  }
}
