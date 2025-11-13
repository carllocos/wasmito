import {
  listAllFQBN,
  listAvailableBoards,
} from '../src/platforms/util_platform';
import { createLogger } from '../src/logger/logger';
import { DeviceManager } from '../src/device/device_manager';
import { BoardBaudRate } from '../src/util/serial_port';
import { createArduinoPlatform } from '../src/platforms/platformbuilder_factory';
import { LanguageAdaptor } from '../src/language_adaptors/language_adaptor';

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

  const compileOutputDirectory = './example-wat/platform_arduino/';
  const platform = await createArduinoPlatform(
    {
      vmConfig: {
        baudrate: BoardBaudRate.BD_115200,
        fqbn: targetBoard,
        serialPort: boardPort,
      },
    },
    compileOutputDirectory,
  );

  const wasmPath = './src/tool_examples/wat_examples/dimmer-double-button.wasm';
  const la = LanguageAdaptor.emptyAdaptor(wasmPath);
  const deviceManager = new DeviceManager();
  const mcuVM = await deviceManager.spawnHardwareVM(la, platform);
  await mcuVM.run();
}

runBuilder().catch(console.error);
