/*
 * This example shows a small tool that logs the execution of a Rust blink application running on a desktop VM.
 * The tool uses the CFG to log each executed node.
 */
import path, { resolve } from 'path';
import { DeviceManager } from '../../src/device/device_manager';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import assert from 'assert';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { SourceCFGNode } from '../../src/cfg/source_cfg_node_edge';
import { sourceCodeLocationToString } from '../../src/source_mappers/source_map';

async function main(): Promise<void> {
  /*
   * Construct the language adaptor by using the debugging information as json
   * See `tutorial/debugging.md` for more information
   */
  const examplesDir = resolve('./app_examples/rust/');
  const mappingsPath = path.join(examplesDir, 'blink/wasm/mappings.json');
  const wasmPath = path.join(examplesDir, 'blink/wasm/blink.wasm');
  const langAdaptor = LanguageAdaptor.fromMappingsPath(mappingsPath, {
    // give the absolute path to the wasmModule
    newWasmPath: wasmPath,
    // allows relative paths in the debugging information
    // needed to ensure that all the CFG nodes are cosntructed
    relativePaths: true,
  });

  /*
   * Access the main function of the blink.rs
   * To then access the CFG of the main function.
   */
  const mainFunc = langAdaptor.sourceMap.wasm.getMainFunction();
  assert(langAdaptor.sourceCFG !== undefined, 'No CFGs were constructed');
  const cfgMain = langAdaptor.sourceCFG.getFunctionSourceCFG(mainFunc.id);
  assert(cfgMain !== undefined, 'no CFG found for the main function');

  // Spawn a development VM to run analysis on desktop
  const vmConnection = await spawnDevVM(langAdaptor);

  // Create an empty analysis
  const analysis = new WasmAnalysis(langAdaptor, vmConnection);

  /*
   * Iterate over each node and per node register a callback
   * The callback can have different signatures.
   * See `onNodeEntry` for more signatures
   */
  for (const node of cfgMain.allNodes) {
    analysis.onNodeEntry(
      node,
      (n: SourceCFGNode, i: WasmInstruction, args: ReadOnlyWasmValue[]) => {
        // What needs to be executed once execution enters the node
        // i is the WasmInstruction executed
        // if i takes arguments, then args are the arguments provided to the Wasm instruction
        let insStr = `0x${i.startAddress.toString(16)} '${i.name}'`;
        if (args.length > 0) {
          const argsStr = args.map((a) => `${a.value}`).join(' ');
          insStr += `with args ${argsStr}`;
        }
        const loc = sourceCodeLocationToString(n.sourceLocation);
        console.log(`Node ${n.nodeId} ${loc} ${insStr}`);
      },
    );
  }
  await analysis.deploy();
  await analysis.run();
}

async function spawnDevVM(la: LanguageAdaptor): Promise<WasmitoBackendVM> {
  const dm = new DeviceManager();
  return await dm.spawnDevelopmentVM(la);
}

main().catch(console.error);
