/**
 * The tokenization seam.
 *
 * Writes to a security token are signer-bound: the ATS SDK signs in a browser
 * wallet (MetaMask/WalletConnect) or a KMS — there is no backend raw-key mode
 * (PLAN.md §9c). So `TokenizationWritePort` is implemented by adapters that own
 * a signer:
 *   - ATS adapter  (browser, MetaMask)      ← primary, satisfies the Hedera prize
 *   - HTS adapter  (backend, operator key)  ← fallback (PLAN.md §8)
 * Both sit behind this one interface, so swapping ATS↔HTS is an adapter change.
 *
 * Reads are NOT signer-bound — see `mirror.ts`, which backs `TokenizationReadPort`
 * from the server today.
 */

/** Parameters to issue a tokenized bond. Mirrors ATS `CreateBondRequest`. */
export interface BondIssuanceParams {
  name: string;
  symbol: string;
  isin: string;
  decimals: number;
  /** Settlement currency code the bond is denominated in (e.g. "USD"). */
  currency: string;
  /** Number of bond units to issue. */
  numberOfUnits: string;
  /** Face value per unit. */
  nominalValue: string;
  /** ISO date the bond starts accruing. */
  startingDate: string;
  /** ISO date the bond matures / redeems. */
  maturityDate: string;
  /** Annual coupon rate as a percentage (e.g. 5 = 5%). Omit for zero-coupon. */
  couponRate?: number;
  /** Coupons per year (e.g. 2 = semi-annual). */
  couponFrequency?: number;
  /** Gate transfers on KYC (ERC-3643 style). */
  requireKyc: boolean;
}

/** A submitted on-chain write, to be confirmed via the Mirror Node. */
export interface TxResult {
  /** Hedera transaction id, for HashScan + Mirror confirmation. */
  txId: string;
}

export interface IssueResult extends TxResult {
  /** The newly deployed security token's Hedera id (0.0.x). */
  tokenId: string;
}

/** Signer-bound lifecycle operations. Implemented by the ATS and HTS adapters. */
export interface TokenizationWritePort {
  issueBond(params: BondIssuanceParams): Promise<IssueResult>;
  grantKyc(tokenId: string, accountId: string): Promise<TxResult>;
  transfer(tokenId: string, to: string, amount: string): Promise<TxResult>;
  /** Pro-rata coupon to all holders. Amount is computed off the ledger/NAV, never the LLM. */
  payCoupon(tokenId: string, ratePerUnit: string): Promise<TxResult[]>;
  /** Redeem holdings at maturity (allowance-based per PLAN.md §8). */
  redeem(tokenId: string, accountId: string, amount: string): Promise<TxResult>;
}

/** A holder of the security and their position. */
export interface HolderPosition {
  accountId: string;
  balance: number;
}

/** The security's on-chain snapshot for the UI. */
export interface SecuritySnapshot {
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  treasuryId: string | null;
}

/** Read-only view. Backed by the Mirror Node today (no signer needed). */
export interface TokenizationReadPort {
  getSecurity(tokenId: string): Promise<SecuritySnapshot>;
  getHolders(tokenId: string): Promise<HolderPosition[]>;
}
