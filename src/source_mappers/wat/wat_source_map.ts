import { SourceCodeLocation, SourceMap, SourceMapJSON } from '../source_map';
import { SourceMapFromJSON } from '../source_map_builder';

export function createSourceMapForWAT(
  sourceLocations: SourceCodeLocation[],
  sourcePath: string,
  wasmPath: string,
): SourceMap {
  const sm: SourceMapJSON = {
    wasm: wasmPath,
    sources: [sourcePath],
    mappings: sourceLocations,
  };
  return SourceMapFromJSON(sm, {
    removeUnusedMappings: true,
  });
}
