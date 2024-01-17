import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../logger/logger';
import * as fs from 'fs';
import { VMConfiguration, type VMConfigArgs } from './vm_config';

const Logger = createLogger('DeviceConfiguration');

export enum DeploymentMode {
  DevVM = 'DevVM',
  MCUVM = 'MCUVM',
  ProxyVM = 'ProxyVM',
  MirrorVM = 'MirrorVM',
}

export interface DeviceConfigArgs {
  name?: string;
  deploymentMode: DeploymentMode;
}

export class DeviceConfig {
  private readonly _name: string;
  private readonly _id: string;
  private readonly _deploymentMode: DeploymentMode;
  private readonly _vmConfig: VMConfiguration;

  constructor(deviceConfig: DeviceConfigArgs, vmConfigArgs: VMConfigArgs) {
    const errorMsgs = validateDeviceConfig(deviceConfig);
    if (errorMsgs.length > 0) {
      const msg = errorMsgs.join(',');
      Logger.error(`Invalid config: ${msg}`);
      throw new Error(msg);
    }
    this._name = deviceConfig.name ?? '';
    this._id = this.createID();
    this._deploymentMode = deviceConfig.deploymentMode;
    this._vmConfig = new VMConfiguration(vmConfigArgs);
  }

  get name(): string {
    return this._name;
  }

  get id(): string {
    return this._id;
  }

  get deploymentMode(): string {
    return this._deploymentMode;
  }

  get vmConfig(): VMConfiguration {
    return this._vmConfig;
  }

  get fullname(): string {
    return `${this.name} ${this.id}`;
  }

  private createID(): string {
    return uuidv4();
  }
}

export function deploymentModeFromString(
  val: string,
): DeploymentMode | undefined {
  const modes: DeploymentMode[] = Object.values(DeploymentMode);

  const lowerCase = val.toLowerCase();
  for (const mode of modes) {
    if (mode.toLowerCase() === lowerCase) {
      return mode;
    }
  }

  return undefined;
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

    if (typeof value.deploymentMode !== 'string') {
      errors.push(
        'Property "deploymentMode" has invalid type should be a string',
      );
    } else {
      if (deploymentModeFromString(value.deploymentMode) === undefined) {
        errors.push(
          `Property "deploymentMode" is not a valid DeviceMode (choices ${Object.values(
            DeploymentMode,
          ).toString()}) given ${value.deploymentMode}`,
        );
      }
    }
  }

  return errors;
}

export function isValidDeviceConfig(value: any): boolean {
  const errors = validateDeviceConfig(value);
  return errors.length === 0;
}

export function parseDeviceConfig(config: any): DeviceConfigArgs | undefined {
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

export function parseDeviceConfigs(path: any): DeviceConfigArgs[] | undefined {
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
    const arg: DeviceConfigArgs = {
      name: config.name,
      deploymentMode: deploymentModeFromString(
        config.deploymentMode,
      ) as DeploymentMode,
    };
    return arg;
  });
}
