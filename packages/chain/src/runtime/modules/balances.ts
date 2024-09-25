import { runtimeModule, state, runtimeMethod } from "@proto-kit/module";
import { State, assert } from "@proto-kit/protocol";
import { Balance, Balances as BaseBalances, TokenId, UInt64} from "@proto-kit/library";
import { Provable, PublicKey } from "o1js";

interface BalancesConfig {
  totalSupply: Balance;
}

@runtimeModule()
export class Balances extends BaseBalances<BalancesConfig> {
  @state() public circulatingSupply = State.from<Balance>(Balance);

  @runtimeMethod()
  public async addBalance(
    tokenId: TokenId,
    address: PublicKey,
    amount: Balance
  ): Promise<void> {
    const circulatingSupply = await this.circulatingSupply.get();
    const newCirculatingSupply = Balance.from(circulatingSupply.value).add(
      amount
    );
    assert(
      newCirculatingSupply.lessThanOrEqual(this.config.totalSupply),
      "Circulating supply would be higher than total supply"
    );
    await this.circulatingSupply.set(newCirculatingSupply);
    await this.mint(tokenId, address, amount);
  }

  @runtimeMethod()
  public async updateBalance(
    tokenId: TokenId,
    address: PublicKey,
    addressPool: PublicKey,
    amount: Balance
  ): Promise<void> {
    assert(amount.greaterThan(Balance.zero), "Amount must be greater than zero");

    const currBalance = await this.getBalance(tokenId, address);
    const condition = amount.greaterThan(currBalance);
    const diff = Provable.if(
      condition,
      Balance,
      amount.sub(currBalance),
      currBalance.sub(amount)
    );
    const to = Provable.if(
      condition,
      PublicKey,
      address,
      addressPool
    );
    const from = Provable.if(
      condition,
      PublicKey,
      addressPool,
      address
    );
    const d = UInt64.Unsafe.fromField(diff.value);
    await this.transfer(tokenId, from, to, d);
  }
}
