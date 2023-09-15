import { APIRequest } from "../warduino/api/request_interface";
import { SerialConnection as Channel } from "./serial";

type FutureResolver<T> = (value: T | PromiseLike<T>) => void;
type FutureRejecotor = (reason?: any) => void;

export class SerialCommand<T> {
    private connection: Channel;
    private request: APIRequest<T>;
    private requestResolver: FutureResolver<T> | undefined;
    private requestRejector: FutureRejecotor | undefined;

    constructor(connection: Channel, request: APIRequest<T>) {
        this.connection = connection;
        this.request = request;
    }

    update(data: string): void {
        try {
            if (this.requestResolver) {
                this.requestResolver(this.request.parse(data));
                return;
            }
        }
        catch (APIRequestInvalidParse) {
        }
        finally {
            this.connection.removeOnData(this.update);
        }
    }

    execute(): Promise<T> {
        return new Promise((res, rej) => {
            this.requestResolver = res;
            this.requestRejector = rej;
            const d = this.request.getData() + "\n";
            this.connection.send(d);
            this.connection.addOnData(this.update);
        });
    }
}