import Parser from 'web-tree-sitter';

export interface NodePosition {
  row: number;
  col: number;
}

export function sourceLocationToNodePosition(
  linenr: number,
  colnr: number,
): NodePosition {
  return {
    row: linenr - 1,
    col: colnr - 1,
  };
}

export function nodePositionToSourceLocation(
  row: number,
  col: number,
): [number, number] {
  return [row + 1, col + 1];
}

let parserInitiallised: boolean = false;
export async function initParser(): Promise<void> {
  if (!parserInitiallised) {
    await Parser.Parser.init();
    parserInitiallised = true;
  }
}

export async function createLanguageParser(
  languageWasmParser: string,
): Promise<Parser.Parser> {
  await initParser();
  const parser = new Parser.Parser();
  const lang = await Parser.Language.load(languageWasmParser);
  parser.setLanguage(lang);
  return parser;
}

export function printNodeInfo(
  node: Parser.Node,
  title: string = 'NodeInfo',
): void {
  console.log(title);
  console.log(`\tGrammarID=${node.grammarId}`);
  console.log(`\ttype=${node.type}`);
  console.log(`\ttypeId=${node.typeId}`);
  console.log(
    `\tStartPos=(row=${node.startPosition.row},col=${node.startPosition.column})`,
  );
  console.log(
    `\tEndPos=(row=${node.endPosition.row},col=${node.endPosition.column})`,
  );
  console.log(`\tChildrenCount=${node.childCount}`);
  console.log(`\tText=${node.text.substring(0, 30)}`); // prints the sourceCodeText
}

