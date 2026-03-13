import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { SourceCFGNode } from '../../src/cfg/source_cfg_node_edge';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WasmInstruction, WasmitoBackendVM } from '../../src';
import {
  CodeCoverageToolConfig,
  CodeCoverageToolSourceCodeLocation,
  CodeCoverageToolResult,
} from './CodeCoverageToolTypes';
import assert from 'assert';

export class CodeCoverageTool {
  private readonly languageAdaptor: LanguageAdaptor;
  private readonly vm: WasmitoBackendVM;
  private readonly config: CodeCoverageToolConfig;

  private readonly analysis: WasmAnalysis;

  private readonly allNodes: SourceCFGNode[];
  private readonly exitNodes: SourceCFGNode[];
  private readonly visitedNodes: Set<SourceCFGNode>;
  private readonly coveredSourceCodeLocations: Map<
    string,
    CodeCoverageToolSourceCodeLocation
  >;

  private resolveExitNodeEnteredPromise!: () => void;
  private readonly exitNodeEnteredPromise: Promise<void>; // Gets resolved when an exit node is entered.

  constructor(
    languageAdaptor: LanguageAdaptor,
    vm: WasmitoBackendVM,
    config?: Partial<CodeCoverageToolConfig>,
  ) {
    this.languageAdaptor = languageAdaptor;
    this.vm = vm;
    this.config = {
      maxAnalysisTimeMs: config?.maxAnalysisTimeMs ?? 1000,
      includeCoveredSourceCodeLocations:
        config?.includeCoveredSourceCodeLocations ?? false,
    };

    this.analysis = new WasmAnalysis(this.languageAdaptor, this.vm);

    const sourceCFG = this.languageAdaptor.sourceCFGs;
    this.allNodes = sourceCFG.allNodes();

    const mainFunction = this.languageAdaptor.sourceMap.wasm.getMainFunction();
    const mainFunctionCFG = sourceCFG.getFunctionSourceCFG(mainFunction.id);
    assert(mainFunctionCFG);
    this.exitNodes = mainFunctionCFG.exitNodes;

    this.visitedNodes = new Set();
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
          this.visitedNodes.add(n);

          if (!this.config.includeCoveredSourceCodeLocations) return;
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
    const totalVisitedNodes = this.visitedNodes.size;
    const totalNodes = this.allNodes.length;
    const branchCoverage = Number((totalVisitedNodes / totalNodes).toFixed(2));

    return this.config.includeCoveredSourceCodeLocations
      ? {
          visitedNodes: totalVisitedNodes,
          totalNodes,
          branchCoverage,
          coveredSourceCodeLocations: Array.from(
            this.coveredSourceCodeLocations.values(),
          ),
        }
      : {
          visitedNodes: totalVisitedNodes,
          totalNodes,
          branchCoverage,
        };
  }

  private async exitNodeEnteredOrTimedOut(): Promise<void> {
    let timeout;
    const timeoutPromise = new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, this.config.maxAnalysisTimeMs);
    });

    await Promise.race([this.exitNodeEnteredPromise, timeoutPromise]);
    clearTimeout(timeout);
  }

  async run(): Promise<CodeCoverageToolResult> {
    this.registerOnNodeEntryCallback();
    this.registerOnExitNodeEntryCallback();
    await this.analysis.deploy();
    await this.analysis.run();
    await this.exitNodeEnteredOrTimedOut();
    await this.vm.close();
    return this.getCoverageResults();
  }
}
