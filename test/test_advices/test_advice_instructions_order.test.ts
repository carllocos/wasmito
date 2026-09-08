import { expect } from 'chai';
import { AdvicesRegistery } from '../../src/tool_api/util/advices_registery';
import { HookOnWasmAddrMoment } from '../../src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request';

describe('Test order advices Instructions (registery)', function () {
  const hookedAddr = 42; // e.g. address of the Block that is the loop's first instruction
  const loopAddr = 10; // address reported for the redirected (Loop) advice

  it('orders a redirected advice before a direct advice registered on the same hooked address, when the direct advice was registered first', () => {
    const registery = new AdvicesRegistery();
    const blockCb = () => {};
    const loopCb = () => {};

    // Direct advice on the Block registered first...
    registery.storeInstructionAdvice(
      HookOnWasmAddrMoment.HookBefore,
      hookedAddr,
      blockCb,
      false,
      hookedAddr,
    );

    registery.storeInstructionAdvice(
      HookOnWasmAddrMoment.HookBefore,
      hookedAddr,
      loopCb,
      false,
      loopAddr,
    );

    const advices = registery.getAdvices(
      HookOnWasmAddrMoment.HookBefore,
      hookedAddr,
    );
    expect(advices.length).equal(2);
    expect(advices[0][0]).equal(loopCb);
    expect(advices[0][2]).equal(loopAddr);
    expect(advices[1][0]).equal(blockCb);
    expect(advices[1][2]).equal(hookedAddr);
  });

  it('keeps the redirected advice first when it was registered before the direct advice', () => {
    const registery = new AdvicesRegistery();
    const blockCb = () => {};
    const loopCb = () => {};

    registery.storeInstructionAdvice(
      HookOnWasmAddrMoment.HookBefore,
      hookedAddr,
      loopCb,
      false,
      loopAddr,
    );
    registery.storeInstructionAdvice(
      HookOnWasmAddrMoment.HookBefore,
      hookedAddr,
      blockCb,
      false,
      hookedAddr,
    );

    const advices = registery.getAdvices(
      HookOnWasmAddrMoment.HookBefore,
      hookedAddr,
    );
    expect(advices.length).equal(2);
    expect(advices[0][0]).equal(loopCb);
    expect(advices[1][0]).equal(blockCb);
  });

  it('preserves registration order among multiple direct advices, all placed after the redirected advice', () => {
    const registery = new AdvicesRegistery();
    const blockCb1 = () => {};
    const blockCb2 = () => {};
    const loopCb = () => {};

    registery.storeInstructionAdvice(
      HookOnWasmAddrMoment.HookBefore,
      hookedAddr,
      blockCb1,
      false,
      hookedAddr,
    );
    registery.storeInstructionAdvice(
      HookOnWasmAddrMoment.HookBefore,
      hookedAddr,
      loopCb,
      false,
      loopAddr,
    );
    registery.storeInstructionAdvice(
      HookOnWasmAddrMoment.HookBefore,
      hookedAddr,
      blockCb2,
      false,
      hookedAddr,
    );

    const advices = registery.getAdvices(
      HookOnWasmAddrMoment.HookBefore,
      hookedAddr,
    );
    expect(advices.length).equal(3);
    expect(advices[0][0]).equal(loopCb);
    expect(advices[1][0]).equal(blockCb1);
    expect(advices[2][0]).equal(blockCb2);
  });

  it('does not reorder advices registered on unrelated addresses', () => {
    const registery = new AdvicesRegistery();
    const otherAddr = 99;
    const cbA = () => {};
    const cbB = () => {};

    registery.storeInstructionAdvice(
      HookOnWasmAddrMoment.HookBefore,
      hookedAddr,
      cbA,
      false,
      hookedAddr,
    );
    registery.storeInstructionAdvice(
      HookOnWasmAddrMoment.HookBefore,
      otherAddr,
      cbB,
      false,
      otherAddr,
    );

    const advicesA = registery.getAdvices(
      HookOnWasmAddrMoment.HookBefore,
      hookedAddr,
    );
    const advicesB = registery.getAdvices(
      HookOnWasmAddrMoment.HookBefore,
      otherAddr,
    );
    expect(advicesA.length).equal(1);
    expect(advicesA[0][0]).equal(cbA);
    expect(advicesB.length).equal(1);
    expect(advicesB[0][0]).equal(cbB);
  });
});
