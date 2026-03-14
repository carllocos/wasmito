import path, { resolve } from 'path';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import assert from 'assert';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { SourceCFGNode } from '../../src/cfg/source_cfg_node_edge';
import {
  SourceCodeLocation,
  sourceCodeLocationToString,
} from '../../src/source_mappers/source_map';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

async function main(): Promise<void> {
  const examplesDir = resolve('./app_examples/assemblyscript');
  const mappingsPath = path.join(examplesDir, 'toggle_led/wasm/mappings.json');
  const wasmPath = path.join(examplesDir, 'toggle_led/wasm/toggle_led.wasm');
  const langAdaptor = LanguageAdaptor.fromMappingsPath(mappingsPath, {
    // give the absolute path to the wasmModule
    newWasmPath: wasmPath,
    // allows relative paths in the debugging information
    // needed to ensure that all the CFG nodes are cosntructed
    relativePaths: true,
  });

  const file = readFileSync(resolve('./tool_examples/record/recording.csv'));
  const records = parse(file);

  records.forEach((record) => {
    // console.log(record);
    if (record[0] != '') {
      console.log('this is an interrupt');
    } else {
      // console.log(parseInt(record[2]));
      const sourceLocations: SourceCodeLocation[] =
        langAdaptor.sourceMap.getOriginalPositionFor(parseInt(record[2]));

      assert(sourceLocations.length <= 1);
      if (sourceLocations.length == 1) {
        const location = sourceLocations[0];
        console.log(
          `line: ${location.linenr}, col: ${location.colnr}, name: ${location.name}, in file: ${location.source}`,
        );
      } else {
        console.log('???');
      }
    }
  });
}

main();
