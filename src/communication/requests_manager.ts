import { type APIRequest } from '../runtimes/request_interface';
import { type Channel } from './channel_interface';
import { RequestID } from './id_generator';
import { createRequestMessage } from '../runtimes/request_msg';

export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandError';
    Error.captureStackTrace(this, CommandError);
  }
}

export class RequestsManager {
  private connection?: Channel;
  private requests: Map<RequestID, APIRequest<any>>;

  private _resolveBulk: any;
  private _rejectBulk: any;
  private _waitingForAcksBulk: Set<number> = new Set();

  constructor() {
    this.requests = new Map<RequestID, APIRequest<any>>();
  }

  async onRequestData(data: string): Promise<void> {
    const msg = createRequestMessage(data);
    if (msg === undefined) return;

    const req = this.requests.get(msg.id);
    if (req === undefined) {
      throw new Error(
        `No request handler registered for response with id '${msg.id}'. Response: ${data}`,
      );
    }

    await req.processRequestMessage(msg);
    if (this.requests.size === 0) {
      // TODO fix remove bug
      this.connection?.removeOnData(this.onRequestData.bind(this));
    }
    if (req.isResolved()) {
      this._waitingForAcksBulk.delete(req.id);
      if (this._waitingForAcksBulk.size === 0) {
        this._resolveBulk();
      }
    }
    return;
  }

  async sendRequest<T>(
    connection: Channel,
    request: APIRequest<T>,
    timeoutMs: number | undefined = undefined, // TODO handle timeouts
    bulkRequests: boolean = true,
  ): Promise<T> {
    await this.sendRequests(connection, [request], bulkRequests, timeoutMs);
    return request.responseContent;
  }

  async sendRequests<T>(
    connection: Channel,
    requests: Array<APIRequest<T>>,
    bulkRequests: boolean,
    _timeoutMs?: number,
  ): Promise<void> {
    if (bulkRequests) {
      await this.sendInBulk(connection, requests, _timeoutMs);
    } else {
      await this.sendInSequence(connection, requests, _timeoutMs);
    }
  }

  private async sendSubRequests(
    connection: Channel,
    requests: APIRequest<any>[],
    start: number,
    end: number,
    _timeoutMs?: number,
  ): Promise<void> {
    this._waitingForAcksBulk.clear(); // TODO do we need?
    let data = '';
    for (let idx = start; idx < end && idx < requests.length; idx++) {
      const request = requests[idx];
      if (this.requests.has(request.id)) {
        const oldReq = this.requests.get(request.id)!;
        throw new Error(
          `two requests send with identical id '${request.id}'.\nOld Request: '${oldReq.description()}'\nCurrent Request:'${request.description()}'`,
        );
      }

      data += request.getData();
      this._waitingForAcksBulk.add(request.id);
      this.requests.set(request.id, request);
    }

    const p = new Promise((resolve, reject) => {
      this._resolveBulk = resolve;
      this._rejectBulk = reject;
    });

    const successful = await connection.send(data);
    if (!successful) {
      throw new CommandError(
        `could not send content of multiple requests to channel. Content: '${data}'`,
      );
    }
    await p;
  }

  private async sendInBulk<T>(
    connection: Channel,
    requests: Array<APIRequest<T>>,
    _timeoutMs?: number,
  ): Promise<void> {
    this.connection = connection;
    if (this.requests.size === 0)
      this.connection.addOnData(this.onRequestData.bind(this));

    const maxRequests = 10000;
    let startIdx = 0;
    while (startIdx < requests.length) {
      await this.sendSubRequests(
        connection,
        requests,
        startIdx,
        startIdx + maxRequests,
        _timeoutMs,
      );
      startIdx += maxRequests;
    }
  }

  async sendInSequence<T>(
    connection: Channel,
    requests: Array<APIRequest<T>>,
    _timeoutMs?: number,
  ): Promise<void> {
    // TODO fix
    this.connection = connection;

    if (this.requests.size === 0)
      this.connection.addOnData(this.onRequestData.bind(this));

    for (const request of requests) {
      const data = request.getData();
      if (this.requests.has(request.id)) {
        const oldReq = this.requests.get(request.id)!;
        throw new Error(
          `two requests send with identical id '${request.id}'.\nOld Request: '${oldReq.description()}'\nCurrent Request:'${request.description()}'`,
        );
      }

      this.requests.set(request.id, request);
      const successful = await connection.send(data);
      if (!successful) {
        throw new CommandError(
          `could not send content of multiple requests to channel. Content: '${data}'`,
        );
      }
      await request.promise;
    }
  }
}
