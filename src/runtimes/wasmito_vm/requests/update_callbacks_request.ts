import { type WASM } from '../../../webassembly';
import {
  encodeJSONToHexString,
  encodeStringToHex,
  encodeToHexLEB128,
} from '../../../util/encoder';
import { Instruction } from './instructions';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../../request_interface';

export class UpdateCallbackMappingRequest extends APIRequestNoSubscription<boolean> {
  private readonly mappings: WASM.CallbackMapping[];

  constructor(mappings: WASM.CallbackMapping[]) {
    super();
    this.mappings = mappings;
  }

  description(): string {
    return `UpdateCallbackMappingRequest`;
  }

  private getJSONEncoding(mappings: WASM.CallbackMapping[]): string {
    // interrupt nr | {'callbacks':[{"callbackID": [nr1, nr2, nr3]}, ...]}
    let jsonStr = `{"callbacks":[`;
    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      jsonStr += `{"${mapping.callbackid}":[${mapping.tableIndexes.join(
        ',',
      )}]}`;
      if (i + 1 < mappings.length) {
        jsonStr += ',';
      }
    }
    jsonStr += ']}';
    const mappingsHex = encodeJSONToHexString(jsonStr);

    return `${Instruction.UpdateCallbackmapping}${mappingsHex}\n`;
  }

  private getHexStringEncoding(mappings: WASM.CallbackMapping[]): string {
    const numberOfMappingsHex = encodeToHexLEB128(mappings.length);
    // uint32_t numberOfMappings = read_LEB_32(&encoding);

    let mappingsHex = `${numberOfMappingsHex}`;
    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      const idSizeAsHex = encodeToHexLEB128(mapping.callbackid.length);
      const idAsHex = encodeStringToHex(mapping.callbackid);
      if (mapping.tableIndexes.length === 0) {
        throw new Error('a Mapping ID should have at least one callback ID');
      }
      const numberOfCallbacksHex = encodeToHexLEB128(
        mapping.tableIndexes.length,
      );
      const callbacksHex = mapping.tableIndexes
        .map((tid) => encodeToHexLEB128(tid))
        .join('');
      const mappingAsHex = `${idSizeAsHex}${idAsHex}${numberOfCallbacksHex}${callbacksHex}`;
      mappingsHex += mappingAsHex;
    }
    return `${Instruction.UpdateCallbackmapping}${mappingsHex}\n`;
  }

  getData(): string {
    return this.getHexStringEncoding(this.mappings);
  }

  parse(input: string): boolean {
    if (input === 'mappings updated!') {
      return true;
    }

    throw new APIRequestInvalidParse('No ack for update callback mappings');
  }
}
