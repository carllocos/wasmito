export type CodeCoverageToolConfig = Readonly<{ timeoutMs: number }>;

export type CodeCoverageToolSourceLocation = Readonly<{
  sourceFile: string;
  lineNr: number;
  colNr: number;
}>;

export type CodeCoverageToolResult = Readonly<{
  lineCoverage: {
    coveredLineNumberCount: number;
    lineNumberCount: number;
    ratio: number;
  };
  functionCoverage: {
    coveredFunctionCount: number;
    functionCount: number;
    ratio: number;
    coveredFunctions: { id: number; name: string }[];
  };
  branchCoverage: {
    coveredNodeCount: number;
    nodeCount: number;
    ratio: number;
  };
  coveredSourceLocations: CodeCoverageToolSourceLocation[];
}>;

export type CodeCoverageToolExecutionTarget = 'LOCAL' | 'MCU';
