export interface SpawnArguments {
  program: string;
  listenPort?: number; // socket port nr where to listen
  pauseOnStart?: boolean;
  mockPort?: number;
  proxyPort?: string;
  baudrate?: number;
  mode?: string;
}

function isEmulatorSpawnArguments(obj: any): obj is SpawnArguments {
  return (
    typeof obj === 'object' &&
    typeof obj.program === 'string' &&
    (typeof obj.listenPort === 'undefined' ||
      typeof obj.listenPort === 'number') &&
    (typeof obj.pauseOnStart === 'undefined' ||
      typeof obj.pauseOnStart === 'boolean') &&
    (typeof obj.mockPort === 'undefined' || typeof obj.mockPort === 'number') &&
    (typeof obj.proxyPort === 'undefined' ||
      typeof obj.proxyPort === 'string') &&
    (typeof obj.baudrate === 'undefined' || typeof obj.baudrate === 'number') &&
    (typeof obj.mode === 'undefined' || typeof obj.mode === 'string')
  );
}

export class EmulatorSpawnArguments {
  public program: string = '';
  public listenPort?: number; // socket port nr where to listen
  public pauseOnStart: boolean = true;
  public mockPort?: number;
  public proxyPort?: string;
  public baudrate?: number;
  public mode = 'interpret';

  constructor(args: any) {
    if (!isEmulatorSpawnArguments(args)) {
      throw new EmulatorSpawnArgumentsError('invalid spawn arguments');
    }
    this.program = args.program;
    if (typeof args.listenPort === 'number') {
      this.listenPort = args.listenPort;
    }
    if (
      args.pauseOnStart !== undefined &&
      typeof args.pauseOnStart === 'boolean'
    ) {
      this.pauseOnStart = args.pauseOnStart;
    }
    if (args.mockPort !== undefined && typeof args.mockPort === 'number') {
      this.mockPort = args.mockPort;
    }
    if (typeof args.listenPort === 'number') {
      this.listenPort = args.listenPort;
    }
    if (args.proxyPort !== undefined && typeof args.proxyPort === 'string') {
      this.proxyPort = args.proxyPort;
    }
    if (args.baudrate !== undefined && typeof args.baudrate === 'number') {
      this.baudrate = args.baudrate;
    }
    if (typeof args.mode === 'string') {
      this.mode = args.mode;
    }
  }
}

export class EmulatorSpawnArgumentsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmulatorSpawnArguments';
    Error.captureStackTrace(this, EmulatorSpawnArguments);
  }
}
