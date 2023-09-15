import { expect } from 'chai';
import { InspectStack } from '../../src/warduino/api/inspect_request';

describe('Inspect Request Test Suite', () => {
    it('InspectStack throws exception for invalid line', () => {
        const inspect = new InspectStack();
        const doParse = () => inspect.parse("invalid content");
        expect(doParse).to.throw('No response for inspect stack');
    });
});