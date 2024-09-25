import { TestingAppChain } from "@proto-kit/sdk";
import { method, PrivateKey } from "o1js";
import { Balances } from "../../../src/runtime/modules/balances";
import { log } from "@proto-kit/common";
import { BalancesKey, TokenId, UInt64 } from "@proto-kit/library";

log.setLevel("ERROR");

describe("balances", () => {
  it("should demonstrate how balances work", async () => {
    const appChain = TestingAppChain.fromRuntime({
      Balances,
    });

    appChain.configurePartial({
      Runtime: {
        Balances: {
          totalSupply: UInt64.from(10000),
        },
      },
    });

    await appChain.start();

    const alicePrivateKey = PrivateKey.random();
    const alice = alicePrivateKey.toPublicKey();
    const tokenId = TokenId.from(0);

    appChain.setSigner(alicePrivateKey);

    const balances = appChain.runtime.resolve("Balances");

    const tx1 = await appChain.transaction(alice, async () => {
      await balances.addBalance(tokenId, alice, UInt64.from(1000));
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();

    const key = new BalancesKey({ tokenId, address: alice });
    const balance = await appChain.query.runtime.Balances.balances.get(key);

    expect(block?.transactions[0].status.toBoolean()).toBe(true);
    expect(balance?.toBigInt()).toBe(1000n);
  }, 1_000_000);
});

describe("balances_update", () => {
  it("should demonstrate how updateBalance() works", async () => {
    const appChain = TestingAppChain.fromRuntime({
      Balances,
    });

    appChain.configurePartial({
      Runtime: {
        Balances: {
          totalSupply: UInt64.from(10000),
        },
      },
    });

    await appChain.start();

    const alicePrivateKey = PrivateKey.random();
    const alice = alicePrivateKey.toPublicKey();

    const poolPrivateKey = PrivateKey.random();
    const poolPublicKey = poolPrivateKey.toPublicKey();

    const tokenId = TokenId.from(0);

    appChain.setSigner(alicePrivateKey);

    const balances = appChain.runtime.resolve("Balances");

    // initialize balances
    const tx1 = await appChain.transaction(alice, async () => {
      await balances.addBalance(tokenId, alice, UInt64.from(1000));
    });
    await tx1.sign();
    await tx1.send();
    const block1 = await appChain.produceBlock();
    expect(block1?.transactions[0].status.toBoolean()).toBe(true);

    const tx2 = await appChain.transaction(alice, async () => {
      await balances.addBalance(tokenId, poolPublicKey, UInt64.from(1000));
    });
    await tx2.sign();
    await tx2.send();
    const block2 = await appChain.produceBlock();
    expect(block2?.transactions[0].status.toBoolean()).toBe(true);

    const key1 = new BalancesKey({ tokenId, address: alice });
    const key2 = new BalancesKey({ tokenId, address: poolPublicKey });

    const balance1 = await appChain.query.runtime.Balances.balances.get(key1);
    const balance2 = await appChain.query.runtime.Balances.balances.get(key2);
    expect(balance1?.toBigInt()).toBe(1000n);
    expect(balance2?.toBigInt()).toBe(1000n);

    // update (top up) - FAILS!
    const tx3 = await appChain.transaction(alice, async () => {
      await balances.updateBalance(tokenId, alice, poolPublicKey, UInt64.from(1500));
    });
    await tx3.sign();
    await tx3.send();
    const block3 = await appChain.produceBlock();
    expect(block3?.transactions[0].status.toBoolean()).toBe(true);

    // update (withdraw) - also FAILS!
    const tx4 = await appChain.transaction(alice, async () => {
      await balances.updateBalance(tokenId, alice, poolPublicKey, UInt64.from(500));
    });
    await tx4.sign();
    await tx4.send();
    const block4 = await appChain.produceBlock();
    expect(block4?.transactions[0].status.toBoolean()).toBe(true);

    // update with the same value - this works
    const tx5 = await appChain.transaction(alice, async () => {
      await balances.updateBalance(tokenId, alice, poolPublicKey, UInt64.from(1000));
    });
    await tx5.sign();
    await tx5.send();
    const block5 = await appChain.produceBlock();
    expect(block5?.transactions[0].status.toBoolean()).toBe(true);

  }, 1_000_000);
});