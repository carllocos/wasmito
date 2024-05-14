import { type SourceMap } from '../source_mappers/source_map';

export class LanguageAdaptor {
  public readonly sourceMap: SourceMap;
  constructor(sourceMap: SourceMap) {
    this.sourceMap = sourceMap;
  }
}
