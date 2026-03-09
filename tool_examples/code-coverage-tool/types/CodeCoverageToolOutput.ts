export type CodeCoverageToolResult = Readonly<{
  visitedNodes: number;
  totalNodes: number;
  branchCoverage: number;
}>;
