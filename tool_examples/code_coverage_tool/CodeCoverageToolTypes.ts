export type CodeCoverageToolConfig = Readonly<{
  implementation: 'instruction' | 'node';
  timeoutMs: number;
}>;

export type CodeCoverageToolSourceLocation = Readonly<{
  sourceFile: string;
  lineNr: number;
  colNr: number;
}>;

export type CodeCoverageToolResult = Readonly<{
  lineCoverage: {
    sourceFiles: {
      name: string;
      coveredLineNumberCount: number;
      lineNumberCount: number;
      ratio: number;
      coveredLines: number[];
    }[];
    totalCoveredLineNumberCount: number;
    totalLineNumberCount: number;
    ratio: number;
  };
  functionCoverage: {
    sourceFiles: {
      name: string;
      coveredFunctionCount: number;
      functionCount: number;
      ratio: number;
      coveredFunctions: { id: number; name: string }[];
    }[];
    totalCoveredFunctionCount: number;
    totalFunctionCount: number;
    ratio: number;
  };
  basicBlockCoverage: {
    sourceFiles: {
      name: string;
      coveredBasicBlockCount: number;
      basicBlockCount: number;
      ratio: number;
    }[];
    totalCoveredBasicBlockCount: number;
    totalBasicBlockCount: number;
    ratio: number;
  };
  coveredSourceLocations: CodeCoverageToolSourceLocation[];
  heapBytesUsed: number;
}>;

export type CodeCoverageToolExecutionTarget = 'LOCAL' | 'MCU';
