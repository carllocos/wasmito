import {
  type DeviceConfig,
  isValidDeviceConfig,
  isValidDevicesConfig,
  parseDeviceConfigs,
} from '../../src/device/device_config';
import { assert } from 'console';

describe('Loading device config with invalid input', () => {
  it('Empty input config should give error', () => {
    const config: any = {};
    const errorsMsgs: string[] = isValidDeviceConfig(config);
    assert(
      errorsMsgs.length > 0,
      'The error messages list should have one or more items',
    );
  });

  it('Input config with non-expected entries should give error', () => {
    const config: any = {};
    config.unExistingField = 'value';
    const errorsMsgs: string[] = isValidDeviceConfig(config);
    assert(
      errorsMsgs.length > 0,
      'The error messages list should have one or more items',
    );
  });

  it('Input config with only `name` property should give error', () => {
    const config: any = {};
    config.name = 'device name';
    const errorsMsgs: string[] = isValidDeviceConfig(config);
    assert(
      errorsMsgs.length > 0,
      'The error messages list should have one or more items',
    );
  });

  it('Input config with only `id` property should give error', () => {
    const config: any = {};
    config.id = 'some id';
    const errorsMsgs: string[] = isValidDeviceConfig(config);
    assert(
      errorsMsgs.length > 0,
      'The error messages list should have one or more items',
    );
  });

  it('Input config with unsupported `mode` value should give error', () => {
    const config: any = {};
    config.name = 'some Name';
    config.id = 'some id';
    config.port = 'some port';
    config.program = 'some program';
    config.mode = 'Unexsting mode';
    const errorsMsgs: string[] = isValidDeviceConfig(config);
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
    config.port = '/dev/ttyUSB1'; // valid unix port
    config.program = 'some program';
    config.mode = 'Emulate';
    config.host = '';

    const errorsMsgs: string[] = isValidDeviceConfig(config);
    assert(
      errorsMsgs.length === 0,
      `The error messages list should be empty got errors: ${errorsMsgs.join(
        ',',
      )}`,
    );
  });

  it('The `mode` property of an input config should be case insensitive', () => {
    const config: any = {};
    config.name = 'some Name';
    config.id = 'some id';
    config.port = '/dev/ttyUSB1'; // valid unix port
    config.program = 'some program';
    config.mode = 'EmUlaTE'; // mix (non)-capital
    config.host = '';

    let errorsMsgs: string[] = isValidDeviceConfig(config);
    assert(
      errorsMsgs.length === 0,
      `Error occurred when loading an emulated device config got errors: ${errorsMsgs.join(
        ',',
      )}`,
    );

    config.mode = 'mcU';
    errorsMsgs = isValidDeviceConfig(config);
    assert(
      errorsMsgs.length === 0,
      `Error occurred when loading a mcu device config got errors: ${errorsMsgs.join(
        ',',
      )}`,
    );

    config.mode = 'ProXy';
    errorsMsgs = isValidDeviceConfig(config);
    assert(
      errorsMsgs.length === 0,
      `Error occurred when loading a proxy device config got errors: ${errorsMsgs.join(
        ',',
      )}`,
    );

    config.mode = 'MIRROR';
    errorsMsgs = isValidDeviceConfig(config);
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
      mode: 'mcu',
      port: '/dev/ttyUSB1', // valid unix port
      program: 'some program',
      host: '',
    };

    const invalid: any = {
      name: 'a',
      id: 'b',
      mode: 'UNEXISTING MODE',
      port: 'some port',
      program: 'some program',
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
      mode: 'mcu',
      port: 'some port',
      program: 'some program',
    };

    const validEmulated: any = {
      name: 'a',
      id: 'b',
      mode: 'emulate',
      port: 'some port',
      program: 'some program',
    };

    const configs: any = { devices: [validMCU, validEmulated] };
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

    const configs: DeviceConfig[] = loadedConfigs as DeviceConfig[];

    const configA = configs[0];
    assert(configA.id === 'A', 'invalid id');
    assert(configA.name === 'A', 'invalid name');
    assert(configA.port === 'port A', 'invalid port');
    assert(configA.program === 'program A', 'invalid program');
    assert(configA.mode === 'mcu', 'invalid mode');

    const configB = configs[1];
    assert(configB.id === 'B', 'invalid id');
    assert(configB.name === 'B', 'invalid name');
    assert(configB.port === 'port B', 'invalid port');
    assert(configB.program === 'program B', 'invalid program');
    assert(configB.mode === 'mcu', 'invalid mode');
  });
});
