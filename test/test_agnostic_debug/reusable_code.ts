import assert from 'assert';
import { type SourceCFGs, type SourceCFGNode } from '../../src/cfg/source_cfg';
import { type SourceCodeLocation } from '../../src/source_mappers/source_map';

export function sourceNodeFromLoc(
  scfgs: SourceCFGs,
  loc: SourceCodeLocation,
): SourceCFGNode {
  const ns = scfgs.nodesFromSourceLoc(loc);
  assert(
    ns.length === 1,
    `one ASTnode should be found for the given location linenr=${loc.linenr}, colnr=${loc.colnr}`,
  );
  return ns[0];
}

export function sourceNodeLoc(sn: SourceCFGNode): SourceCodeLocation {
  return sn.sourceLocation;
}

export function sourceText(sn: SourceCFGNode): string {
  return sn.node?.node.text ?? '';
}

export function sortIncreasingNr(
  ns: Array<[SourceCFGNode, number]>,
): Array<[SourceCFGNode, number]> {
  return ns.sort(([n1], [n2]) => {
    const l1 = sourceNodeLoc(n1);
    const l2 = sourceNodeLoc(n2);
    if (l1.linenr !== l2.linenr) {
      return l1.linenr - l2.linenr;
    } else {
      return l1.colnr - l2.colnr;
    }
  });
}

export function logNode(n: SourceCFGNode): void {
  const sp = n.sourceLocation;
  if (n.node !== undefined) {
    const ep = n.node.endPosition;
    console.log(
      `{startLoc: (${sp.linenr}, ${sp.colnr}), endLoc: (${ep.linenr}, ${ep.colnr}), srcTxt: '${n.node.node.text}'}`,
    );
  } else {
    console.log(`{startLoc: (${sp.linenr}, ${sp.colnr})}`);
  }
}
