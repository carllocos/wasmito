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
  private readonly wasmTestFunctionIds: Set<number>;
  private readonly config: CodeCoverageToolConfig;

  private readonly analysis: WasmAnalysis;

  // line coverage.
  private readonly coveredLineNumbers: Map<string, Set<number>>; // K = filename, V = set of covered line numbers.
  private readonly lineNumbers: Map<string, Set<number>>; // K = filename, V = set of line numbers.

  // function coverage.
  private readonly coveredFunctions: Map<string, Set<WASMFunction>>; // K = filename, V = set of covered functions.
  private readonly functions: Map<string, Set<WASMFunction>>; // K = filename, V = set of functions.

  // branch coverage.
  private readonly coveredNodes: Map<string, Set<SourceCFGNode>>; // K = filename, V = set of covered nodes.
  private readonly nodes: Map<string, Set<SourceCFGNode>>; // K = filename, V = set of nodes.

  // covered source locations.
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

    // function coverage.
    this.coveredFunctions = new Map();
    this.functions = new Map();

    // branch coverage.
    this.coveredNodes = new Map();
    this.nodes = new Map();

    // line coverage, function coverage, branch coverage.
    const nonTestFunctions =
      this.languageAdaptor.sourceCFGs.sourceMap.wasm.functions.filter(
        (wasmFunction) => !this.wasmTestFunctionIds.has(wasmFunction.id),
      );
    for (const sourceLocation of this.languageAdaptor.sourceCFGs.sourceMap.allMappings()) {
      // line coverage.
      if (!this.coveredLineNumbers.has(sourceLocation.source)) {
        this.coveredLineNumbers.set(sourceLocation.source, new Set());
      }

      if (!this.lineNumbers.has(sourceLocation.source)) {
        this.lineNumbers.set(sourceLocation.source, new Set());
      }

      // function coverage.
      if (!this.coveredFunctions.has(sourceLocation.source)) {
        this.coveredFunctions.set(sourceLocation.source, new Set());
      }

      if (!this.functions.has(sourceLocation.source)) {
        this.functions.set(sourceLocation.source, new Set());
      }

      // line coverage, function coverage.
      nonTestFunctions.forEach((nonTestWasmFunction) => {
        if (
          nonTestWasmFunction.startAddress <= sourceLocation.address &&
          sourceLocation.address <= nonTestWasmFunction.endAddress
        ) {
          this.lineNumbers
            .get(sourceLocation.source)!
            .add(sourceLocation.linenr);

          this.functions.get(sourceLocation.source)!.add(nonTestWasmFunction);
        }
      });

      // branch coverage.
      if (!this.coveredNodes.has(sourceLocation.source)) {
        this.coveredNodes.set(sourceLocation.source, new Set());
      }

      if (!this.nodes.has(sourceLocation.source)) {
        this.nodes.set(sourceLocation.source, new Set());
      }
    }

    // branch coverage.
    const sourceCFG = this.languageAdaptor.sourceCFGs;
    sourceCFG.allNodes().forEach((sourceCFGNode) => {
      const functionId = sourceCFGNode.wasmFunOwner;
      if (!this.wasmTestFunctionIds.has(functionId)) {
        this.nodes.get(sourceCFGNode.sourceLocation.source)!.add(sourceCFGNode);
      }
    });

    // covered source locations.
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

  private reportCoveredLine(sourceFile: string, lineNumber: number) {
    this.coveredLineNumbers.get(sourceFile)!.add(lineNumber);
  }

  private reportCoveredFunction(sourceFile: string, functionId: number) {
    const wasmFunction =
      this.languageAdaptor.sourceCFGs.sourceMap.getFunction(functionId)!;
    this.coveredFunctions.get(sourceFile)!.add(wasmFunction);
  }

  private reportCoveredNode(sourceFile: string, node: SourceCFGNode) {
    this.coveredNodes.get(sourceFile)!.add(node);
  }

  private reportCoveredSourceLocation(
    sourceFile: string,
    lineNr: number,
    colNr: number,
  ) {
    const key = `${sourceFile}:${lineNr}:${colNr}`;
    this.coveredSourceLocations.set(key, {
      sourceFile,
      lineNr,
      colNr,
    });
  }

  private registerOnNodeEntryCallback(): void {
    for (const nodesPerSourceFile of this.nodes.values()) {
      for (const node of nodesPerSourceFile) {
        this.analysis.onNodeEntry(
          node,
          (
            n: SourceCFGNode,
            _i: WasmInstruction,
            _args: ReadOnlyWasmValue[],
          ) => {
            const sourceLocation = n.sourceLocation;

            // line coverage.
            this.reportCoveredLine(
              sourceLocation.source,
              sourceLocation.linenr,
            );

            // function coverage.
            this.reportCoveredFunction(sourceLocation.source, n.wasmFunOwner);

            // branch coverage.
            this.reportCoveredNode(sourceLocation.source, n);

            // covered source locations.
            this.reportCoveredSourceLocation(
              sourceLocation.source,
              sourceLocation.linenr,
              sourceLocation.colnr,
            );
          },
        );
      }
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

  private getLineCoverageResults(): CodeCoverageToolResult['lineCoverage'] {
    const sourceFiles: CodeCoverageToolResult['lineCoverage']['sourceFiles'] =
      [];

    let totalCoveredLineNumberCount = 0;
    let totalLineNumberCount = 0;

    for (const [sourceFile, linesPerSourceFile] of this.lineNumbers.entries()) {
      const coveredLines = this.coveredLineNumbers.get(sourceFile)!;

      const coveredLineNumberCount = coveredLines.size;
      const lineNumberCount = linesPerSourceFile.size;

      totalCoveredLineNumberCount += coveredLineNumberCount;
      totalLineNumberCount += lineNumberCount;

      sourceFiles.push({
        name: sourceFile,
        coveredLineNumberCount,
        lineNumberCount,
        ratio:
          lineNumberCount === 0
            ? 0
            : Number((coveredLineNumberCount / lineNumberCount).toFixed(2)),
        coveredLines: Array.from(coveredLines),
      });
    }

    return {
      sourceFiles,
      totalCoveredLineNumberCount,
      totalLineNumberCount,
      ratio:
        totalLineNumberCount === 0
          ? 0
          : Number(
              (totalCoveredLineNumberCount / totalLineNumberCount).toFixed(2),
            ),
    };
  }

  private getFunctionCoverageResults(): CodeCoverageToolResult['functionCoverage'] {
    const sourceFiles: CodeCoverageToolResult['functionCoverage']['sourceFiles'] =
      [];

    let totalCoveredFunctionCount = 0;
    let totalFunctionCount = 0;

    for (const [
      sourceFile,
      functionsPerSourceFile,
    ] of this.functions.entries()) {
      const coveredFunctions = this.coveredFunctions.get(sourceFile)!;

      const coveredFunctionCount = coveredFunctions.size;
      const functionCount = functionsPerSourceFile.size;

      totalCoveredFunctionCount += coveredFunctionCount;
      totalFunctionCount += functionCount;

      sourceFiles.push({
        name: sourceFile,
        coveredFunctionCount,
        functionCount,
        ratio:
          functionCount === 0
            ? 0
            : Number((coveredFunctionCount / functionCount).toFixed(2)),
        coveredFunctions: Array.from(coveredFunctions).map(
          (coveredFunction) => ({
            id: coveredFunction.id,
            name: coveredFunction.name,
          }),
        ),
      });
    }

    return {
      sourceFiles,
      totalCoveredFunctionCount,
      totalFunctionCount,
      ratio:
        totalFunctionCount === 0
          ? 0
          : Number((totalCoveredFunctionCount / totalFunctionCount).toFixed(2)),
    };
  }

  private getBranchCoverageResults(): CodeCoverageToolResult['branchCoverage'] {
    const sourceFiles: CodeCoverageToolResult['branchCoverage']['sourceFiles'] =
      [];

    let totalCoveredNodeCount = 0;
    let totalNodeCount = 0;

    for (const [sourceFile, nodesPerSourceFile] of this.nodes.entries()) {
      const coveredNodes = this.coveredNodes.get(sourceFile)!;

      const coveredNodeCount = coveredNodes.size;
      const nodeCount = nodesPerSourceFile.size;

      totalCoveredNodeCount += coveredNodeCount;
      totalNodeCount += nodeCount;

      sourceFiles.push({
        name: sourceFile,
        coveredNodeCount,
        nodeCount,
        ratio:
          nodeCount === 0
            ? 0
            : Number((coveredNodeCount / nodeCount).toFixed(2)),
      });
    }

    return {
      sourceFiles,
      totalCoveredNodeCount,
      totalNodeCount,
      ratio:
        totalNodeCount === 0
          ? 0
          : Number((totalCoveredNodeCount / totalNodeCount).toFixed(2)),
    };
  }

  private getCoveredSourceLocationsResults(): CodeCoverageToolResult['coveredSourceLocations'] {
    return [...this.coveredSourceLocations.values()];
  }

  private getCoverageResults(): CodeCoverageToolResult {
    const lineCoverage = this.getLineCoverageResults();
    const functionCoverage = this.getFunctionCoverageResults();
    const branchCoverage = this.getBranchCoverageResults();
    const coveredSourceLocations = this.getCoveredSourceLocationsResults();

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
