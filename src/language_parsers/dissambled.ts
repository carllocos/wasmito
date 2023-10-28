import * as fs from 'fs';

/*
 * Parser for output generated from `wasm-objdump -d` command
 */

export function parseDissambledFunction(input: string):
  | Map<
      string,
      Array<{
        address: number;
        opcodeNr: number;
        opcodeLabels: string[];
        opcodeName: string;
      }>
    >
  | undefined {
  const lines = input.split('\n');
  const result = new Map<
    string,
    Array<{
      address: number;
      opcodeNr: number;
      opcodeName: string;
      opcodeLabels: string[];
    }>
  >();
  let funcOpcodes: Array<{
    address: number;
    opcodeNr: number;
    opcodeName: string;
    opcodeLabels: string[];
  }> = [];
  const opcodesThatNeedEnd: string[] = ['loop', 'block', 'if'];
  const opcodesWaitingForEnd: string[] = [];

  let inFunction = false;

  for (const line of lines) {
    // Remove leading and trailing whitespace
    const trimmedLine = line.trim();

    // Check if the line is empty or does not contain a colon
    if (trimmedLine === '') {
      continue;
    }

    if (trimmedLine.includes('func[')) {
      const regex =
        /(\b[0-9a-fA-F]+\b)(?: \[([^\]]*)\])?(?: (.+?))?(\r?\n[0-9a-fA-F]+\s+func\[[0-9]+\]\s+<main>:|$)/g;
      let match;
      while ((match = regex.exec(trimmedLine)) !== null) {
        const address = parseInt(match[1], 16);
        if (isNaN(address)) {
          continue;
        }
        let optionalContent = match[2] ?? '';
        if (optionalContent.endsWith(':')) {
          optionalContent = optionalContent.slice(
            0,
            optionalContent.length - 1,
          );
        }
        let mainContent = match[3] ?? '';
        if (mainContent.endsWith(':')) {
          mainContent = mainContent.slice(0, mainContent.length - 1);
        }
        let funcName = mainContent.split(' ').join('_');
        if (optionalContent !== '') {
          funcName = funcName + '_' + optionalContent;
        }
        opcodesWaitingForEnd.push(funcName);
      }

      inFunction = true;
      continue;
    }

    if (!inFunction) {
      continue;
    }

    // Split the line by colon
    const parts = trimmedLine.split(':');

    // Extract the hex address before the colon
    const address = parseInt(parts[0].trim(), 16);
    if (isNaN(address)) {
      continue;
    }

    // Split the second part by vertical bar
    const secondPart = parts[1].trim();
    const keywordParts = secondPart.split('|');
    const opcodeNr = parseInt(keywordParts[0].trim().split(' ')[0], 16);
    if (isNaN(opcodeNr)) {
      return undefined;
    }

    // Extract the first keyword after the vertical bar
    let keyword = keywordParts[1].trim();
    if (
      opcodesThatNeedEnd.find((op) => {
        return op === keyword;
      }) !== undefined
    ) {
      opcodesWaitingForEnd.push(keyword);
    } else if (keyword === 'end') {
      const op = opcodesWaitingForEnd.pop() as string;
      keyword = `${op}_${keyword}`;
      if (op.includes('func[')) {
        inFunction = false;
        funcOpcodes.push({
          address,
          opcodeName: keyword,
          opcodeLabels: [],
          opcodeNr,
        });
        result.set(op, funcOpcodes);
        funcOpcodes = [];
        continue;
      }
    }

    const splits = keyword.split(' ');
    const opcodeName = splits.length > 1 ? splits[0] : keyword;
    const opcodeLabels =
      splits.length > 1 ? splits.splice(1, splits.length) : [];

    funcOpcodes.push({
      address,
      opcodeNr,
      opcodeName,
      opcodeLabels,
    });
  }

  return result;
}

export async function readDissambledOpcodes(filepath: string): Promise<
  | Map<
      string,
      Array<{
        address: number;
        opcodeName: string;
        opcodeLabels: string[];
        opcodeNr: number;
      }>
    >
  | undefined
> {
  return await new Promise((resolve) => {
    fs.readFile(filepath, 'utf8', (err, data) => {
      if (data === '' && (err !== undefined || err !== null)) {
        console.error(`Error reading the file`);
        resolve(undefined);
      } else {
        resolve(parseDissambledFunction(data));
      }
    });
  });
}
