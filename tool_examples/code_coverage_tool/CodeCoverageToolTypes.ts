export type CodeCoverageToolConfig = Readonly<{ timeoutMs: number }>;

export type CodeCoverageToolSourceLocation = Readonly<{
  sourceFile: string;
  lineNr: number;
  colNr: number;
}>;

export type CodeCoverageToolResult = Readonly<{
  coveredNodes: number;
  totalNodes: number;
  branchCoverage: number;
  functionCoverage: number;
  coveredFunctions: number[];
  coveredSourceCodeLocations: CodeCoverageToolSourceLocation[];
}>;

export type CodeCoverageToolExecutionTarget = 'LOCAL' | 'MCU';
