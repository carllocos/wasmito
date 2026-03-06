import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { SourceCFGNode } from '../../src/cfg/source_cfg_node_edge';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WasmInstruction, WasmitoBackendVM } from '../../src';
import { spawnDevVM } from '../spawn_vm';
import path, { resolve } from 'path';
import assert from 'assert';

class CodeCoverageTool {
  private readonly languageAdaptor: LanguageAdaptor;
  private vm!: WasmitoBackendVM;
  private analysis!: WasmAnalysis;
  private visitedNodes = new Set<SourceCFGNode>();

  constructor(wasmPath: string, mappingsPath: string) {
    this.languageAdaptor = LanguageAdaptor.fromMappingsPath(mappingsPath, {
      newWasmPath: wasmPath,
      relativePaths: true,
    });
  }

  private registerNodeHandlers(nodes: SourceCFGNode[]) {
    for (const node of nodes) {
      this.analysis.onNodeEntry(
        node,
        (n: SourceCFGNode, _i: WasmInstruction, _args: ReadOnlyWasmValue[]) => {
          this.visitedNodes.add(n);
        },
      );
    }
  }

  private registerExitHandlers(exitNodes: SourceCFGNode[], totalNodes: number) {
    for (const exitNode of exitNodes) {
      this.analysis.onNodeEntry(exitNode, async () => {
        const totalVisitedNodes = this.visitedNodes.size;
        const branchCoverage = (totalVisitedNodes / totalNodes) * 100;

        console.error('Amount of visited nodes: ' + totalVisitedNodes);
        console.error('Total amount of nodes: ' + totalNodes);
        console.error('Branch coverage: ' + branchCoverage.toFixed(1) + '%');

        await this.vm.close();
      });
    }
  }

  private async runCoverage() {
    const sourceCFG = this.languageAdaptor.sourceCFG;
    assert(sourceCFG);

    const allNodes = sourceCFG.allNodes();
    const totalNodes = allNodes.length;

    const mainFunction = this.languageAdaptor.sourceMap.wasm.getMainFunction();
    const mainFunctionCFG = sourceCFG.getFunctionSourceCFG(mainFunction.id);
    assert(mainFunctionCFG);
    const mainFunctionExitNodes = mainFunctionCFG.exitNodes;

    this.registerNodeHandlers(allNodes);
    this.registerExitHandlers(mainFunctionExitNodes, totalNodes);

    await this.analysis.deploy();
    await this.analysis.run();
  }

  async runOnDevVm() {
    this.vm = await spawnDevVM(this.languageAdaptor);
    this.analysis = new WasmAnalysis(this.languageAdaptor, this.vm);

    await this.runCoverage();
  }
}

async function main(): Promise<void> {
  const exampleName = 'test';

  const examplesDirectory = resolve('./app_examples/assemblyscript/');
  const exampleDirectory = path.join(examplesDirectory, exampleName);

  const wasmPath = path.join(exampleDirectory, `wasm/${exampleName}.wasm`);
  const mappingsPath = path.join(exampleDirectory, 'wasm/mappings.json');

  const codeCoverageTool = new CodeCoverageTool(wasmPath, mappingsPath);
  await codeCoverageTool.runOnDevVm();
}

main().catch(console.error);
