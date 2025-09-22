import { type LineInfoPairs } from '../../webassembly/parsers/obj-dump_parser';
import {
  SourceMap,
  SourceMapJSON,
  mappingItemToSourceCodeLocation,
} from '../source_map';
import { type MappingItem } from 'source-map';
import { SourceMapFromJSON } from '../source_map_builder';
import {
  DefaultColumnStartNumber,
  DefaultLineStartNumber,
} from '../source_map_config';

export async function createSourceMapForWAT(
  lines: LineInfoPairs[],
  sourcePath: string,
  wasmPath: string,
): Promise<SourceMap> {
  const mappings = createWAT2WASMMappings(sourcePath, lines);
  const sourceLocations = mappings.map(mappingItemToSourceCodeLocation);
  const sm: SourceMapJSON = {
    wasm: wasmPath,
    sources: [sourcePath],
    mappings: sourceLocations,
  };
  return await SourceMapFromJSON(sm, {
    colNrStartNumber: DefaultColumnStartNumber,
    lineNrStartNumber: DefaultLineStartNumber,
    cleanMappings: true,
  });
}

function createWAT2WASMMappings(
  sourceCodePath: string,
  infoLines: LineInfoPairs[],
): MappingItem[] {
  const mappings: MappingItem[] = [];

  for (let i = 0; i < infoLines.length; i++) {
    const lines: LineInfoPairs[] = infoLines.filter(
      (l) => l.lineInfo.line === infoLines[i].lineInfo.line,
    );

    for (let j = 0; j < lines.length; j++) {
      const l = lines[j];
      mappings.push({
        source: sourceCodePath,
        generatedColumn: l.lineAddress,
        generatedLine: 1,
        originalLine: l.lineInfo.line,
        originalColumn: l.lineInfo.columnStart,
        name: 'todo name of wat',
      });
    }
  }
  return mappings;
}
