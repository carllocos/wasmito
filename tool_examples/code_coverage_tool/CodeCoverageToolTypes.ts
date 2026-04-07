export type CodeCoverageToolConfig = Readonly<{ timeoutMs: number }>;

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
    coveredFunctionCount: number;
    functionCount: number;
    ratio: number;
    coveredFunctions: { id: number; name: string }[];
  };
  branchCoverage: {
    sourceFiles: {
      name: string;
      coveredNodeCount: number;
      nodeCount: number;
      ratio: number;
    }[];
    totalCoveredNodeCount: number;
    totalNodeCount: number;
    ratio: number;
  };
  coveredSourceLocations: CodeCoverageToolSourceLocation[];
}>;

export type CodeCoverageToolExecutionTarget = 'LOCAL' | 'MCU';
