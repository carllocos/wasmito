import { FactoryArgs } from '../../src/platforms/platformbuilder_factory';
import { BoardBaudRate } from '../../src/util/serial_port';

export const TargetVMConfig: FactoryArgs = {
  vmConfig: {
    pauseOnStart: true, // pause the VM on deploy of the Wasm module
    serialPort: '/dev/cu.usbserial-8952FFEE8B',
    baudrate: BoardBaudRate.BD_115200,
    fqbn: {
      boardName: 'M5Stick-C',
      fqbn: 'm5stack:esp32:m5stick-c',
    },
  },
};
