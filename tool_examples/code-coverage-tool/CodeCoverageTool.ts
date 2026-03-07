import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { CodeCoverageToolConfig } from './types/CodeCoverageToolConfig';
import { SourceCFGNode } from '../../src/cfg/source_cfg_node_edge';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WasmInstruction, WasmitoBackendVM } from '../../src';
import { exit } from 'process';
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

  private registerBranchCoverageOnNodeEntryCallbacks() {
    for (const node of this.allNodes) {
      this.analysis.onNodeEntry(
        node,
        (n: SourceCFGNode, _i: WasmInstruction, _args: ReadOnlyWasmValue[]) => {
          this.visitedNodes.add(n);
        },
      );
    }
  }

  private registerOnExitNodeEntryCallbacks() {
    for (const exitNode of this.exitNodes) {
      this.analysis.onNodeEntry(exitNode, async () => await this.shutdown());
    }
  }

  private displayCoverageResults() {
    const totalVisitedNodes = this.visitedNodes.size;
    const totalNodes = this.allNodes.length;
    const branchCoverage = (totalVisitedNodes / totalNodes) * 100;

    console.error('Amount of visited nodes: ' + totalVisitedNodes);
    console.error('Total amount of nodes: ' + totalNodes);
    console.error('Branch coverage: ' + branchCoverage.toFixed(1) + '%');
  }

  private async shutdown() {
    this.displayCoverageResults();
    await this.vm.close();
    exit();
  }

  async run() {
    this.registerBranchCoverageOnNodeEntryCallbacks();
    this.registerOnExitNodeEntryCallbacks();
    await this.analysis.deploy();
    await this.analysis.run();
    setTimeout(async () => {
      await this.shutdown();
    }, this.config.maxAnalysisTimeMs);
  }
}
