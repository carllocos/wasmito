import path from 'path';
import { SourceCFGNode, SourceCFGs } from '../src/cfg/source_cfg';
import { WasmCFGs } from '../src/cfg/wasm_cfg';
import { SourceMapFromJSON } from '../src/source_mappers/source_map_builder';
import {
  DefaultColumnStartNumber,
  DefaultLineStartNumber,
  SourceMapConfig,
} from '../src/source_mappers/source_map_config';
import {
  SourceCodeLocation,
  sourceCodeLocationToString,
} from '../src/source_mappers/source_map';

export function loadSourceCFGs(
  wasmPath: string,
  mappingsPath: string,
  config?: SourceMapConfig,
): SourceCFGs {
  if (config === undefined) {
    config = {
      newWasmPath: wasmPath,
      lineNrStartNumber: DefaultLineStartNumber,
      colNrStartNumber: DefaultColumnStartNumber,
      prefixSources: path.resolve('./'),
      removeUnusedMappings: true,
    };
  }
  const sourceMap = SourceMapFromJSON(mappingsPath, config);
  const wcfgs = new WasmCFGs(sourceMap.wasm);
  return new SourceCFGs(new Map(), sourceMap, wcfgs);
}

export function NodeFromLocation(
  SCFGs: SourceCFGs,
  loc: SourceCodeLocation,
): SourceCFGNode {
  const nodes = SCFGs.nodesFromSourceLoc(loc);
  if (nodes.length === 0) {
    throw new Error(
      `No node found for location ${sourceCodeLocationToString(loc)}`,
    );
  } else if (nodes.length > 1) {
    throw new Error(
      `Multiple nodes found #(${nodes.length}) for location ${sourceCodeLocationToString(loc)}`,
    );
  } else {
    return nodes[0];
  }
}
