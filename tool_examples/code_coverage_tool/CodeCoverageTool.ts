import { RemoteCallRequest } from '../../src/runtimes/wasmito_vm/requests/fun_call_request';
import { StateRequest } from '../../src/runtimes/wasmito_vm/requests/inspect_request';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WASMFunction } from '../../src/webassembly/wasm/wasm_function';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import {
  SourceCFGEdgeToNode,
  SourceCFGNode,
} from '../../src/cfg/source_cfg_node_edge';
import {
  CodeCoverageToolConfig,
  CodeCoverageToolSourceLocation,
  CodeCoverageToolResult,
} from './CodeCoverageToolTypes';

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

  // basic block coverage.
  private readonly coveredBasicBlocks: Map<string, Set<SourceCFGNode>>; // K = filename, V = set of covered basic blocks.
  private readonly basicBlocks: Map<string, Set<SourceCFGNode>>; // K = filename, V = set of basic blocks.

  // branch coverage.
  private readonly coveredBranches: Map<string, Set<string>>; // K = filename, V = set of covered branches.
  private readonly branches: Map<string, Set<string>>; // K = filename, V = set of branches.

  // covered source locations.
  private readonly coveredSourceLocations: Map<
    string,
    CodeCoverageToolSourceLocation
  >;

  // memory usage.
  private usedHeapBytesBefore: number;
  private usedHeapBytesAfter: number;

  constructor(
    languageAdaptor: LanguageAdaptor,
    vm: WasmitoBackendVM,
    wasmTestFunctionIds: number[],
    config?: Partial<CodeCoverageToolConfig>,
  ) {
    this.languageAdaptor = languageAdaptor;
    this.vm = vm;
    this.wasmTestFunctionIds = new Set(wasmTestFunctionIds);
    this.config = {
      implementation: config?.implementation ?? 'node',
      timeoutMs: config?.timeoutMs ?? 1000,
    };

    this.analysis = new WasmAnalysis(this.languageAdaptor, this.vm);

    // line coverage.
    this.coveredLineNumbers = new Map();
    this.lineNumbers = new Map();

    // function coverage.
    this.coveredFunctions = new Map();
    this.functions = new Map();

    // basic block coverage.
    this.coveredBasicBlocks = new Map();
    this.basicBlocks = new Map();

    // branch coverage.
    this.coveredBranches = new Map();
    this.branches = new Map();

    // line coverage, function coverage, basic block coverage.
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

      // basic block coverage.
      if (!this.coveredBasicBlocks.has(sourceLocation.source)) {
        this.coveredBasicBlocks.set(sourceLocation.source, new Set());
      }

      if (!this.basicBlocks.has(sourceLocation.source)) {
        this.basicBlocks.set(sourceLocation.source, new Set());
      }

      // branch coverage.
      if (!this.coveredBranches.has(sourceLocation.source)) {
        this.coveredBranches.set(sourceLocation.source, new Set());
      }

      if (!this.branches.has(sourceLocation.source)) {
        this.branches.set(sourceLocation.source, new Set());
      }
    }

    // basic block coverage.
    const sourceCFG = this.languageAdaptor.sourceCFGs;
    sourceCFG.allNodes().forEach((sourceCFGNode) => {
      const functionId = sourceCFGNode.wasmFunOwner;
      if (!this.wasmTestFunctionIds.has(functionId)) {
        const source = sourceCFGNode.sourceLocation.source;
        this.basicBlocks.get(source)!.add(sourceCFGNode);

        sourceCFGNode.edges.forEach((edge) => {
          const nodeEdgePointsTo = SourceCFGEdgeToNode(edge);
          const key = `${sourceCFGNode.nodeId}->${nodeEdgePointsTo.nodeId}`;
          this.branches.get(source)!.add(key);
        });
      }
    });

    // branch coverage.
    //this.branches.get(sourceLocation.source)!.add();

    // covered source locations.
    this.coveredSourceLocations = new Map();

    // memory usage.
    this.usedHeapBytesBefore = 0;
    this.usedHeapBytesAfter = 0;
  }

  private reportCoveredLine(sourceFile: string, lineNumber: number) {
    this.coveredLineNumbers.get(sourceFile)!.add(lineNumber);
  }

  private reportCoveredFunctionById(sourceFile: string, functionId: number) {
    const wasmFunction =
      this.languageAdaptor.sourceCFGs.sourceMap.getFunction(functionId)!;
    this.coveredFunctions.get(sourceFile)!.add(wasmFunction);
  }

  private reportCoveredFunction(
    sourceFile: string,
    wasmFunction: WASMFunction,
  ) {
    this.coveredFunctions.get(sourceFile)!.add(wasmFunction);
  }

  private reportCoveredBasicBlock(
    sourceFile: string,
    basicBlock: SourceCFGNode,
  ) {
    this.coveredBasicBlocks.get(sourceFile)!.add(basicBlock);
  }

  private reportCoveredBranch(
    sourceFile: string,
    from: SourceCFGNode,
    to: SourceCFGNode,
  ) {
    this.coveredBranches.get(sourceFile)!.add(`${from.nodeId}->${to.nodeId}`);
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

  private registerAfterInstructionCallback(): void {
    const wasmFunctions =
      this.languageAdaptor.sourceCFGs.sourceMap.wasm.functions;
    for (const wasmFunction of wasmFunctions) {
      if (!this.wasmTestFunctionIds.has(wasmFunction.id)) {
        for (const wasmInstruction of wasmFunction.allInstructions) {
          this.analysis.after(wasmInstruction, () => {
            // More than one possible mapping for wasmInstruction.
            const sourceLocation =
              this.languageAdaptor.sourceCFGs.sourceMap.getOriginalPositionFor(
                wasmInstruction.startAddress,
              )[0];

            // line coverage.
            this.reportCoveredLine(
              sourceLocation.source,
              sourceLocation.linenr,
            );

            // function coverage.
            this.reportCoveredFunction(sourceLocation.source, wasmFunction);

            // basic block coverage.
            // TODO

            // covered source locations.
            this.reportCoveredSourceLocation(
              sourceLocation.source,
              sourceLocation.linenr,
              sourceLocation.colnr,
            );

            // branch coverage.
            // TODO
          });
        }
      }
    }
  }

  private registerOnNodeEntryCallback(): void {
    let previousNode: SourceCFGNode | undefined;
    for (const basicBlocksPerSourceFile of this.basicBlocks.values()) {
      for (const basicBlock of basicBlocksPerSourceFile) {
        this.analysis.onNodeEntry(
          basicBlock,
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
            this.reportCoveredFunctionById(
              sourceLocation.source,
              n.wasmFunOwner,
            );

            // basic block coverage.
            this.reportCoveredBasicBlock(sourceLocation.source, n);

            // covered source locations.
            this.reportCoveredSourceLocation(
              sourceLocation.source,
              sourceLocation.linenr,
              sourceLocation.colnr,
            );

            // branch coverage.
            if (previousNode === undefined) {
              previousNode = n;
              return;
            }

            const edgeFoundUsedToEnterThisBasicBlock = previousNode.edges.find(
              (edge) => {
                const nodeEdgePointsTo = SourceCFGEdgeToNode(edge);
                return nodeEdgePointsTo.nodeId === n.nodeId;
              },
            );

            if (edgeFoundUsedToEnterThisBasicBlock !== undefined)
              this.reportCoveredBranch(sourceLocation.source, previousNode, n);

            previousNode = n;
          },
        );
      }
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

  private getBasicBlockCoverageResults(): CodeCoverageToolResult['basicBlockCoverage'] {
    const sourceFiles: CodeCoverageToolResult['basicBlockCoverage']['sourceFiles'] =
      [];

    let totalCoveredBasicBlockCount = 0;
    let totalBasicBlockCount = 0;

    for (const [
      sourceFile,
      basicBlocksPerSourceFile,
    ] of this.basicBlocks.entries()) {
      const coveredBasicBlocks = this.coveredBasicBlocks.get(sourceFile)!;

      const coveredBasicBlockCount = coveredBasicBlocks.size;
      const basicBlockCount = basicBlocksPerSourceFile.size;

      totalCoveredBasicBlockCount += coveredBasicBlockCount;
      totalBasicBlockCount += basicBlockCount;

      sourceFiles.push({
        name: sourceFile,
        coveredBasicBlockCount,
        basicBlockCount,
        ratio:
          basicBlockCount === 0
            ? 0
            : Number((coveredBasicBlockCount / basicBlockCount).toFixed(2)),
      });
    }

    return {
      sourceFiles,
      totalCoveredBasicBlockCount,
      totalBasicBlockCount,
      ratio:
        totalBasicBlockCount === 0
          ? 0
          : Number(
              (totalCoveredBasicBlockCount / totalBasicBlockCount).toFixed(2),
            ),
    };
  }

  private getBranchCoverageResults(): CodeCoverageToolResult['branchCoverage'] {
    const sourceFiles: CodeCoverageToolResult['branchCoverage']['sourceFiles'] =
      [];

    let totalCoveredBranchCount = 0;
    let totalBranchCount = 0;

    for (const [sourceFile, branchesPerSourceFile] of this.branches.entries()) {
      const coveredBranches = this.coveredBranches.get(sourceFile)!;

      const coveredBranchCount = coveredBranches.size;
      const branchCount = branchesPerSourceFile.size;

      totalCoveredBranchCount += coveredBranchCount;
      totalBranchCount += branchCount;

      sourceFiles.push({
        name: sourceFile,
        coveredBranchCount,
        branchCount,
        ratio:
          branchCount === 0
            ? 0
            : Number((coveredBranchCount / branchCount).toFixed(2)),
      });
    }

    return {
      sourceFiles,
      totalCoveredBranchCount,
      totalBranchCount,
      ratio:
        totalBranchCount === 0
          ? 0
          : Number((totalCoveredBranchCount / totalBranchCount).toFixed(2)),
    };
  }

  private getCoveredSourceLocationsResults(): CodeCoverageToolResult['coveredSourceLocations'] {
    return [...this.coveredSourceLocations.values()];
  }

  private getCoverageResults(): CodeCoverageToolResult {
    const lineCoverage = this.getLineCoverageResults();
    const functionCoverage = this.getFunctionCoverageResults();
    const basicBlockCoverage = this.getBasicBlockCoverageResults();
    const branchCoverage = this.getBranchCoverageResults();
    const coveredSourceLocations = this.getCoveredSourceLocationsResults();
    const heapBytesUsed = this.usedHeapBytesAfter - this.usedHeapBytesBefore;

    return {
      lineCoverage,
      functionCoverage,
      basicBlockCoverage,
      branchCoverage,
      coveredSourceLocations,
      heapBytesUsed,
    };
  }

  private async inspectUsedHeapBytes(): Promise<number> {
    return (await this.vm.inspect(new StateRequest().includeHeapFree()))
      .heapFree!;
  }

  async run(): Promise<CodeCoverageToolResult> {
    this.usedHeapBytesBefore = await this.inspectUsedHeapBytes();
    if (this.config.implementation === 'node') {
      this.registerOnNodeEntryCallback();
    } else if (this.config.implementation === 'instruction') {
      this.registerAfterInstructionCallback();
    }
    await this.analysis.deploy();
    this.usedHeapBytesAfter = await this.inspectUsedHeapBytes();

    for (const wasmTestFunctionId of this.wasmTestFunctionIds) {
      const callRequest = new RemoteCallRequest(wasmTestFunctionId, []);

      let timeout;
      const timeoutPromise = new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, this.config.timeoutMs);
      });

      await Promise.race([this.vm.sendRequest(callRequest), timeoutPromise]);
      clearTimeout(timeout);
    }

    await this.vm.close();
    return this.getCoverageResults();
  }
}
