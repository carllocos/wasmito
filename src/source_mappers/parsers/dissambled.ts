import * as fs from 'fs';
import { WasmInstruction } from '../../webassembly/wasm/wasm_instruction';
import {
  WasmOpcodeHasImmediate,
  wasmOpcodeFromNr,
} from '../../webassembly/wasm/wasm_opcode';

export interface ParsedInstruction {
  address: number;
  instruction: WasmInstruction;
}

export interface ParsedFunctionBody {
  funName: string;
  instructions: ParsedInstruction[];
}

/*
 * Parser for output generated from `wasm-objdump -d` command
 */

export function parseInstructionsFromDissambledOutput(
  input: string,
): Map<number, ParsedFunctionBody> | undefined {
  const lines = input.split('\n');
  const opcodes = new Map<number, ParsedFunctionBody>();
  let funcOpcodes: ParsedInstruction[] = [];
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
    const parsedOpcodeLabels =
      splits.length > 1 ? splits.splice(1, splits.length) : [];

    let immediate: number | undefined;
    let opcodeLabels: string[] | undefined;
    if (WasmOpcodeHasImmediate(wasmOpcode)) {
      const parsedImmediate = parseInt(parsedOpcodeLabels[0]);
      if (isNaN(parsedImmediate)) {
        return undefined;
      }
      immediate = parsedImmediate;
      opcodeLabels = parsedOpcodeLabels.slice(1, parsedOpcodeLabels.length);
    }

    if (keyword === 'end') {
      const op = opcodesWaitingForEnd[opcodesWaitingForEnd.length - 1];
      parsedOpcodeLabels.unshift(`${keyword}_${op}`);
    }
    const instruction = new WasmInstruction(
      opcodeName,
      opcodeNr,
      immediate,
      opcodeLabels,
    );

    funcOpcodes.push({
      address,
      instruction,
    });

    if (keyword === 'end') {
      const op = opcodesWaitingForEnd.pop() as string;
      const regexPattern = /func\[(\d+)\](?:_<([^>]*)>)?/;
      const match = op.match(regexPattern);
      if (match !== undefined && match !== null) {
        const funcId = parseInt(match[1]); // Contains the number in square brackets
        if (isNaN(funcId)) {
          throw new Error(`Failed to parse funct ID from ${op}`);
        }
        let funcName = match[2];
        if (funcName === '' || funcName === undefined) {
          funcName = `func_${funcId}`;
        }

        opcodes.set(funcId, { funName: funcName, instructions: funcOpcodes });
        inFunction = false;
        funcOpcodes = [];
      }
    }
  }
  return opcodes;
}

export async function parseInstructionsFromFile(
  filepath: string,
): Promise<Map<number, ParsedFunctionBody> | undefined> {
  return await new Promise((resolve) => {
    fs.readFile(filepath, 'utf8', (err, data) => {
      if (data === '' && (err !== undefined || err !== null)) {
        console.error(`Error reading the file`);
        resolve(undefined);
      } else {
        resolve(parseInstructionsFromDissambledOutput(data));
      }
    });
  });
}
