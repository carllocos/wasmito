import { parseDeviceConfig, DeviceMode } from '../device/device_config';
import { type EmulateDevice } from '../device/device_emulated';
import { DeviceManager } from '../device/device_manager';
import { getGlobalLogger } from '../logger/logger';
import { WASM } from '../state/wasm';
import { newTimeStamp } from '../instrumentor/timestamp';
import {
  ScheduleAfterTimeStamp,
  ScheduleBeforeTimeStamp,
} from '../instrumentor/schedule';
import {
  EmptyValueSubstitution,
  InspectState,
  ValueSubstitution,
  type WasmState,
} from '../instrumentor/action';
import {
  AroundFunctionRequest,
  isSuccessfulReply,
} from '../warduino/requests/around_function_request';
import { MontiroWasmAddrRequest } from '../warduino/requests/monitor_request';
import { StateRequest } from '../warduino/requests/inspect_request';

const dm = new DeviceManager();

export async function instrumentBlinkWasm(em: EmulateDevice): Promise<boolean> {
  // (import "env" "chip_delay" (func $env.chip_delay (type $int32->void)))
  // (import "env" "chip_pin_mode" (func $env.chip_pin_mode (type $int32->int32->void)))
  // (import "env" "chip_digital_write" (func $env.chip_digital_write (type $int32->int32->void)))

  const chipDelayIdx = 0;
  const requestChipDelay = new AroundFunctionRequest(chipDelayIdx);

  const chipPinMode = 1;
  const requestChipPinMode = new AroundFunctionRequest(chipPinMode);

  const chipDigitalWrite = 2;
  const requestChipDigWrite = new AroundFunctionRequest(chipDigitalWrite);
  const requests: AroundFunctionRequest[] = [
    requestChipDelay,
    requestChipPinMode,
    requestChipDigWrite,
  ];
  requests.forEach((req) => {
    req.addAction(new EmptyValueSubstitution());
  });
  const replies = await Promise.all(
    requests.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  let allSucess = true;
  replies.forEach((reply) => {
    getGlobalLogger().debug(
      `Got reply interrupt=${reply.interrupt} responseType=${reply.responseType} error_code?=${reply.error_code}`,
    );
    allSucess = allSucess && isSuccessfulReply(reply);
  });
  return allSucess;
}

export async function instrumentTempWasm(em: EmulateDevice): Promise<boolean> {
  // (import "env" "chip_delay" (func $env.chip_delay (type $i32->void)))
  // (import "env" "chip_pin_mode" (func $env.chip_pin_mode (type $i32->i32->void)))
  // (import "env" "subscribe_interrupt" (func $env.subscribe_interrupt (type $i32->i32->i32->void)))
  // (import "env" "chip_ledc_setup" (func $env.chip_ledc_setup (type $i32->i32->i32->void)))
  // (import "env" "chip_ledc_attach_pin" (func $env.chip_ledc_attach_pin (type $i32->i32->void)))
  // (import "env" "chip_analog_write" (func $env.chip_analog_write (type $i32->i32->void)))
  // (import "env" "temperature"            (func $env.get_temperature     (type $void->f32)))

  const chipLedCSetup = 3;
  const emptyAction0 = new EmptyValueSubstitution().scheduleFor(
    new ScheduleBeforeTimeStamp(newTimeStamp(30, 0)),
  );
  const requestChipLedCSteup = new AroundFunctionRequest(
    chipLedCSetup,
  ).addAction(emptyAction0);

  const attachPinID = 4;

  const emptyAction = new EmptyValueSubstitution().scheduleFor(
    new ScheduleAfterTimeStamp(newTimeStamp(3, 0)),
  );
  const requestAttachPin = new AroundFunctionRequest(attachPinID).addAction(
    emptyAction,
  );

  const analogWriteID = 5;

  const emptyAction2 = new EmptyValueSubstitution().scheduleFor(
    new ScheduleAfterTimeStamp(newTimeStamp(23, 54)),
  );
  const requestAnalogWrite = new AroundFunctionRequest(analogWriteID).addAction(
    emptyAction2,
  );

  const tempID = 6;
  const value: WASM.Value = {
    type: WASM.Type.f32,
    value: 23.0004,
  };
  const requestTemp = new AroundFunctionRequest(tempID).addAction(
    new ValueSubstitution(value),
  );

  const requests = [
    requestTemp,
    requestAttachPin,
    requestAnalogWrite,
    requestChipLedCSteup,
  ];
  const replies = await Promise.all(
    requests.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  let allSucess = true;
  replies.forEach((reply) => {
    getGlobalLogger().debug(
      `Got reply interrupt=${reply.interrupt} responseType=${reply.responseType} error_code?=${reply.error_code}`,
    );
    allSucess = allSucess && isSuccessfulReply(reply);
  });

  return allSucess;
}

export async function instrumentPrimitiveAlways(
  em: EmulateDevice,
): Promise<boolean> {
  const chipLedCSetup = 3;
  const emptyAction0 = new EmptyValueSubstitution();
  const requestChipLedCSteup = new AroundFunctionRequest(
    chipLedCSetup,
  ).addAction(emptyAction0);

  const attachPinID = 4;

  const emptyAction = new EmptyValueSubstitution();
  const requestAttachPin = new AroundFunctionRequest(attachPinID).addAction(
    emptyAction,
  );

  const analogWriteID = 5;

  const emptyAction2 = new EmptyValueSubstitution();
  const requestAnalogWrite = new AroundFunctionRequest(analogWriteID).addAction(
    emptyAction2,
  );

  const tempID = 6;
  const value: WASM.Value = {
    type: WASM.Type.f32,
    value: 23.0004,
  };
  const requestTemp = new AroundFunctionRequest(tempID).addAction(
    new ValueSubstitution(value),
  );

  const requests = [
    requestTemp,
    requestAttachPin,
    requestAnalogWrite,
    requestChipLedCSteup,
  ];
  const replies = await Promise.all(
    requests.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  let allSucess = true;
  replies.forEach((reply) => {
    getGlobalLogger().debug(
      `Got reply interrupt=${reply.interrupt} responseType=${reply.responseType} error_code?=${reply.error_code}`,
    );
    allSucess = allSucess && isSuccessfulReply(reply);
  });
  return true;
}

export function onMonitoredState(d: WasmState): void {
  const vals = d.stack ?? [];
  const s = vals
    .map((v) => {
      return `{"idx":${v.idx},"type":${v.type},"value":${v.value}}`;
    })
    .join(', ');
  getGlobalLogger().info(`addr=${d.pc} stack=[${s}]`);
}

export async function instrumentForMonitor(
  em: EmulateDevice,
): Promise<boolean> {
  if (!(await instrumentPrimitiveAlways(em))) {
    return false;
  }
  const funcAddresses = [344, 269, 275, 348, 339, 356, 358, 360];
  const stateRequest = new StateRequest();
  stateRequest.includeStack().includeGlobals().includePC();
  const requestsBefore = funcAddresses.map((addr) => {
    const inspectAction = new InspectState(stateRequest, addr);
    inspectAction.onSubscriptionData = onMonitoredState;
    return new MontiroWasmAddrRequest(addr).before().addAction(inspectAction);
  });
  const repliesBefore = await Promise.all(
    requestsBefore.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  repliesBefore.forEach((reply) => {
    getGlobalLogger().debug(
      `Got reply interrupt=${reply.interrupt} responseType=${reply.responseType} error_code?=${reply.error_code}`,
    );
  });
  return true;
}

export async function createEmulator(
  wasmApp: string,
): Promise<EmulateDevice | undefined> {
  const dc = parseDeviceConfig({
    program: wasmApp,
    mode: DeviceMode.Emulate,
    port: '8300',
    id: '1',
    name: 'emulator',
  });
  if (dc !== undefined) {
    const em = await dm.connectToExitingEmulator(dc, 8000);
    // const em = await dm.spawnEmulator(dc, 8000);
    // const success = await instrumentTempWasm(em);
    const success = await instrumentForMonitor(em);

    if (success) {
      await em.run();
    }
    return em;
  }
}

const dimApp =
  '/home/carllocos/Projects/WARDuino-fork/examples/wat/main/dim-using-temperature.wasm';
// const blinkApp =
//   '/home/carllocos/Projects/WARDuino-fork/examples/wat/main/blink.wasm';
createEmulator(dimApp)
  .then((_) => {})
  .catch(console.error);
