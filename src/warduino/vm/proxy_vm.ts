import { type WARDuinoVM } from './warduino_vm';
import { VMConfiguration } from '../../device/vm_config';
import {
  type DeviceConfigArgs,
  DeviceConfig,
  DeploymentMode,
} from '../../device/device_config';
import { WARDuinoDevVM } from './dev_vm';
import { v4 as uuidv4 } from 'uuid';

export class WARDuinoProxiedVMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WARDuinoProxiedVMError';
    Error.captureStackTrace(this, WARDuinoProxiedVMError);
  }
}

function createDeviceConfig(vmToProxy: WARDuinoVM): DeviceConfig {
  const targetConfig = vmToProxy.platformConfig.deviceConfig;
  const name = `${targetConfig.name} (Proxied)`;
  const vmID = uuidv4();
  const dc: DeviceConfigArgs = {
    name,
    id: vmID,
    deploymentMode: DeploymentMode.ProxyVM,
  };
  const vmConfig = createVMConfig(vmToProxy);
  return new DeviceConfig(dc, vmConfig);
}

function createVMConfig(vmToProxy: WARDuinoVM): VMConfiguration {
  const sm = vmToProxy.getSourceMap();
  if (sm === undefined) {
    throw new WARDuinoProxiedVMError(
      `VM to proxy called ${vmToProxy.platformConfig.deviceConfig.name} is missing a source code`,
    );
  }

  return new VMConfiguration({
    program: sm.sourceCodeFilePath,
  });
}

export class WARDuinoProxiedVM extends WARDuinoDevVM {
  protected ErrorClass = WARDuinoProxiedVMError;

  constructor(vmToProxy: WARDuinoVM, buildOutputDir?: string) {
    super(
      createDeviceConfig(vmToProxy),
      createVMConfig(vmToProxy),
      buildOutputDir,
    );
  }

  // TODO use shareable channel

  protected override buildProcessArguments(
    programPath: string,
    args: VMConfiguration,
  ): string[] {
    const processArgs: string[] = [programPath];

    if (args.hasToolPort()) {
      processArgs.push('--socket');
      processArgs.push(args.toolPort.toString());
    }
    if (args.pauseOnStart) {
      processArgs.push('--paused');
    }
    if (args.disableStrictModuleLoad) {
      processArgs.push('--disable-strict-module-load');
    }
    return processArgs;
  }
}
