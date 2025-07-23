import * as path from 'path';
import { type WATCompilerArgs } from '../../src/compilers/wat_compilers';
import { createArduinoPlatform, createDevPlatform } from '../../src/platforms';
import { DeviceManager } from '../../src/device';
import { createLogger } from '../../src/logger/logger';
import { BoardBaudRate } from '../../src/util';
import { TargetLanguage } from '../../src/compilers/prog_language_selection';
import { type WasmitoBackendVM } from '../../src/runtimes/vm/warduino_vm';
import { fs } from 'assemblyscript/util/node.js';

const logger = createLogger('SourceCodeWatcher');

export async function compileAndUpload(vm: WasmitoBackendVM): Promise<void> {
  await vm.uploadSourceCode(vm.platform.compiler.latestSourceCodeCompilerArgs);
}

export function monitorDevVMForUpdate(vm: WasmitoBackendVM): void {
  const dirsSet = new Set(vm.platform.sourceMap.sources.map(path.dirname));
  const dirs = Array.from(dirsSet);
  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i];
    logger.info(`Monitoring ${dir} for changes`);
    fs.watch(dir, (eventType, filename) => {
      if (filename === undefined || filename === null) {
        return;
      }
      if (eventType === 'change') {
        logger.info(`${filename} has been changed`);
        logger.info('compiling and uploading ...');
        compileAndUpload(vm).catch(logger.error);
      } else {
        logger.info(`${filename} has been ${eventType}`);
      }
    });
  }
}

export async function doTestDev(): Promise<void> {
  const dm = new DeviceManager();
  const watArgs: WATCompilerArgs = {
    sourceCodePath: './src/tool_examples/wat_examples/dimmer-double-button.wat',
  };

  const platform = await createDevPlatform({
    selectedLanguage: {
      targetLanguage: TargetLanguage.WAT,
    },
    vmConfig: {
      pauseOnStart: false,
    },
  });
  const devVM = await dm.spawnDevelopmentVM(platform, watArgs);
  monitorDevVMForUpdate(devVM);
}

// doTestDev().catch(console.error);

export async function doTestArduino(): Promise<void> {
  const dm = new DeviceManager();
  const watArgs: WATCompilerArgs = {
    sourceCodePath: './src/tool_examples/wat_examples/dimmer-double-button.wat',
  };

  const platform = await createArduinoPlatform({
    selectedLanguage: {
      targetLanguage: TargetLanguage.WAT,
    },
    vmConfig: {
      pauseOnStart: false,
      serialPort: '/dev/cu.usbserial-8952FFEE8B',
      baudrate: BoardBaudRate.BD_115200,
      fqbn: {
        fqbn: 'esp32:esp32:m5stick-c',
        boardName: '',
      },
    },
  });
  const devVM = await dm.spawnHardwareVM(platform, watArgs);
  monitorDevVMForUpdate(devVM);
}

doTestArduino().catch(console.error);
