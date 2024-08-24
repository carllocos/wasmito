import {
  type DeviceSetup,
  type PostSetupConfig,
  type DevicesLab,
} from './shared_interfaces';

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
