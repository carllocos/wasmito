import {
  type DeviceConfigArgs,
  isValidDevicesConfig,
  parseDeviceConfigs,
  validateDeviceConfig,
  DeploymentMode,
} from '../../src/device/device_config';
import assert from 'assert';

describe('Loading device config with invalid input', () => {
  it('Empty input config should give error', () => {
    const config: any = {};
    const errorsMsgs: string[] = validateDeviceConfig(config);
    assert(
      errorsMsgs.length > 0,
      'The error messages list should have one or more items',
    );
  });

  it('Input config with non-expected entries should give error', () => {
    const config: any = {};
    config.unExistingField = 'value';
    const errorsMsgs: string[] = validateDeviceConfig(config);
    assert(
      errorsMsgs.length > 0,
      'The error messages list should have one or more items',
    );
  });

  it('Input config with only `name` property should give error', () => {
    const config: any = {};
    config.name = 'device name';
    const errorsMsgs: string[] = validateDeviceConfig(config);
    assert(
      errorsMsgs.length > 0,
      'The error messages list should have one or more items',
    );
  });

  it('Input config with only `id` property should give error', () => {
    const config: any = {};
    config.id = 'some id';
    const errorsMsgs: string[] = validateDeviceConfig(config);
    assert(
      errorsMsgs.length > 0,
      'The error messages list should have one or more items',
    );
  });

  it('Input config with unsupported `deploymentMode` value should give error', () => {
    const config: any = {};
    config.name = 'some Name';
    config.id = 'some id';
    config.deploymentMode = 'Unexsting deployment mode';
    const errorsMsgs: string[] = validateDeviceConfig(config);
    assert(
      errorsMsgs.length > 0,
      'The error messages list should have one or more items',
    );
  });
});

describe('Loading device config with valid input', () => {
  it('Input config with all expected fields should give no error', () => {
    const config: any = {};
    config.name = 'some Name';
    config.id = 'some id';
    config.deploymentMode = 'DevVM';

    const errorsMsgs: string[] = validateDeviceConfig(config);
    assert(
      errorsMsgs.length === 0,
      `The error messages list should be empty got errors: ${errorsMsgs.join(
        ',',
      )}`,
    );
  });

  it('The `deploymentMode` property of an input config should be case insensitive', () => {
    const config: any = {};
    config.name = 'some Name';
    config.id = 'some id';
    config.deploymentMode = 'dEvVm'; // mix (non)-capital

    let errorsMsgs: string[] = validateDeviceConfig(config);
    assert(
      errorsMsgs.length === 0,
      `Error occurred when loading a DevVM device config got errors: ${errorsMsgs.join(
        ',',
      )}`,
    );

    config.deploymentMode = 'mcUvm';
    errorsMsgs = validateDeviceConfig(config);
    assert(
      errorsMsgs.length === 0,
      `Error occurred when loading a mcu device config got errors: ${errorsMsgs.join(
        ',',
      )}`,
    );

    config.deploymentMode = 'ProXyVm';
    errorsMsgs = validateDeviceConfig(config);
    assert(
      errorsMsgs.length === 0,
      `Error occurred when loading a proxy device config got errors: ${errorsMsgs.join(
        ',',
      )}`,
    );

    config.deploymentMode = 'MIRRORVM';
    errorsMsgs = validateDeviceConfig(config);
    assert(
      errorsMsgs.length === 0,
      `Error occurred when loading a mirror device config got errors: ${errorsMsgs.join(
        ',',
      )}`,
    );
  });
});

describe('Loading multile device configs', () => {
  it('Loading from empty input config should give error', () => {
    const config: any = {};
    const errorsMsgs: string[] = isValidDevicesConfig(config);
    assert(
      errorsMsgs.length > 0,
      'The error messages list should have one or more items',
    );
  });

  it('One invalid config should give error', () => {
    const valid: any = {
      name: 'a',
      id: 'b',
      deploymentMode: 'mcuvm',
    };

    const invalid: any = {
      name: 'a',
      id: 'b',
      deploymentMode: 'UNEXISTING DEPLOYMENT MODE',
    };

    let configs: any = { devices: [valid, invalid] };
    let errorsMsgs: string[] = isValidDevicesConfig(configs);
    assert(
      errorsMsgs.length > 0,
      'The error messages list should have one or more items',
    );

    configs = { devices: [invalid, invalid] };
    errorsMsgs = isValidDevicesConfig(configs);
    assert(
      errorsMsgs.length > 0,
      'The error messages list should have one or more items',
    );
  });

  it('Loading devices from valid input configs should yield same number of devices', () => {
    const validMCU: any = {
      name: 'a',
      id: 'b',
      deploymentMode: 'mcuvm',
    };

    const validDevVM: any = {
      name: 'a',
      id: 'b',
      deploymentMode: 'devvm',
    };

    const configs: any = { devices: [validMCU, validDevVM] };
    const errorMsgs = isValidDevicesConfig(configs);
    assert(errorMsgs.length === 0, 'Valid input configs should parse');
  });

  it('Loaded device configs should preserve input config values', () => {
    const path = './test/data/valid_dummy_device_configs.json';
    const loadedConfigs = parseDeviceConfigs(path);
    assert(
      loadedConfigs !== undefined && loadedConfigs.length === 2,
      `parsing correct input configs should yield 2 configs`,
    );

    const configs: DeviceConfigArgs[] = loadedConfigs;

    const configA = configs[0];
    assert(configA.id === 'A', 'invalid id');
    assert(configA.name === 'A', 'invalid name');
    assert(
      configA.deploymentMode === DeploymentMode.MCUVM,
      'invalid deployment mode',
    );

    const configB = configs[1];
    assert(configB.id === 'B', 'invalid id');
    assert(configB.name === 'B', 'invalid name');
    assert(
      configB.deploymentMode === DeploymentMode.MCUVM,
      'invalid deployment mode',
    );
  });
});