function searchNodeHelper(
  node: Parser.Node,
  row: number,
  col: number,
): Parser.Node | undefined {
  // printNodeInfo(node);
  if (node.startPosition.row === row) {
    if (node.startPosition.column === col) {
      return node;
    }
  }

  // const nodes: Parser.Node[] = [];
  for (const child of node.children) {
    if (child === null) {
      continue;
    }
    const found = searchNodeHelper(child, row, col);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

export function searchNode(
  tree: Parser.Tree,
  pos: NodePosition,
): Parser.Node | undefined {
  return searchNodeHelper(tree.rootNode, pos.row, pos.col);
}

export function mostSpecialisedNode(
  tree: Parser.Tree,
  pos: NodePosition,
): Parser.Node | undefined {
  return mostSpecialisedNodeHelper(tree.rootNode, pos);
}

function mostSpecialisedNodeHelper(
  node: Parser.Node,
  pos: NodePosition,
): Parser.Node | undefined {
  for (const child of node.children) {
    if (child === null) {
      continue;
    }
    if (isPositionOnNodeSpan(child, pos)) {
      const nodeFoud = mostSpecialisedNodeHelper(child, pos);
      if (nodeFoud !== undefined) {
        return nodeFoud;
      }
    }
  }
  if (isPositionOnSameNodeLine(node, pos)) {
    return node;
  } else {
    return undefined;
  }
}

function isPositionOnSameNodeLine(
  node: Parser.Node,
  pos: NodePosition,
): boolean {
  return (
    node.startPosition.row === pos.row &&
    node.startPosition.column <= pos.col &&
    node.endPosition.row === pos.row &&
    pos.col < node.endPosition.column
  );
}

function isPositionOnNodeSpan(
  node: Parser.Node,
  pos: NodePosition,
): boolean {
  return node.startPosition.row <= pos.row && pos.row <= node.endPosition.row;
}

export function isNode(n: Parser.Node | null): n is Parser.Node {
  return n !== null;
}

export function firstLeafChild(n: Parser.Node): Parser.Node {
  if (isNode(n.firstChild)) {
    return firstLeafChild(n.firstChild);
  }
  // n has no childref so is leaf
  return n;
}

// const grammarTypesToSkip = new Set<string>([';', ')']);

function findLeaf(node: Parser.Node): Parser.Node {
  if (node.childCount > 0) {
    if (node.firstChild === null) {
      throw new Error(`FirstChild should not be null when childCount > 0`);
    }
    return findLeaf(node.firstChild);
  }
  return node;
}

// node is the one where the pc is currently at
export function nextNodeHelper(
  node: Parser.Node,
): Parser.Node | undefined {
  // first retrieve children
  if (node.childCount > 0) {
    return findLeaf(node);
  }

  // return sibling
  const next = node.nextSibling;
  if (next !== undefined && next !== null) {
    // printNodeInfo(next, 'Next Sibling');
    // console.log(`Skipping node of grammarType '${next.grammarType}'`);
    // next = next.nextSibling;
    return next;
  }

  if (next === undefined || next === null) {
    console.log(`No Sibling`);
  }

  // TODO figure out when to explore the children and when the parent's sibling
  const p = node.parent;
  if (p !== undefined && p !== null) {
    // printNodeInfo(p, 'Searching through Parent Node:');
    return nextNodeHelper(p);
  }
  return undefined;

  // let firstChild = false;
  // while (isSyntaxNode(p)) {
  //   let s = firstChild ? p.firstChild : p.nextSibling;
  //   while (s !== undefined && s !== null) {
  //     if (s.grammarType !== ';') {
  //       return s;
  //     }
  //     s = s.nextSibling;
  //   }
  //   if (s === null || s === undefined) {
  //     p = p.parent;
  //     firstChild = true;
  //   }
  // }

  // return undefined;
}

// export function stepOverNode(
//   node: Parser.Node,
// ): Parser.Node | undefined {
//   // TODO use onyle named nodes?
//   printNodeInfo(node, 'Searching Next Node for');
//   switch (node.grammarType) {
//     case GrammarType.ExpressionStatement:
//       if (node.nextSibling === null) {
//         return undefined;
//       }
//       return node.nextSibling;
//     case GrammarType.WhileStatement:
//       if (node.childCount !== 3) {
//         throw new Error(
//           `${GrammarType.WhileStatement} is supposed to have 3 children`,
//         );
//       }
//       return node.children[1]; // gives the guard expression

//     case GrammarType.StatementBlock:
//       if (node.childCount === 0) {
//         return nextSiblingOrParentNextSibling(node);
//       }
//       if (node.firstChild === null) {
//         // case should not occur
//         throw new Error(`${node.grammarType} firstChild should not be null`);
//       }
//       return node.firstChild;
//     case GrammarType.True:
//     case GrammarType.RightParenthesis:
//     case GrammarType.LeftCurlyBrace:
//     case GrammarType.Comment:
//       return nextSiblingOrParentNextSibling(node);
//     default:
//       console.log(node.fieldNameForChild(0));
//       console.log(node.fieldNameForChild(1));
//       console.log(node.fieldNameForChild(2));
//       throw new Error(`no stepOverNode impl. for ${node.grammarType}`);
//   }
//   // if (node.nextSibling === null && node.parent !== null) {
//   //   return stepOverNode(node.parent);
//   // }
//   // return undefined;
// }

export function stepInto(node: Parser.Node): Parser.Node[] {
  if (node.nextSibling !== null) {
    return [node.nextSibling];
  }

  let p = node.parent;
  while (p !== null) {
    if (p.parent !== null && isControlFlowNode(p.parent)) {
      return getDestinationNodes(p.parent, p);
    } else if (p.nextSibling !== null) {
      return [p.nextSibling];
    }
    p = p.parent;
  }
  return [];
}

export function stepOverNode(node: Parser.Node): Parser.Node[] {
  const n = nextSiblingOrParentNextSibling(node);
  if (n === undefined) {
    return [];
  }
  return [n];
}

function nextSiblingOrParentNextSibling(
  node: Parser.Node,
): Parser.Node | undefined {
  if (node.nextSibling !== null) {
    return node.nextSibling;
  }

  let p = node.parent;
  while (p !== null) {
    if (p.nextSibling !== null) {
      return p.nextSibling;
    }
    p = p.parent;
  }
  return undefined;
}

function isControlFlowNode(node: Parser.Node): boolean {
  switch (node.grammarType) {
    case GrammarType.WhileStatement:
      return true;
    default:
      return false;
  }
}

function getDestinationNodes(
  node: Parser.Node,
  alreadyVisited: Parser.Node,
): Parser.Node[] {
  switch (node.grammarType) {
    case GrammarType.WhileStatement: {
      const dest = node.children.filter((n) => n !== null && n.id !== alreadyVisited.id) as Parser.Node[];
      if (node.nextSibling !== null) {
        dest.push(node.nextSibling);
      }
      return dest.map((n) => getInnerNode(n));
    }
  }
  return [];
}

function getInnerNode(node: Parser.Node): Parser.Node {
  switch (node.grammarType) {
    case GrammarType.StatementBlock:
      if (node.firstChild === null) {
        throw new Error('StatementBlockShould have a child');
      }
      return node.firstChild;
    default:
      // if (node.childCount === 0) {
      return node;
    // }
    // throw new Error(`TODO getInnerNode for ${node.grammarType}`);
  }
}

enum GrammarType {
  ExpressionStatement = 'expression_statement',
  WhileStatement = 'while_statement',
  True = 'true',
  RightParenthesis = ')',
  StatementBlock = 'statement_block',
  LeftCurlyBrace = '{',
  Comment = 'comment',
}
