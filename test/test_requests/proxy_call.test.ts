import { DeviceManager } from '../../src/device/device_manager';
import { type OutOfPlaceVM } from '../../src/warduino/vm/outofplace_vm';
import { expect } from 'chai';
import { MockVM } from '../shared/mock_vm';
import { type MockChannel } from '../shared/mock_channel';
import {
  ProxyCallRequest,
  isProxyCallSuccessfulResponse,
} from '../../src/warduino/requests/fun_call_request';
import { WasmValuesBuilder } from '../shared/wasm_state_builder';
import { timeoutPromise } from '../../src/util/promise_util';

/*
 * TODO: The tests prefixed with `integration:` are integration tests and therefore may need a different framework
 */

async function checkIfMessageReceived(
  expectedData: string,
  vm: OutOfPlaceVM,
  mockChannel: MockChannel,
  runVM?: boolean,
): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    mockChannel.addMockWriteMethod((dataWrittenToTargetVM: any): boolean => {
      const requestData = dataWrittenToTargetVM.toString();
      if (expectedData === requestData) {
        resolve(true);
      }
      return true;
    });
    if (runVM === undefined || runVM) {
      vm.run()
        .then((running) => {
          if (!running) {
            resolve(false);
          }
        })
        .catch((err: any) => {
          reject(err);
        });
    }
  });
}

describe('Intergation Test: Proxy Calls to a Mocked Target VM produces the right payloads', () => {
  it('Proxy Call a primitive function with 3 arguments', async () => {
    const deviceManager = new DeviceManager();
    const targetVM = new MockVM();
    const program = './test/data/test-example-proxy-call.wat';
    const uploaded = await targetVM.uploadSourceCode(program);
    expect(uploaded).to.be.equal(true);

    await targetVM.mockSnapshot('./test/data/proxy-call-snapshot-1.json');
    const proxyVM = await deviceManager.spawnOutOfPlaceVM(targetVM, 8000);
    const chipPinModeID = 1;
    const argsLine39 = new WasmValuesBuilder().addI32Value(39).addI32Value(5);
    const proxyCallLine39 = new ProxyCallRequest(
      chipPinModeID,
      argsLine39.values,
    );
    const proxyCallOfLine39RequestReceived = await timeoutPromise(
      checkIfMessageReceived(
        proxyCallLine39.encodeRemoteCallRequest(),
        proxyVM,
        targetVM.mockChannel,
      ),
      3000,
    );
    expect(proxyCallOfLine39RequestReceived).to.be.equal(true);

    const responseToRequest = '41010100\n';
    targetVM.mockChannel.mockOnData(responseToRequest);

    // After replying to proxy call the VM should continue the computation which will lead to the next proxyCall
    const subscribeInterruptID = 2;
    const argsLine44 = new WasmValuesBuilder()
      .addI32Value(39)
      .addI32Value(1)
      .addI32Value(2);
    const proxyCallLine44 = new ProxyCallRequest(
      subscribeInterruptID,
      argsLine44.values,
    );

    const proxyCallOfLine44RequestReceived = await timeoutPromise(
      checkIfMessageReceived(
        proxyCallLine44.encodeRemoteCallRequest(),
        proxyVM,
        targetVM.mockChannel,
      ),
      3000,
    );
    expect(proxyCallOfLine44RequestReceived).to.be.equal(true);
    const closed = await deviceManager.closeVM(proxyVM, 3000);
    expect(closed).to.be.equal(true);
  });

  it.skip('Proxy Call a primitive function with no arguments', () => {});
  it.skip('Proxy Call a non-primitive function that does not exist', async () => {});
  it.skip('Proxy Call a function that takes no arguments', async () => {});
  it.skip('Proxy Call a function that takes 3 arguments', async () => {});
});

describe('Intergation Test: Proxy Call handled by a target VM produces expected responses', () => {
  it('Respond to a Proxy Call of a function that does not return a value', async () => {
    const program = './test/data/test-example-proxy-call.wat';
    const deviceManager = new DeviceManager();
    const vm = await deviceManager.spawnDevelopmentVM(
      {
        program,
        disableStrictModuleLoad: true,
      },
      3000,
    );

    const chipPinModeID = 1;
    const args = new WasmValuesBuilder().addI32Value(39).addI32Value(5);
    const reply = await vm.proxyCall(chipPinModeID, args.values, 3000);
    expect(isProxyCallSuccessfulResponse(reply)).to.equal(true);
    const closed = await deviceManager.closeVM(vm, 3000);
    expect(closed).to.be.equal(true);
  });

  it.skip('Respond to a Proxy Call of a function that produces one return value', async () => {});
  it.skip('Respond to a Proxy Call of a function that produces an exception', async () => {});
  it.skip('Respond to a Proxy Call of a function that produces an exception', async () => {});
});
