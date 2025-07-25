import {
  type Node,
  type Point,
  Tree as TreeSitter,
  Language as TreeSitterLang,
  Parser as TreeSitterParser,
} from 'web-tree-sitter';

export type TreeNode = Node;
export type TreeParser = TreeSitterParser;
export type TreePoint = Point;
export type Tree = TreeSitter;
export const Parser = TreeSitterParser;
const Language = TreeSitterLang;

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
    await TreeSitterParser.init();
    parserInitiallised = true;
  }
}

export async function createLanguageParser(
  languageWasmParser: string,
): Promise<TreeParser> {
  await initParser();
  const parser = new TreeSitterParser();
  const lang = await Language.load(languageWasmParser);
  parser.setLanguage(lang);
  return parser;
}

export function printNodeInfo(
  node: TreeNode,
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
  node: TreeNode,
  row: number,
  col: number,
): TreeNode | undefined {
  // printNodeInfo(node);
  if (node.startPosition.row === row) {
    if (node.startPosition.column === col) {
      return node;
    }
  }

  // const nodes: TreeNode[] = [];
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
  tree: Tree,
  pos: NodePosition,
): TreeNode | undefined {
  return searchNodeHelper(tree.rootNode, pos.row, pos.col);
}

export function mostSpecialisedNode(
  tree: Tree,
  pos: NodePosition,
): TreeNode | undefined {
  return mostSpecialisedNodeHelper(tree.rootNode, pos);
}

function mostSpecialisedNodeHelper(
  node: TreeNode,
  pos: NodePosition,
): TreeNode | undefined {
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

function isPositionOnSameNodeLine(node: TreeNode, pos: NodePosition): boolean {
  return (
    node.startPosition.row === pos.row &&
    node.startPosition.column <= pos.col &&
    node.endPosition.row === pos.row &&
    pos.col < node.endPosition.column
  );
}

function isPositionOnNodeSpan(node: TreeNode, pos: NodePosition): boolean {
  return node.startPosition.row <= pos.row && pos.row <= node.endPosition.row;
}

export function isNode(n: TreeNode | null): n is TreeNode {
  return n !== null;
}

export function firstLeafChild(n: TreeNode): TreeNode {
  if (isNode(n.firstChild)) {
    return firstLeafChild(n.firstChild);
  }
  // n has no childref so is leaf
  return n;
}

// const grammarTypesToSkip = new Set<string>([';', ')']);

function findLeaf(node: TreeNode): TreeNode {
  if (node.childCount > 0) {
    if (node.firstChild === null) {
      throw new Error(`FirstChild should not be null when childCount > 0`);
    }
    return findLeaf(node.firstChild);
  }
  return node;
}

// node is the one where the pc is currently at
export function nextNodeHelper(node: TreeNode): TreeNode | undefined {
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
//   node: TreeNode,
// ): TreeNode | undefined {
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

export function stepInto(node: TreeNode): TreeNode[] {
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

export function stepOverNode(node: TreeNode): TreeNode[] {
  const n = nextSiblingOrParentNextSibling(node);
  if (n === undefined) {
    return [];
  }
  return [n];
}

function nextSiblingOrParentNextSibling(node: TreeNode): TreeNode | undefined {
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

function isControlFlowNode(node: TreeNode): boolean {
  switch (node.grammarType) {
    case GrammarType.WhileStatement:
      return true;
    default:
      return false;
  }
}

function getDestinationNodes(
  node: TreeNode,
  alreadyVisited: TreeNode,
): TreeNode[] {
  switch (node.grammarType) {
    case GrammarType.WhileStatement: {
      const dest: TreeNode[] = [];
      for (const n of node.children) {
        if (n !== null && n.id !== alreadyVisited.id) dest.push(n);
      }
      if (node.nextSibling !== null) {
        dest.push(node.nextSibling);
      }
      return dest.map((n) => getInnerNode(n));
    }
  }
  return [];
}

function getInnerNode(node: TreeNode): TreeNode {
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
