import { type SourceCodeLocation } from '../source_mappers/source_map';

export class Breakpoint {
  public readonly location: SourceCodeLocation;
  constructor(sourceCodeLocation: SourceCodeLocation) {
    this.location = sourceCodeLocation;
  }
}
