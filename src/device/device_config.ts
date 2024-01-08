import { createLogger } from '../logger/logger';
import * as fs from 'fs';
import { type VMConfiguration } from './vm_config';

export enum DeploymentMode {
  DevVM = 'dev-vm',
  MCUVM = 'mcu-vm',
  ProxyVM = 'proxy-vm',
  MirrorVM = 'mirror-vm',
}

export interface DeviceConfigArgs {
  name: string;
  id: string;
  deploymentMode: DeploymentMode;
}

export class DeviceConfig {
  private readonly _name: string;
  private readonly _id: string;
  private readonly _deploymentMode: DeploymentMode;
  private readonly _vmConfig: VMConfiguration;

  constructor(deviceConfig: DeviceConfigArgs, vmConfig: VMConfiguration) {
    // TODO validate deviceConfigArgs
    this._name = deviceConfig.name;
    this._id = deviceConfig.id;
    this._deploymentMode = deviceConfig.deploymentMode;
    this._name = deviceConfig.name;
    this._vmConfig = vmConfig;
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
}

export function deploymentModeFromString(
  mode: string,
): DeploymentMode | undefined {
  const modes: Record<string, DeploymentMode> = {
    emulate: DeploymentMode.DevVM,
    mcu: DeploymentMode.MCUVM,
    proxy: DeploymentMode.ProxyVM,
    mirror: DeploymentMode.MirrorVM,
  };

  const lowerCaseInput = mode.toLowerCase();

  for (const key in modes) {
    if (key.toLowerCase() === lowerCaseInput) {
      return modes[key];
    }
  }

  return undefined;
}

export function validateDeviceConfig(value: any): string[] {
  const errors: string[] = [];

  if (typeof value !== 'object') {
    errors.push('Device config is not valid json');
  } else {
    if (typeof value.name !== 'string') {
      errors.push('Property "name" should be a string');
    }

    if (typeof value.id !== 'string') {
      errors.push('Property "id" should be a string');
    }
  }

  let mode: any = value.mode;
  if (typeof mode === 'string') {
    mode = mode.toLowerCase();
  }

  if (!Object.values(DeploymentMode).includes(mode)) {
    errors.push(
      `Property "deploymentMode" is not a valid DeviceMode (choices ${Object.values(
        DeploymentMode,
      ).toString()})`,
    );
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

const Logger = createLogger('DeviceConfiguration');

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
  return jsonData.devices;
}
