import { assertValidFQBN, type BoardFQBN } from '../platforms/platform_config';
import { getFileExtension, isFilePath } from '../util/file_util';
import {
  type BoardBaudRate,
  isSerialPort,
  isValidBoardBaudRate,
} from '../util/serial_port';
import { isLocalHost, isValidIP } from '../util/socket_util';

export interface VMConfigArgs {
  program?: string;

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
  baudrate?: BoardBaudRate;
  fqbn?: BoardFQBN;

  // config to disable strict module load
  disableStrictModuleLoad?: boolean;
}

export class VMConfiguration {
  private _program?: string;

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
  private readonly _fqbn?: BoardFQBN;

  constructor(args: VMConfigArgs) {
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
    this._disableStrictModuleLoad = args.disableStrictModuleLoad ?? true;
    this._fqbn = args.fqbn;
  }

  get program(): string {
    if (this._program === undefined) {
      throw new Error(`program has not been set`);
    }
    return this._program;
  }

  set program(newProgram: string) {
    this._program = newProgram;
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

  get fqbn(): BoardFQBN {
    if (this._fqbn === undefined) {
      throw new VMConfigurationError('FQBN is not set yet');
    }
    return this._fqbn;
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

  public hasToolHostIPAddr(): boolean {
    return this._toolHostIP !== undefined;
  }

  public hasBaudRate(): boolean {
    return this._baudrate !== undefined;
  }

  public hasWasmPath(): boolean {
    return this._program !== undefined;
  }

  static async fromArgs(args: any): Promise<VMConfiguration> {
    const a = await createValidVMConfigArgs(args);
    return new VMConfiguration(a);
  }
}

async function createValidVMConfigArgs(args: any): Promise<VMConfigArgs> {
  if (typeof args !== 'object') {
    throw new VMConfigurationError('args is expected to be an object');
  }

  const program = args.program;
  if (program !== undefined) {
    if (typeof program !== 'string') {
      throw new VMConfigurationError(
        `Property "program" should be a string. Given ${program}`,
      );
    } else if (!isFilePath(program)) {
      throw new VMConfigurationError(
        `Property "program" does not point to a program path. Given ${program}`,
      );
    } else if (getFileExtension(program) !== 'wasm') {
      throw new VMConfigurationError(
        `Property "program" should point to a wasm given program does not end with wasm extension ${program}`,
      );
    }
  }

  let toolHostIP = args.toolHostIP;
  const toolPort = args.toolPort;
  if (toolHostIP !== undefined) {
    if (!isLocalHost(toolHostIP)) {
      if (!isValidIP(toolHostIP)) {
        throw new VMConfigurationError(
          `Property "toolHostIP" is not a valid socket ip address. Expected 'localhost' or an ipv4 address. Given ${toolHostIP}`,
        );
      }
    }

    if (typeof toolPort !== 'number') {
      throw new VMConfigurationError(
        `Property "toolPort" is mandatory when providing toolHostIP and should be a number. Given ${toolPort}`,
      );
    }
  } else if (toolPort !== undefined) {
    toolHostIP = 'localhost';
  }

  const proxyHostIP = args.proxyHostIP;
  const proxyPort = args.proxyPort;
  if (proxyHostIP !== undefined) {
    if (!isLocalHost(proxyHostIP)) {
      if (!isValidIP(proxyHostIP)) {
        throw new VMConfigurationError(
          `Property "proxyHostIP" is not a valid socket ip address. Expected 'localhost' or an ipv4 address. Given ${proxyHostIP}`,
        );
      }
    }

    if (typeof proxyPort !== 'number') {
      throw new VMConfigurationError(
        `Property "proxyPort" is mandatory when providing proxyHostIP and should be a number. Given ${proxyPort}`,
      );
    }
  } else if (proxyPort !== undefined) {
    throw new VMConfigurationError(`Property "proxyHostIP" is mising`);
  }

  const mockHostIP = args.mockHostIP;
  const mockPort = args.mockPort;
  if (mockHostIP !== undefined) {
    if (!isLocalHost(mockHostIP)) {
      if (!isValidIP(mockHostIP)) {
        throw new VMConfigurationError(
          `Property "mockHostIP" is not a valid socket ip address. Expected 'localhost' or an ipv4 address. Given ${mockHostIP}`,
        );
      }
    }

    if (typeof mockPort !== 'number') {
      throw new VMConfigurationError(
        `Property "mockPort" is mandatory when mockHostIP and should be a number. Given ${mockPort}`,
      );
    }
  } else if (mockPort !== undefined) {
    throw new VMConfigurationError('Property "mockHostIP" is mising');
  }

  const serialPort = args.serialPort;
  const baudrate = args.baudrate;
  let fqbn = args.fqbn;
  if (serialPort !== undefined) {
    if (!isSerialPort(serialPort)) {
      throw new VMConfigurationError(
        'Property "serialPort" should be a valid serial port',
      );
    }
    if (!isValidBoardBaudRate(baudrate)) {
      throw new VMConfigurationError(
        `Property "baudrate" provides an invalid baudrate. Given ${baudrate}`,
      );
    }

    fqbn = await assertValidFQBN(fqbn);
  } else if (baudrate !== undefined) {
    throw new VMConfigurationError('Property "serialPort" is mising');
  } else if (fqbn !== undefined) {
    throw new VMConfigurationError(
      'Property "serialPort" and "baudrate" is mising',
    );
  }

  const pauseOnStart = args.pauseOnStart;
  if (pauseOnStart !== undefined && typeof pauseOnStart !== 'boolean') {
    throw new VMConfigurationError(
      'Property "pauseOnStart" should be a boolean',
    );
  }

  const disableStrictModuleLoad = args.disableStrictModuleLoad;
  if (
    disableStrictModuleLoad !== undefined &&
    typeof disableStrictModuleLoad !== 'boolean'
  ) {
    throw new VMConfigurationError(
      'Property "disableStrictModule" should be a boolean',
    );
  }

  const c: VMConfigArgs = {
    program,
    toolPort,
    toolHostIP,
    pauseOnStart,

    mockHostIP,
    mockPort,

    proxyHostIP,
    proxyPort,

    serialPort,
    baudrate,
    fqbn,

    disableStrictModuleLoad,
  };

  return c;
}

export class VMConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VMConfigurationError';
    Error.captureStackTrace(this, VMConfiguration);
  }
}
