import { APIRequest, APIRequestInvalidParse, Instruction } from "./request_interface";

export class RunRequest implements APIRequest<string> {
    getData() {
        return `${Instruction.Run}`;
    }
    parse(data: string): string {
        if (data === 'GO') {
            return data;
        }
        throw new APIRequestInvalidParse(`No ack for Run`);
    }
}