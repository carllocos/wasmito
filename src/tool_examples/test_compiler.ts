import { listAllFQBN, listAvailableBoards } from '../builder/util_platform';
import { Platform, PlatformBuilderConfig } from '../builder/platform_config';
import { DeploymentMode, type DeviceConfigArgs } from '../device/device_config';
import { createLogger } from '../logger/logger';
import { DeviceManager } from '../device/device_manager';
import { BoardBaudRate } from '../util/serial_port';
import { type VMConfigArgs } from '../device';
const testCompilerLogger = createLogger('TestCompiler');

async function runBuilder(): Promise<void> {
  const boards = await listAvailableBoards();
  if (boards.length === 0) {
    testCompilerLogger.error('No connected board detected');
    return;
  }
  const boardPort = boards[0];
  testCompilerLogger.info(`Using Board Port ${boardPort}`);
  const fqbns = await listAllFQBN();
  const targetBoardName = 'M5Stick-C';
  const targetBoard = fqbns.find((board) => {
    return board.boardName.includes(targetBoardName);
  });

  if (targetBoard === undefined) {
    testCompilerLogger.error(`No board found with name ${targetBoardName}`);
    return;
  }

  const vmConfigArgs: VMConfigArgs = {
    program: 'program',
    serialPort: boardPort,
  };

  const deviceConfigArgs: DeviceConfigArgs = {
    name: 'm5stickc',
    deploymentMode: DeploymentMode.MCUVM,
  };

  const platformConfig = new PlatformBuilderConfig(
    Platform.Arduino,
    BoardBaudRate.BD_115200,
    targetBoard,
    deviceConfigArgs,
    vmConfigArgs,
  );
  const sourceFilePath = './example-wat/dimmer-double-button.wat';
  const compileOutputDirectory = './example-wat/platform_arduino/';
  const deviceManager = new DeviceManager();
  const mcuVM = await deviceManager.spawnHardwareVM(
    platformConfig,
    compileOutputDirectory,
  );
  const uploaded = await mcuVM.uploadSourceCode(sourceFilePath);
  if (uploaded) {
    testCompilerLogger.info('Successfully updated source code');
    await mcuVM.run();
  } else {
    testCompilerLogger.error('failed to update source code');
  }
}

runBuilder()
  .then((_) => {})
  .catch(console.error);
