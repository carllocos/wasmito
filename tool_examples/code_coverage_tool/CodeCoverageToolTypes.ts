export type CodeCoverageToolConfig = Readonly<{
  maxAnalysisTimeMs: number;
  includeCoveredSourceCodeLocations: boolean;
}>;

export type CodeCoverageToolSourceCodeLocation = Readonly<{
  sourceFile: string;
  lineNr: number;
  colNr: number;
}>;

export type CodeCoverageToolResult = Readonly<{
  coveredNodes: number;
  totalNodes: number;
  branchCoverage: number;
  coveredSourceCodeLocations?: CodeCoverageToolSourceCodeLocation[];
}>;
