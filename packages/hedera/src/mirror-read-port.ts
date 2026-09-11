/**
 * `TokenizationReadPort` backed by the Mirror Node. Available on the server
 * today — reads need no signer. Both the ATS and HTS write-adapters can share
 * this same read view.
 */

import { getTokenHolders, getTokenInfo } from "./mirror";
import type {
  HolderPosition,
  SecuritySnapshot,
  TokenizationReadPort,
} from "./port";

export const mirrorReadPort: TokenizationReadPort = {
  async getSecurity(tokenId: string): Promise<SecuritySnapshot> {
    const info = await getTokenInfo(tokenId);
    return {
      tokenId: info.token_id,
      name: info.name,
      symbol: info.symbol,
      decimals: Number(info.decimals),
      totalSupply: info.total_supply,
      treasuryId: info.treasury_account_id,
    };
  },

  async getHolders(tokenId: string): Promise<HolderPosition[]> {
    const balances = await getTokenHolders(tokenId);
    return balances
      .filter((b) => b.balance > 0)
      .map((b) => ({ accountId: b.account, balance: b.balance }));
  },
};
