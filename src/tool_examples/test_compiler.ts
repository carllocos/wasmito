import { listAllFQBN, listAvailableBoards } from '../builder/util_platform';
import { createPlatformBuilder } from '../builder/platformbuilder_factory';
import {
  BoardBaudRate,
  Platform,
  PlatformBuilderConfig,
} from '../builder/platform_config';
import { type DeviceConfig, DeviceMode } from '../device/device_config';
import { createLogger } from '../logger/logger';
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

  const deviceConfig: DeviceConfig = {
    name: 'm5stickc',
    id: 'some id',
    mode: DeviceMode.MCU,
    host: '',
    port: boardPort,
    program: 'program',
  };

  const platformConfig = new PlatformBuilderConfig(
    Platform.Arduino,
    BoardBaudRate.BD_19200,
    targetBoard,
    deviceConfig,
  );
  const wasmBinaryPath = process.cwd() + '/example-wat/test-example.wasm';
  const compileOutputDirectory =
    process.cwd() + '/example-wat/platform_arduino/';
  const builder = createPlatformBuilder(platformConfig, compileOutputDirectory);
  // const builder = createPlatformBuilder(platformConfig);
  const exitCode = await builder.compile(wasmBinaryPath);
  testCompilerLogger.info(
    `Compilation to ${deviceConfig.name} (board=${targetBoard.boardName}, ID=${deviceConfig.id}) exited with code ${exitCode}`,
  );
  if (exitCode !== 0) {
    return;
  }
  const uploadExitCode = await builder.upload();
  testCompilerLogger.info(
    `Flash to ${deviceConfig.name} (board=${targetBoard.boardName}, ID=${deviceConfig.id}) exited with code ${uploadExitCode}`,
  );
}

runBuilder()
  .then((_) => {})
  .catch(console.error);
