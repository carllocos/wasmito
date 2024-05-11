import { listAllFQBN, listAvailableBoards } from '../platforms/util_platform';
import { createLogger } from '../logger/logger';
import { DeviceManager } from '../device/device_manager';
import { BoardBaudRate } from '../util/serial_port';
import {
  type ProgLangSelectionArgs,
  TargetLanguage,
} from '../compilers/prog_language_selection';
import { createArduinoPlatform } from '../platforms/platformbuilder_factory';
import { type WATCompilerArgs } from '../compilers/wat_compilers';

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

  const sourceFilePath =
    './src/tool_examples/wat_examples/dimmer-double-button.wat';
  const selectedLang: ProgLangSelectionArgs = {
    targetLanguage: TargetLanguage.WAT,
  };
  const sourceCodeCompilerArgs: WATCompilerArgs = {
    sourceCodePath: sourceFilePath,
  };

  const compileOutputDirectory = './example-wat/platform_arduino/';
  const platform = await createArduinoPlatform(
    {
      vmConfig: {
        baudrate: BoardBaudRate.BD_115200,
        fqbn: targetBoard,
        serialPort: boardPort,
      },
      selectedLanguage: selectedLang,
    },
    compileOutputDirectory,
  );

  const deviceManager = new DeviceManager();
  const mcuVM = await deviceManager.spawnHardwareVM(
    platform,
    sourceCodeCompilerArgs,
  );
  await mcuVM.run();
}

runBuilder()
  .then((_) => {})
  .catch(console.error);
