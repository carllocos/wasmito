import { createLogger } from '../logger/logger';
import * as fs from 'fs';

export enum DeviceMode {
  Emulate = 'emulate',
  MCU = 'mcu',
  Proxy = 'proxy',
  Mirror = 'mirror',
}

export interface DeviceConfig {
  name: string;
  id: string;
  mode: DeviceMode;
  port: string;
  host: string;
  program: string;
}

export function isValidIP(str: string): boolean {
  const ipPattern =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  return ipPattern.test(str);
}

export function isSerialPort(str: string): boolean {
  const unixPattern = /^(\/dev\/ttyS\w+|\/dev\/ttyUSB\w+)$/i;
  return unixPattern.test(str);
}

export function isValidDeviceConfig(value: any): string[] {
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

    if (typeof value.port !== 'string') {
      errors.push('Property "port" should be a string');
    }

    if (typeof value.host !== 'string') {
      errors.push('Property "host" should be a string');
    } else if (value.host !== '') {
      const addr = value.host.toLowerCase();
      if (addr !== 'localhost' && isValidIP(addr)) {
        errors.push(
          'Property "host" is not a valid host address. Expected `localhost` or an ipv4 address',
        );
      }

      if (isNaN(parseInt(value.port))) {
        errors.push(
          `Property "port" is not a valid port number. Got ${value.port}`,
        );
      }
    } else if (value.host === '' && !isSerialPort(value.port)) {
      errors.push('Property "port" should be a valid serial port');
    }

    if (typeof value.program !== 'string') {
      errors.push('Property "program" should be a string');
    }

    let mode: any = value.mode;
    if (typeof mode === 'string') {
      mode = mode.toLowerCase();
    }

    if (!Object.values(DeviceMode).includes(mode)) {
      errors.push(
        `Property "mode" is not a valid DeviceMode (choices ${Object.values(
          DeviceMode,
        ).toString()})`,
      );
    }
  }

  return errors;
}

export function parseDeviceConfig(config: any): DeviceConfig | undefined {
  const errors = isValidDeviceConfig(config);
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
        const deviceErrors = isValidDeviceConfig(device);
        if (deviceErrors.length > 0) {
          return deviceErrors;
        }
      }
    }
  }
  return errors;
}

export function parseDeviceConfigs(path: any): DeviceConfig[] | undefined {
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
