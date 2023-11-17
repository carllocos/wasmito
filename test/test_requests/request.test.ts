import { expect } from 'chai';
import { InspectStack } from '../../src/warduino/requests/inspect_request';
import { type WasmStack } from '../../src/state/wasm_stack';

describe('Inspect Request Test Suite', () => {
  it('InspectStack throws exception for invalid line', () => {
    const inspect = new InspectStack();
    const doParse: () => WasmStack = () => inspect.parse('invalid content');
    expect(doParse).to.throw('No response for inspect stack');
  });
});
