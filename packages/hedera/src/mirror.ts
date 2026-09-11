/**
 * Hedera Mirror Node REST client — read-only, server-safe.
 *
 * Mirror Node is the confirmation authority (PLAN.md §8): reads on-chain state
 * without any signing. Used to render the security, the holder register, and to
 * confirm writes after the wallet/KMS submits them.
 */

import { MIRROR_NODE_URL } from "./config";

export class MirrorError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = "MirrorError";
  }
}

const get = async <T>(path: string): Promise<T> => {
  const url = `${MIRROR_NODE_URL}${path}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new MirrorError(
      `Mirror ${res.status} for ${path}`,
      res.status,
      path,
    );
  }
  return (await res.json()) as T;
};

export interface TokenInfo {
  token_id: string;
  name: string;
  symbol: string;
  decimals: string;
  total_supply: string;
  treasury_account_id: string | null;
  type: string;
  created_timestamp: string;
  memo: string;
}

/** GET /tokens/{id} — the token's on-chain metadata. */
export const getTokenInfo = (tokenId: string): Promise<TokenInfo> =>
  get<TokenInfo>(`/tokens/${tokenId}`);

export interface TokenBalance {
  account: string;
  balance: number;
  decimals: number;
}

interface TokenBalancesResponse {
  balances: TokenBalance[];
  links: { next: string | null };
}

/**
 * GET /tokens/{id}/balances — the holder register: every account holding the
 * token and how much. Follows pagination to return all holders.
 */
export const getTokenHolders = async (
  tokenId: string,
): Promise<TokenBalance[]> => {
  const holders: TokenBalance[] = [];
  let path: string | null = `/tokens/${tokenId}/balances?limit=100`;
  while (path !== null) {
    const page: TokenBalancesResponse = await get<TokenBalancesResponse>(path);
    holders.push(...page.balances);
    // Mirror returns `next` already prefixed with /api/v1; strip our base's tail.
    path = page.links.next
      ? page.links.next.replace("/api/v1", "")
      : null;
  }
  return holders;
};

export interface AccountTokenRelation {
  token_id: string;
  balance: number;
  kyc_status: string;
  freeze_status: string;
}

interface AccountTokensResponse {
  tokens: AccountTokenRelation[];
}

/** GET /accounts/{id}/tokens — an account's token relations (balance + KYC/freeze). */
export const getAccountTokens = async (
  accountId: string,
): Promise<AccountTokenRelation[]> =>
  (await get<AccountTokensResponse>(`/accounts/${accountId}/tokens?limit=100`))
    .tokens;

export interface AccountInfo {
  account: string;
  evm_address: string | null;
  balance: { balance: number; timestamp: string };
}

/** GET /accounts/{id} — account existence + hbar balance + EVM address. */
export const getAccount = (accountId: string): Promise<AccountInfo> =>
  get<AccountInfo>(`/accounts/${accountId}`);
