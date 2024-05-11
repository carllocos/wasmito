// TODO merge WATSourcemap into concrete sourcemap
import { type LineInfoPairs } from '../../webassembly/parsers/obj-dump_parser';
import {
  type SourceCodeMapping,
  OldSourceMap,
  type SourceCodeLocation,
} from '../old_source_map';
import { type WASMFunction } from '../../webassembly/wasm/wasm_function';

// TODO Move to LangaugeAdaptor which will consist of
// 1. SourceMap Or Dwarf
// 2. AST or something in the kind
// 3. Mapper to VM apps
export class WATSourceMap extends OldSourceMap {
  public nextSourceCodeLocation(
    source: string,
    currentLineNr: number,
    currentColumnStart: number,
  ): SourceCodeMapping[] {
    throw new Error('Method not implemented.');
  }

  private readonly lineNrToInfo: Map<number, SourceCodeMapping[]>;
  private readonly _sourceCodePath: string;
  private readonly _mappings: SourceCodeMapping[];
  constructor(lines: LineInfoPairs[], sourcePath: string, wasmPath: string) {
    super([sourcePath], wasmPath);
    this.lineNrToInfo = this.createWAT2WASMMappings(lines);
    this._sourceCodePath = sourcePath;
    this._mappings = this.createArrayFromMappings(this.lineNrToInfo);
  }

  public generatedPositionFor(
    location: SourceCodeLocation,
  ): SourceCodeMapping[] {
    const lines = this.lineNrToInfo.get(location.linenr);
    if (lines === undefined) {
      return [];
    }

    const columnStart = location.columnStart;
    const columnEnd = location.columnEnd;
    if (columnStart === undefined && columnEnd !== undefined) {
      throw new Error('StartColumn expected');
    }
    return lines.filter((l) => {
      return columnStart === undefined || l.columnStart <= columnStart;
    });
  }

  getOriginalPositionFor(wasmAddr: number): SourceCodeMapping | undefined {
    return this._mappings.find((m: SourceCodeMapping) => {
      return m.address === wasmAddr;
    });
  }

  public getFunction(id: number): WASMFunction | undefined {
    if (id >= this.wasm.imports.length) {
      return this.wasm.functions.find((f) => {
        return f.id === id;
      });
    } else {
      return this.wasm.imports.find((f) => {
        return f.id === id;
      });
    }
  }

  private createWAT2WASMMappings(
    infoLines: LineInfoPairs[],
  ): Map<number, SourceCodeMapping[]> {
    const map = new Map<number, SourceCodeMapping[]>();
    for (let i = 0; i < infoLines.length; i++) {
      if (map.has(infoLines[i].lineInfo.line)) {
        continue;
      }

      const lines: LineInfoPairs[] = infoLines.filter(
        (l) => l.lineInfo.line === infoLines[i].lineInfo.line,
      );

      const mappings: SourceCodeMapping[] = [];
      for (let j = 0; j < lines.length; j++) {
        const l = lines[j];
        const inst = this.wasm.instructionFromAddress(l.lineAddress);
        if (inst !== undefined) {
          mappings.push({
            source: this._sourceCodePath,
            address: l.lineAddress,
            linenr: l.lineInfo.line,
            columnStart: l.lineInfo.columnStart,
            columnEnd: l.lineInfo.columnEnd,
            instruction: inst,
          });
        }
      }

      map.set(infoLines[i].lineInfo.line, mappings);
    }
    return map;
  }

  private createArrayFromMappings(
    mappings: Map<number, SourceCodeMapping[]>,
  ): SourceCodeMapping[] {
    return Array.from(mappings.values())
      .flat()
      .sort((a, b) => {
        return a.columnStart - b.columnStart;
      });
  }
}
