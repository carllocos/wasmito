import { type Command } from 'commander';
import { isFilePath } from '../src/util/file_util';
import { WasmModule } from '../src/webassembly/wasm/wasm_module';
import { WasmValuesBuilder } from '../src/webassembly/wasm_value_array_builder';
import { DeviceManager } from '../src/device/device_manager';
import {
  createArduinoPlatform,
  createDevPlatform,
  FactoryArgs,
} from '../src/platforms/platformbuilder_factory';
import { isProxyCallFailedRequest } from '../src/runtimes/wasmito_vm/requests/fun_call_request';
import { isSerialPort } from '../src/util/serial_port';
import { DevVMPlatform } from '../src/platforms/dev_vm_platform';
import { ArduinoBoardBuilder } from '../src/platforms/arduino_platform';
import { WasmitoBackendVM } from '../src/runtimes/wasmito_vm/wasmito_vm';
import { LanguageAdaptor } from '../src/language_adaptors/language_adaptor';

export function registerInterpretRequestCommand(program: Command): void {
  const commandName = 'interpret';
  program
    .command(`${commandName} <wasmPath> <fid> [args...]`)
    .description(
      'Perform a Wasm call on a function defined in the given module. Optionally, the module is either running on local VM or MCU VM',
    )
    // .option('--proxy', 'the call is a proxy call')
    .option(
      '--port <portnr>',
      'If provided, perform a call on an already existing VM. For local VM `port` is a socket port number. For MCU, `port` is a serial port.',
    )
    .option(
      '-b <baudrate>',
      'only required if --port is provided an is a serial port',
    )
    .action(async (wasmPath, functionID, callArgs, options) => {
      if (!isFilePath(wasmPath)) {
        program.error(`${wasmPath} does not exist`);
      }

      const fID = Number(functionID);
      if (isNaN(fID) || fID < 0) {
        program.error(
          `give function ID ${functionID} cannot be converted to a positive number`,
        );
      }

      const mod = new WasmModule(wasmPath);
      const wasmFunc = mod.getFunction(fID);
      if (wasmFunc === undefined) {
        program.error(`No function found with ID '${functionID}'`);
      }

      const wasmArgs = new WasmValuesBuilder();
      if (wasmFunc.type.nrArgs !== callArgs.length) {
        program.error(
          `function '${functionID}' expects ${wasmFunc.type.nrArgs} arguments. Given ${callArgs.length} `,
        );
      }

      for (const arg of callArgs) {
        const a = Number(arg);
        if (isNaN(a)) {
          program.error(
            `could not convert Function argument '${arg}' to a number`,
          );
        }
        wasmArgs.addI32Value(a);
      }

      const toolPort = Number(options.port);
      const baudRate = Number(options.b);
      const connectToExistingVM = toolPort !== undefined;
      let platform: DevVMPlatform | ArduinoBoardBuilder | undefined;
      const factoryArgs: FactoryArgs = {
        vmConfig: {
          disableStrictModuleLoad: true,
        },
      };

      if (connectToExistingVM && isNaN(toolPort)) {
        if (!isSerialPort(options.port)) {
          program.error(`not a valid (Serial) port`);
        }
        if (isNaN(baudRate)) {
          program.error(
            `baudrate number is required when port is a serial port. Use -b to provide baudrate`,
          );
        }
        factoryArgs.vmConfig!.serialPort = options.port;
        factoryArgs.vmConfig!.baudrate = baudRate;
        platform = await createArduinoPlatform(factoryArgs);
      } else {
        factoryArgs.vmConfig!.toolPort = toolPort;
        platform = await createDevPlatform(factoryArgs);
      }

      const timeout = 60 * 1000;
      const deviceManager = new DeviceManager();
      let vm: WasmitoBackendVM | undefined;
      const langAdaptor = LanguageAdaptor.emptyAdaptor(wasmPath);
      if (!connectToExistingVM) {
        vm = await deviceManager.spawnDevelopmentVM(
          langAdaptor,
          platform as DevVMPlatform,
          timeout,
        );
      } else if (!isNaN(toolPort)) {
        vm = await deviceManager.connectToExistingDevVM(
          langAdaptor,
          platform as DevVMPlatform,
          timeout,
        );
      } else {
        vm = await deviceManager.connectToExistingMCUVM(
          langAdaptor,
          platform as ArduinoBoardBuilder,
        );
      }
      try {
        const response = await vm.proxyCall(fID, wasmArgs.values, timeout);
        // const req = new PushEventRequest(`interrupt_${interruptNr}`, '');
        // const success: boolean = await sendRequest(channel, req, timeout);
        if (isProxyCallFailedRequest(response)) {
          program.error(
            `Could not perform Call: (error code ${response.errorCode}) ${response.errorMessage}`,
          );
        } else {
          if (response.sucessFullCall) {
            const vResult = response.resultValue?.value ?? 'Call succeeded';
            console.log(vResult);
          } else {
            console.log(
              `Call failed ${response.exceptionMsg !== '' ? 'due to ' + response.exceptionMsg : ''}`,
            );
          }
        }
      } catch (e) {
        const errMsg = e instanceof Error ? `${e.message}${e.stack ?? ''}` : e;
        program.error(`Failed during ${commandName} error occurred: ${errMsg}`);
      } finally {
        await deviceManager.closeVM(vm);
      }
    });
}

//   } else {
// const portNr = Number(options.port);
// if (isNaN(portNr) && !isSerialPort(options.port)) {
//   program.error(`not a valid socket port nr or serial port`);
// }
// let channel: Channel | undefined;
// let br = options.baudrate ?? 115200;
// if (isSerialPort(port)) {
//   // serial connection
//   br = Number(br);
//   if (isNaN(br)) {
//     program.error(
//       `Provided baudrate ${options.baudrate} cannot be converted to a number`,
//     );
//   }
//   channel = new SerialConnection(port, br);
// } else {
//   channel = new ClientSideSocket(portNr, 'localhost');
// }
//   }
