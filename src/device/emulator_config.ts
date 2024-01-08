import { convertToBoardBaudRate, isSerialPort } from '../util/serial_port';
import { isLocalHost, isValidIP } from '../util/socket_util';

export interface VMConfigArgs {
  program: string;

  /*
   * The following fields are optional configurations
   */

  // following fields are ignored but added for completion
  loop?: boolean;
  noDebug?: boolean;
  noSocket?: boolean;
  mode?: string;

  // config that tells the port to where make the Tool API available
  toolPort?: number;
  toolHostIP?: string;

  // config that tells the VM to start in a paused state or not
  pauseOnStart?: boolean;

  // configs needed for mock calls
  mockHostIP?: string;
  mockPort?: number;

  // configs needed for proxy calls
  proxyHostIP?: string;
  proxyPort?: number;

  // config needed for serial communication
  serialPort?: string;
  baudrate?: number;

  // config to disable strict module load
  disableStrictModuleLoad?: boolean;
}

function isValidTypeVMConfig(arg: any): arg is VMConfigArgs {
  if (typeof arg !== 'object' || arg === null) {
    return false;
  }

  if (typeof arg.program !== 'string') {
    return false;
  }

  return (
    (typeof arg.loop === 'undefined' || typeof arg.loop === 'boolean') &&
    (typeof arg.noDebug === 'undefined' || typeof arg.noDebug === 'boolean') &&
    (typeof arg.noSocket === 'undefined' ||
      typeof arg.noSocket === 'boolean') &&
    (typeof arg.toolPort === 'undefined' || typeof arg.toolPort === 'number') &&
    (typeof arg.toolHostIP === 'undefined' ||
      typeof arg.toolHostIP === 'string') &&
    (typeof arg.pauseOnStart === 'undefined' ||
      typeof arg.pauseOnStart === 'boolean') &&
    (typeof arg.mockHostIP === 'undefined' ||
      typeof arg.mockHostIP === 'string') &&
    (typeof arg.mockPort === 'undefined' || typeof arg.mockPort === 'number') &&
    (typeof arg.proxyPort === 'undefined' ||
      typeof arg.proxyPort === 'number') &&
    (typeof arg.proxyHostIP === 'undefined' ||
      typeof arg.proxyHostIP === 'string') &&
    (typeof arg.serialPort === 'undefined' ||
      typeof arg.serialPort === 'string') &&
    (typeof arg.baudrate === 'undefined' || typeof arg.baudrate === 'number') &&
    (typeof arg.mode === 'undefined' || typeof arg.mode === 'string') &&
    (typeof arg.disableStrictModuleLoad === 'undefined' ||
      typeof arg.disableStrictModuleLoad === 'boolean')
  );
}

export class VMConfiguration {
  public _program: string;

  private _toolPort?: number;
  private readonly _toolHostIP?: string;

  private readonly _pauseOnStart: boolean;

  private readonly _mockHostIP?: string;
  private readonly _mockPort?: number;

  private readonly _proxyHostIP?: string;
  private readonly _proxyPort?: number;

  private readonly _serialPort?: string;
  private readonly _baudrate?: number;

  private readonly _mode: string;

  private readonly _disableStrictModuleLoad: boolean;

  private readonly loop?: boolean;
  private readonly noDebug?: boolean;
  private readonly noSocket?: boolean;

  constructor(args: any) {
    if (!isValidTypeVMConfig(args)) {
      throw new VMConfigurationError('invalid spawn arguments');
    }
    const errors = this.checkValidityArgs(args);
    if (errors.length > 0) {
      const msg = errors.join(', ');
      throw new VMConfigurationError(`invalid spawn arguments. Reason ${msg}`);
    }

    this._program = args.program;

    this._toolPort = args.toolPort;
    this._toolHostIP = args.toolHostIP ?? 'localhost';

    this._pauseOnStart = args.pauseOnStart ?? true;

    this._mockHostIP = args.mockHostIP?.toLocaleLowerCase().trim();
    this._mockPort = args.mockPort;

    this._proxyHostIP = args.proxyHostIP?.toLocaleLowerCase().trim();
    this._proxyPort = args.proxyPort;

    this._serialPort = args.serialPort;
    this._baudrate = args.baudrate;

    this._mode = args.mode ?? 'interpret';
    this._disableStrictModuleLoad = args.disableStrictModuleLoad ?? false;
  }

  get program(): string {
    return this._program;
  }

