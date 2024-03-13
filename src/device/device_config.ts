import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../logger/logger';
import * as fs from 'fs';

const Logger = createLogger('DeviceConfiguration');

export interface DeviceIdentityArgs {
  name?: string;
}

export class DeviceIdentity {
  private readonly _id: string;
  private _deviceName: string;
  private readonly _anonymous: string;

  constructor(args: DeviceIdentityArgs) {
    this._anonymous = 'anonymous';
    this._id = this.createID();
    if (args.name !== undefined && typeof args.name !== 'string') {
      throw new Error(
        `device name is expected to be a string. Given ${args.name}`,
      );
    }
    this._deviceName = args.name ?? this._anonymous;
  }

  get fullname(): string {
    return `${this.name} ${this.id}`;
  }

  get name(): string {
    return this._deviceName;
  }

  set name(n: string) {
    this._deviceName = n;
  }

  hasName(): boolean {
    return this._anonymous !== this.name;
  }

  get id(): string {
    return this._id;
  }

  private createID(): string {
    return uuidv4();
  }
}

export function validateDeviceConfig(value: any): string[] {
  const errors: string[] = [];

  if (typeof value !== 'object') {
    errors.push('Device config is not valid json');
  } else {
    if (value.name !== undefined) {
      if (typeof value.name !== 'string') {
        errors.push('Property "name" should be a string');
      } else if (value.name === '') {
        errors.push('Property "name" should not be an empty string');
      }
    }
  }

  return errors;
}

export function isValidDeviceConfig(value: any): boolean {
  const errors = validateDeviceConfig(value);
  return errors.length === 0;
}

export function parseDeviceConfig(config: any): DeviceIdentityArgs | undefined {
  const errors = validateDeviceConfig(config);
  if (errors.length > 0) {
    Logger.error(`Invalid device config: ${errors.join(', ')}`);
    return undefined;
  }
  return config;
}

export function isValidDevicesConfig(value: any): string[] {
  const errors: string[] = [];
  if (typeof value !== 'object') {
    errors.push('Devices config is not valid json');
  } else {
    if (!Array.isArray(value.devices)) {
      errors.push('Property "devices" should be an array of DeviceConfig');
    } else {
      for (const device of value.devices) {
        const deviceErrors = validateDeviceConfig(device);
        if (deviceErrors.length > 0) {
          return deviceErrors;
        }
      }
    }
  }
  return errors;
}

export function parseDeviceConfigs(
  path: any,
): DeviceIdentityArgs[] | undefined {
  let fileContent: any;
  try {
    fileContent = fs.readFileSync(path, 'utf-8');
  } catch (err) {
    Logger.error(`Could not read from json file ${path}:`, err);
    return undefined;
  }

  let jsonData: any;
  try {
    // Parse the JSON data into a JavaScript object
    jsonData = JSON.parse(fileContent);
  } catch (err) {
    Logger.error(`File content could is invalid json: `, err);
    return undefined;
  }

  const errors = isValidDevicesConfig(jsonData);
  if (errors.length > 0) {
    Logger.error(`Invalid configuration: `, errors.join(' '));
    return undefined;
  }
  return jsonData.devices.map((config: any) => {
    const arg: DeviceIdentityArgs = {
      name: config.name,
    };
    return arg;
  });
}
