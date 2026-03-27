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

  // line coverage.
  private readonly coveredLineNumbers: Set<number>;
  private readonly lineNumbers: Set<number>;

  // function coverage.
  private readonly coveredFunctionIds: Set<number>;
  private readonly functionNumbersIncludingTestFunctions: WASMFunction[];
  private readonly functionNumbersExcludingTestFunctions: WASMFunction[];

  // branch coverage.
  private readonly coveredNodes: Set<SourceCFGNode>;
  private readonly nodes: SourceCFGNode[];
  private readonly coveredSourceLocations: Map<
    string,
    CodeCoverageToolSourceLocation
  >;

  // test exit nodes.
  private readonly testExitNodes: Map<SourceCFGNode, boolean>;
  private resolveAllTestExitNodesEnteredPromise!: () => void;
  private readonly allTestExitNodesEnteredPromise: Promise<void>; // Gets resolved when all test exit nodes are entered.

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

    // line coverage.
    this.coveredLineNumbers = new Set();
    this.lineNumbers = new Set();
    for (const sourceLocation of this.languageAdaptor.sourceCFGs.sourceMap.allMappings()) {
      this.lineNumbers.add(sourceLocation.linenr);
    }

    // function coverage.
    this.coveredFunctionIds = new Set();
    this.functionNumbersIncludingTestFunctions =
      this.languageAdaptor.sourceCFGs.sourceMap.wasm.functions;
    this.functionNumbersExcludingTestFunctions =
      this.functionNumbersIncludingTestFunctions.filter((wasmFunction) => {
        return !this.wasmTestFunctionIds.includes(wasmFunction.id); // Exclude test function ids.
      });

    // branch coverage.
    this.coveredNodes = new Set();
    const sourceCFG = this.languageAdaptor.sourceCFGs;
    this.nodes = sourceCFG.allNodes();
    this.coveredSourceLocations = new Map();

    // test exit nodes.
    this.testExitNodes = new Map<SourceCFGNode, boolean>();
    for (const wasmTestFunctionId of this.wasmTestFunctionIds) {
      const testFunctionCFG =
        sourceCFG.getFunctionSourceCFG(wasmTestFunctionId);
      assert(testFunctionCFG);

      for (const testExitNode of testFunctionCFG.exitNodes) {
        this.testExitNodes.set(testExitNode, false);
      }
    }
    this.allTestExitNodesEnteredPromise = new Promise((resolve) => {
      this.resolveAllTestExitNodesEnteredPromise = resolve;
    });
  }

  private registerOnNodeEntryCallback(): void {
    for (const node of this.nodes) {
      this.analysis.onNodeEntry(
        node,
        (n: SourceCFGNode, _i: WasmInstruction, _args: ReadOnlyWasmValue[]) => {
          const sourceLocation = n.sourceLocation;

          // line coverage.
          this.coveredLineNumbers.add(sourceLocation.linenr);

          // function coverage.
          const functionId = n.wasmFunOwner;
          if (!this.wasmTestFunctionIds.includes(functionId))
            this.coveredFunctionIds.add(functionId);

          // branch coverage.
          this.coveredNodes.add(n);
          const key = `${sourceLocation.source}:${sourceLocation.linenr}:${sourceLocation.colnr}`;
          this.coveredSourceLocations.set(key, {
            sourceFile: sourceLocation.source,
            lineNr: sourceLocation.linenr,
            colNr: sourceLocation.colnr,
          });
        },
      );
    }
  }

  private registerOnTestExitNodeEntryCallback(): void {
    for (const testExitNode of this.testExitNodes.keys()) {
      this.analysis.onNodeEntry(testExitNode, () => {
        this.testExitNodes.set(testExitNode, true);
        if ([...this.testExitNodes.values()].every((visited) => visited)) {
          this.resolveAllTestExitNodesEnteredPromise();
        }
      });
    }
  }

  private getCoverageResults(): CodeCoverageToolResult {
    const lineCoverage = {
      coveredLineNumberCount: this.coveredLineNumbers.size,
      lineNumberCount: this.lineNumbers.size,
      ratio: Number(
        (this.coveredLineNumbers.size / this.lineNumbers.size).toFixed(2),
      ),
      coveredLineNumbers: [...this.coveredLineNumbers.values()],
    };

    const functionCoverage = {
      coveredFunctionCount: this.coveredFunctionIds.size,
      functionCount: this.functionNumbersExcludingTestFunctions.length,
      ratio: Number(
        (
          this.coveredFunctionIds.size /
          this.functionNumbersExcludingTestFunctions.length
        ).toFixed(2),
      ),
      coveredFunctionIds: [...this.coveredFunctionIds.values()],
    };

    const branchCoverage = {
      coveredNodeCount: this.coveredNodes.size,
      nodeCount: this.nodes.length,
      ratio: Number((this.coveredNodes.size / this.nodes.length).toFixed(2)),
    };

    const coveredSourceLocations = [...this.coveredSourceLocations.values()];

    return {
      lineCoverage,
      functionCoverage,
      branchCoverage,
      coveredSourceLocations,
    };
  }

  private async testExitNodeEnteredOrTimedOut(): Promise<void> {
    let timeout;
    const timeoutPromise = new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, this.config.timeoutMs);
    });

    await Promise.race([this.allTestExitNodesEnteredPromise, timeoutPromise]);
    clearTimeout(timeout);
  }

  async run(): Promise<CodeCoverageToolResult> {
    this.registerOnNodeEntryCallback();
    this.registerOnTestExitNodeEntryCallback();
    await this.analysis.deploy();

    for (const wasmTestFunctionId of this.wasmTestFunctionIds) {
      const callRequest = new RemoteCallRequest(wasmTestFunctionId, []);
      await this.vm.sendRequest(callRequest);
    }

    await this.testExitNodeEnteredOrTimedOut();
    await this.vm.close();
    return this.getCoverageResults();
  }
}
