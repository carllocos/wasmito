import { APIRequest } from "../warduino/api/request_interface";
import { ObserverChannel } from "./observer_interface";
import { SerialConnection } from "./serial";

type FutureResolver<T> = (value: T | PromiseLike<T>) => void;
type FutureRejecotor = (reason?: any) => void;

export class SerialCommand<T> implements ObserverChannel {
    private connection: SerialConnection;
    private request: APIRequest<T>;
    private dataBuffered: string;
    private requestResolver: FutureResolver<T> | undefined;
    private requestRejector: FutureRejecotor | undefined;
    private lines: string[];

    constructor(connection: SerialConnection, request: APIRequest<T>) {
        this.connection = connection;
        this.dataBuffered = "";
        this.request = request;
        this.lines = [];
    }

    update(data: string): void {
        this.dataBuffered += data;
        this.parseLines();

        for (let index = 0; index < this.lines.length; index++) {
            const line = this.lines[index];
            try {
                if (this.requestResolver) {
                    this.requestResolver(this.request.parse(line));
                    return;
                }
            }
            catch (APIRequestInvalidParse) {
            }
        }
        this.lines = [];
    }

    execute(): Promise<T> {
        return new Promise((res, rej) => {
            this.requestResolver = res;
            this.requestRejector = rej;
            const d = this.request.getData() + "\n";
            this.connection.sendData(d);
        });
    }

    private parseLines(): void {
        let idx = this.dataBuffered.indexOf('\n');
        while (idx !== -1) {
            let line = this.dataBuffered.slice(0, idx);
            this.dataBuffered = this.dataBuffered.slice(idx + 1); // skip newline
            if (line.length > 0 && line.charAt(line.length - 1) === '\r') {
                line = line.slice(0, line.length - 1);
            }
            this.lines.push(line);
            idx = this.dataBuffered.indexOf('\n');
        };
    }
}