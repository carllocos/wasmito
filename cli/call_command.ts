import { type Command } from 'commander';
import { isFilePath } from '../src/util/file_util';
import { WasmModule } from '../src/webassembly/wasm/wasm_module';
import { WasmValuesBuilder } from '../src/webassembly/wasm_value_array_builder';
import { DeviceManager } from '../src/device/device_manager';
import { createDevPlatform } from '../src/platforms/platformbuilder_factory';
import { TargetLanguage } from '../src/compilers/prog_language_selection';
import { type WasmCompilerArgs } from '../src/compilers/wasm_compiler';
import { isProxyCallFailedRequest } from '../src/runtimes/wasmito_vm/requests/fun_call_request';

export function registerCallRequestCommand(program: Command): void {
  const commandName = 'call';
  program
    .command(`${commandName} <wasmPath> <fid> [args...]`)
    .description('Perform Wasm calls on a module running on the VM')
    // .option('--proxy', 'the call is a proxy call')
    .option('--port <portnr>', 'the port number of an already deployed vm')
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

      let toolPort;
      const connectToExistingVM = options.port !== undefined;
      if (connectToExistingVM) {
        toolPort = Number(options.port);
        if (isNaN(toolPort)) {
          program.error(`given an invalid port number`);
        }
      }

      const platform = await createDevPlatform({
        selectedLanguage: {
          targetLanguage: TargetLanguage.Wasm,
        },
        vmConfig: {
          disableStrictModuleLoad: true,
          toolPort,
        },
      });
      const compilationArgs: WasmCompilerArgs = {
        wasmPath,
      };

      const timeout = 60 * 1000;
      const deviceManager = new DeviceManager();
      const vm = connectToExistingVM
        ? await deviceManager.connectToExistingDevVM(
            platform,
            compilationArgs,
            timeout,
          )
        : await deviceManager.spawnDevelopmentVM(
            platform,
            compilationArgs,
            timeout,
          );

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
