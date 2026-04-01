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

// line coverage does not exclude test lines.
export class CodeCoverageTool {
  private readonly languageAdaptor: LanguageAdaptor;
  private readonly vm: WasmitoBackendVM;
  private readonly wasmTestFunctionIds: Set<number>;
  private readonly config: CodeCoverageToolConfig;

  private readonly analysis: WasmAnalysis;

  // line coverage.
  private readonly coveredLineNumbers: Map<string, Set<number>>; // K = filename, V = set of covered line numbers.
  private readonly lineNumbers: Map<string, Set<number>>; // K = filename, V = set of line numbers.

  // function coverage.
  private readonly coveredFunctionIds: Set<number>;
  private readonly functionsExcludingTests: Set<WASMFunction>;

  // branch coverage.
  private readonly coveredNodes: Set<SourceCFGNode>;
  private readonly nodes: SourceCFGNode[];
  private readonly coveredSourceLocations: Map<
    string,
    CodeCoverageToolSourceLocation
  >;

  // test exit nodes.
  private readonly testExitNodes: Set<SourceCFGNode>;
  private testExitNodesRemaining: number;
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
    this.wasmTestFunctionIds = new Set(wasmTestFunctionIds);
    this.config = { timeoutMs: config?.timeoutMs ?? 1000 };

    this.analysis = new WasmAnalysis(this.languageAdaptor, this.vm);

    // line coverage.
    this.coveredLineNumbers = new Map();
    this.lineNumbers = new Map();
    for (const sourceLocation of this.languageAdaptor.sourceCFGs.sourceMap.allMappings()) {
      if (!this.coveredLineNumbers.has(sourceLocation.source)) {
        this.coveredLineNumbers.set(sourceLocation.source, new Set());
      }

      if (!this.lineNumbers.has(sourceLocation.source)) {
        this.lineNumbers.set(sourceLocation.source, new Set());
      }
      this.lineNumbers.get(sourceLocation.source)!.add(sourceLocation.linenr);
    }

    // function coverage.
    this.coveredFunctionIds = new Set();
    this.functionsExcludingTests = new Set();
    this.languageAdaptor.sourceCFGs.sourceMap.wasm.functions.forEach(
      (wasmFunction) => {
        if (!this.wasmTestFunctionIds.has(wasmFunction.id))
          this.functionsExcludingTests.add(wasmFunction);
      },
    );

    // branch coverage.
    this.coveredNodes = new Set();
    const sourceCFG = this.languageAdaptor.sourceCFGs;
    this.nodes = sourceCFG.allNodes();
    this.coveredSourceLocations = new Map();

    // test exit nodes.
    this.testExitNodes = new Set();
    this.testExitNodesRemaining = 0;
    for (const wasmTestFunctionId of this.wasmTestFunctionIds) {
      const testFunctionCFG =
        sourceCFG.getFunctionSourceCFG(wasmTestFunctionId);
      assert(
        testFunctionCFG,
        'No CFG for test function: ' + wasmTestFunctionId,
      );

      for (const testExitNode of testFunctionCFG.exitNodes) {
        this.testExitNodes.add(testExitNode);
      }
    }
    this.testExitNodesRemaining = this.testExitNodes.size;
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
          this.coveredLineNumbers
            .get(sourceLocation.source)!
            .add(sourceLocation.linenr);

          // function coverage.
          const functionId = n.wasmFunOwner;
          if (!this.wasmTestFunctionIds.has(functionId))
            this.coveredFunctionIds.add(functionId);

          // branch coverage.
          this.coveredNodes.add(n);

          // covered source locations.
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
        if (--this.testExitNodesRemaining === 0)
          this.resolveAllTestExitNodesEnteredPromise();
      });
    }
  }

  private getCoverageResults(): CodeCoverageToolResult {
    // line coverage.
    const coveredLineNumberCount = [...this.coveredLineNumbers.values()].reduce(
      (sum, current) => sum + current.size,
      0,
    );
    const lineNumberCount = [...this.lineNumbers.values()].reduce(
      (sum, current) => sum + current.size,
      0,
    );
    const lineCoverage = {
      coveredLineNumberCount,
      lineNumberCount,
      ratio: Number((coveredLineNumberCount / lineNumberCount).toFixed(2)),
    };

    // function coverage.
    const coveredFunctionCount = this.coveredFunctionIds.size;
    const functionCount = this.functionsExcludingTests.size;
    const functionCoverage = {
      coveredFunctionCount,
      functionCount,
      ratio: Number((coveredFunctionCount / functionCount).toFixed(2)),
      coveredFunctions: [...this.coveredFunctionIds.values()].map(
        (functionId) => {
          const wasmFunction =
            this.languageAdaptor.sourceCFGs.sourceMap.getFunction(functionId)!;
          return { id: functionId, name: wasmFunction.name };
        },
      ),
    };

    // branch coverage.
    const coveredNodeCount = this.coveredNodes.size;
    const nodeCount = this.nodes.length;
    const branchCoverage = {
      coveredNodeCount,
      nodeCount,
      ratio: Number((coveredNodeCount / nodeCount).toFixed(2)),
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
