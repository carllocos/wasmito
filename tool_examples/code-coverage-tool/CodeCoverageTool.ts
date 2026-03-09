import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { CodeCoverageToolConfig } from './types/CodeCoverageToolConfig';
import { CodeCoverageToolResult } from './types/CodeCoverageToolOutput';
import { SourceCFGNode } from '../../src/cfg/source_cfg_node_edge';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WasmInstruction, WasmitoBackendVM } from '../../src';
import assert from 'assert';

export class CodeCoverageTool {
  private readonly languageAdaptor: LanguageAdaptor;
  private readonly vm: WasmitoBackendVM;
  private readonly config: CodeCoverageToolConfig;

  private readonly analysis: WasmAnalysis;

  private readonly allNodes;
  private readonly exitNodes;
  private readonly visitedNodes;

  constructor(
    languageAdaptor: LanguageAdaptor,
    vm: WasmitoBackendVM,
    config?: CodeCoverageToolConfig,
  ) {
    this.languageAdaptor = languageAdaptor;
    this.vm = vm;
    this.config = config || { maxAnalysisTimeMs: 10000 };

    this.analysis = new WasmAnalysis(this.languageAdaptor, this.vm);

    const sourceCFG = this.languageAdaptor.sourceCFG;
    assert(sourceCFG);
    this.allNodes = sourceCFG.allNodes();

    const mainFunction = this.languageAdaptor.sourceMap.wasm.getMainFunction();
    const mainFunctionCFG = sourceCFG.getFunctionSourceCFG(mainFunction.id);
    assert(mainFunctionCFG);
    this.exitNodes = mainFunctionCFG.exitNodes;

    this.visitedNodes = new Set<SourceCFGNode>();
  }

  private registerBranchCoverageOnNodeEntryCallbacks(): void {
    for (const node of this.allNodes) {
      this.analysis.onNodeEntry(
        node,
        (n: SourceCFGNode, _i: WasmInstruction, _args: ReadOnlyWasmValue[]) => {
          this.visitedNodes.add(n);
        },
      );
    }
  }

  private registerOnExitNodeEntryCallbacks(): void {
    for (const exitNode of this.exitNodes) {
      this.analysis.onNodeEntry(exitNode, async () => await this.shutdown());
    }
  }

  private getCoverageResults(): CodeCoverageToolResult {
    const totalVisitedNodes = this.visitedNodes.size;
    const totalNodes = this.allNodes.length;
    const branchCoverage = Number((totalVisitedNodes / totalNodes).toFixed(2));

    return {
      visitedNodes: totalVisitedNodes,
      totalNodes,
      branchCoverage,
    };
  }

  private async shutdown(): Promise<CodeCoverageToolResult> {
    await this.vm.close();
    return this.getCoverageResults();
  }

  sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async run(): Promise<CodeCoverageToolResult> {
    this.registerBranchCoverageOnNodeEntryCallbacks();
    this.registerOnExitNodeEntryCallbacks();
    await this.analysis.deploy();
    await this.analysis.run();
    await this.sleep(this.config.maxAnalysisTimeMs);
    return await this.shutdown();
  }
}
