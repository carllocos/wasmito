import { type LineInfoPairs } from '../../webassembly/parsers/obj-dump_parser';
import { SourceMap } from '../source_map';
import { type MappingItem } from 'source-map';

export function createSourceMapForWAT(
  lines: LineInfoPairs[],
  sourcePath: string,
  wasmPath: string,
): SourceMap {
  const mappings = createWAT2WASMMappings(sourcePath, lines);
  return new SourceMap(
    'todo path to sourcemap',
    wasmPath,
    [sourcePath],
    [sourcePath],
    mappings,
  );
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
