import * as fs from 'fs';
import { WasmOpcodeHasImmediate, wasmOpcodeFromNr } from './opcodes';

export interface ParsedOpcode {
  address: number;
  opcodeName: string;
  opcodeNr: number;
  immediate?: number;
  opcodeLabels: string[];
}

/*
 * Parser for output generated from `wasm-objdump -d` command
 */

export function parseOpcodesFromDissambledOutput(
  input: string,
): Map<string, ParsedOpcode[]> | undefined {
  const lines = input.split('\n');
  const result = new Map<string, ParsedOpcode[]>();
  let funcOpcodes: ParsedOpcode[] = [];
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

    const wasmOpcode = wasmOpcodeFromNr(opcodeNr);
    if (wasmOpcode === undefined) {
      // invalid opcodeNr
      return undefined;
    }

    // Extract the first keyword after the vertical bar
    const keyword = keywordParts[1].trim();
    if (
      opcodesThatNeedEnd.find((op) => {
        return op === keyword;
      }) !== undefined
    ) {
      opcodesWaitingForEnd.push(keyword);
    }

    const splits = keyword.split(' ');
    const opcodeName = splits.length > 1 ? splits[0] : keyword;
    const opcodeLabels =
      splits.length > 1 ? splits.splice(1, splits.length) : [];

    const parsedOpcode: ParsedOpcode = {
      address,
      opcodeNr,
      opcodeName,
      opcodeLabels,
    };

    if (WasmOpcodeHasImmediate(wasmOpcode)) {
      const immediate = parseInt(opcodeLabels[0]);
      if (isNaN(immediate)) {
        return undefined;
      }
      parsedOpcode.immediate = immediate;
      parsedOpcode.opcodeLabels = opcodeLabels.slice(1, opcodeLabels.length);
    }

    if (keyword === 'end') {
      const op = opcodesWaitingForEnd[opcodesWaitingForEnd.length - 1];
      opcodeLabels.unshift(`${keyword}_${op}`);
    }

    funcOpcodes.push(parsedOpcode);

    if (keyword === 'end') {
      const op = opcodesWaitingForEnd.pop() as string;
      if (op.includes('func[')) {
        inFunction = false;
        result.set(op, funcOpcodes);
        funcOpcodes = [];
      }
    }
  }

  return result;
}

export async function parseOpcodes(
  filepath: string,
): Promise<Map<string, ParsedOpcode[]> | undefined> {
  return await new Promise((resolve) => {
    fs.readFile(filepath, 'utf8', (err, data) => {
      if (data === '' && (err !== undefined || err !== null)) {
        console.error(`Error reading the file`);
        resolve(undefined);
      } else {
        resolve(parseOpcodesFromDissambledOutput(data));
      }
    });
  });
}
