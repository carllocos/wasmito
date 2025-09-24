import { readFileAsJSONSync } from '../src/util/file_util';
import {
  type DeviceSetup,
  type PostSetupConfig,
  type DevicesLab,
} from './shared_interfaces';

export function M5StickCFromJSON(path: string, id?: string): DeviceSetup {
  const obj = readFileAsJSONSync(path);
  const name = obj.name;
  if (typeof name !== 'string') {
    throw new Error(
      `Invalid device config in ${path}: missing or invalid "name" property`,
    );
  }
  const fqbn = obj.fqbn;
  if (typeof fqbn !== 'string') {
    throw new Error(
      `Invalid device config in ${path}: missing or invalid "fqbn" property`,
    );
  }
  const serialPort = obj.serialPort;
  if (serialPort !== undefined && typeof serialPort !== 'string') {
    throw new Error(
      `Invalid device config in ${path}: missing or invalid "fqbn" property`,
    );
  }

  const inputID = obj.id ?? id;
  if (inputID === undefined || typeof inputID !== 'string') {
    throw new Error(
      `Invalid device config in ${path}: missing id or given id is not a string`,
    );
  }
  const ps: PostSetupConfig = {
    pauseAfterSetup: true,
  };
  const setup: DeviceSetup = {
    target: 'mcu',
    name: name,
    id: inputID,
    fqbn: fqbn,
    postSetup: ps,
  };
  if (serialPort !== undefined) {
    setup.serialPort = serialPort;
  }
  return setup;
}

export function oneM5StickCMCU(
  id: string,
  postSetup?: PostSetupConfig,
): DeviceSetup {
  const ps: PostSetupConfig = {
    pauseAfterSetup: true,
  };
  const OneM5StickCMCU: DeviceSetup = {
    target: 'mcu',
    name: 'mcu m5stickc',
    id,
    fqbn: 'esp32:esp32:m5stick-c',
    postSetup: postSetup ?? ps,
  };
  return OneM5StickCMCU;
}

export function oneM5StickCDev(
  id: string,
  postSetup?: PostSetupConfig,
): DeviceSetup {
  const ps: PostSetupConfig = {
    pauseAfterSetup: true,
  };
  const dev: DeviceSetup = {
    target: 'dev',
    name: 'm5stickc Dev',
    id,
    postSetup: postSetup ?? ps,
  };
  return dev;
}

export function createSystemSetup(
  setupName: string,
  devices: DeviceSetup[],
): DevicesLab {
  return {
    setupName,
    devices,
  };
}