  get toolPort(): number {
    if (this._toolPort === undefined) {
      throw new VMConfigurationError(
        'configuration field `toolPort` has not been set',
      );
    }
    return this._toolPort;
  }

  set toolPort(newPort: number) {
    this._toolPort = newPort;
  }

  get toolHostIP(): string {
    if (this._toolHostIP === undefined) {
      throw new VMConfigurationError(
        'configuration field `toolHostIP` has not been set',
      );
    }
    return this._toolHostIP;
  }

  get pauseOnStart(): boolean {
    if (this._pauseOnStart === undefined) {
      throw new VMConfigurationError(
        'configuration field `pauseOnStart` has not been set',
      );
    }
    return this._pauseOnStart;
  }

  get mockHostIP(): string {
    if (this._mockHostIP === undefined) {
      throw new VMConfigurationError(
        'configuration field `mockHostIP` has not been set',
      );
    }
    return this._mockHostIP;
  }

  get mockPort(): number {
    if (this._mockPort === undefined) {
      throw new VMConfigurationError(
        'configuration field `mockPort` has not been set',
      );
    }
    return this._mockPort;
  }

  get proxyHostIP(): string {
    if (this._proxyHostIP === undefined) {
      throw new VMConfigurationError(
        'configuration field `proxyHostIP` has not been set',
      );
    }
    return this._proxyHostIP;
  }

  get proxyPort(): number {
    if (this._proxyPort === undefined) {
      throw new VMConfigurationError(
        'configuration field `proxyPort` has not been set',
      );
    }
    return this._proxyPort;
  }

  get serialPort(): string {
    if (this._serialPort === undefined) {
      throw new VMConfigurationError(
        'configuration field `serialPort` has not been set',
      );
    }
    return this._serialPort;
  }

  get baudrate(): number {
    if (this._baudrate === undefined) {
      throw new VMConfigurationError(
        'configuration field `baudrate` has not been set',
      );
    }
    return this._baudrate;
  }

  get disableStrictModuleLoad(): boolean {
    return this._disableStrictModuleLoad;
  }

  public hasSerialPort(): boolean {
    return this._serialPort !== undefined && isSerialPort(this._serialPort);
  }

  public hasToolPort(): boolean {
    return this._toolPort !== undefined;
  }

  private checkValidityArgs(args: VMConfigArgs): string[] {
    const errors: string[] = [];
    if (args.program === '') {
      errors.push('Property "program" should not be an empty string');
    }

    if (args.toolHostIP !== undefined) {
      if (!isLocalHost(args.toolHostIP)) {
        if (!isValidIP(args.toolHostIP)) {
          errors.push(
            'Property "toolHostIP" is not a valid socket ip address. Expected `localhost` or an ipv4 address',
          );
        }
      }

      if (args.toolPort === undefined) {
        errors.push('Property "toolPort" is missing');
      }
    }

    if (args.proxyHostIP !== undefined) {
      if (!isLocalHost(args.proxyHostIP)) {
        if (!isValidIP(args.proxyHostIP)) {
          errors.push(
            'Property "proxyHostIP" is not a valid socket ip address. Expected `localhost` or an ipv4 address',
          );
        }
      }

      if (args.proxyPort === undefined) {
        errors.push('Property "proxyPort" is missing');
      }
    } else if (args.proxyPort !== undefined) {
      errors.push('Property "proxyHostIP" is mising');
    }

    if (args.mockHostIP !== undefined) {
      if (!isLocalHost(args.mockHostIP)) {
        if (!isValidIP(args.mockHostIP)) {
          errors.push(
            'Property "mockHostIP" is not a valid socket ip address. Expected `localhost` or an ipv4 address',
          );
        }
      }

      if (args.mockPort === undefined) {
        errors.push('Property "mockPort" is missing');
      }
    } else if (args.mockPort !== undefined) {
      errors.push('Property "mockHostIP" is mising');
    }

    if (args.serialPort !== undefined) {
      if (!isSerialPort(args.serialPort)) {
        errors.push('Property "serialPort" should be a valid serial port');
      }

      if (args.baudrate !== undefined) {
        const br = convertToBoardBaudRate(args.baudrate);
        if (br === undefined) {
          errors.push('Property "baudrate" provides an invalid baudrate');
        }
      } else {
        errors.push('Property "baudrate" is mising');
      }
    } else if (args.baudrate !== undefined) {
      errors.push('Property "serialPort" is mising');
    }

    return errors;
  }
}

export class VMConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VMConfigurationError';
    Error.captureStackTrace(this, VMConfiguration);
  }
}
