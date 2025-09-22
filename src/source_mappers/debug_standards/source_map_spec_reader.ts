import fs from 'fs';
import { mappingItemToSourceCodeLocation, SourceMapJSON } from '../source_map';
import { MappingItem, SourceMapConsumer } from 'source-map';
import { createLogger } from '../../logger/logger';

// export async function SourceMapFromSourceMapSpec(
//   pathToSourceMap: string,
//   wasmPath: string,
//   config?: SourceMapConfig,
// ): Promise<SourceMap> {
//   const m = await ReadSourceSpec(pathToSourceMap, wasmPath, config);
//   const sm = new SourceMap(m.wasm, m.sources, m.mappings, config);
//   return sm;
// }

const logger = createLogger('SourceMapSpecReader');

export async function ReadSourceSpec(
  pathToSourceSpec: string,
  wasmPath: string,
): Promise<SourceMapJSON> {
  const content = await fs.promises.readFile(pathToSourceSpec);
  const sourceMapStr = JSON.parse(content.toString());
  const [sources, mappings] = await SourceMapConsumer.with(
    sourceMapStr,
    null,
    (consumer) => {
      const mps: MappingItem[] = [];
      consumer.eachMapping((mapping: MappingItem) => {
        mps.push(mapping);
      });
      return [consumer.sources, mps];
    },
  );

  const sourceLocs = mappings
    .filter((m: MappingItem) => {
      const hasOriginalLine =
        m.originalLine !== undefined && m.originalLine !== null;
      const hasOriginalColumnNr =
        m.originalColumn !== undefined && m.originalColumn !== null;
      return hasOriginalLine && hasOriginalColumnNr;
    })
    .map(mappingItemToSourceCodeLocation);

  if (sourceLocs.length !== mappings.length) {
    logger.debug(
      `We removed ${mappings.length - sourceLocs.length} entries from the sourcemap as it has no originalLineNr nor originalColumnNr`,
    );
  }

  return {
    wasm: wasmPath,
    sources: sources,
    mappings: sourceLocs,
  };
}
