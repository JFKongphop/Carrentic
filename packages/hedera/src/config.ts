/**
 * Hedera / ATS environment config for Assetic.
 *
 * Pure module: reads `process.env` with sensible testnet defaults, imports no
 * secrets loader. Scripts that need `.env` call `dotenv/config` themselves.
 * The `oled` ledger is unrelated to this — see PLAN.md §9b/§9c.
 */

export type HederaNetwork = "testnet" | "mainnet" | "previewnet";

const env = (key: string): string | undefined => {
  // Browser-safe: this module is imported by client components (for HashScan
  // links + Mirror reads). `process` may be absent there; the testnet defaults
  // below are the right values for the client anyway.
  if (typeof process === "undefined" || !process.env) return undefined;
  const v = process.env[key];
  return v === undefined || v === "" ? undefined : v;
};

export const NETWORK: HederaNetwork =
  (env("HEDERA_NETWORK") as HederaNetwork | undefined) ?? "testnet";

/** Public REST — safe to call from the server; no signing. */
export const MIRROR_NODE_URL =
  env("HEDERA_MIRROR_URL") ??
  (NETWORK === "mainnet"
    ? "https://mainnet.mirrornode.hedera.com/api/v1"
    : "https://testnet.mirrornode.hedera.com/api/v1");

/** JSON-RPC relay — used by the ATS SDK for contract calls (chain 296 on testnet). */
export const RPC_URL =
  env("HEDERA_RPC_URL") ??
  (NETWORK === "mainnet"
    ? "https://mainnet.hashio.io/api"
    : "https://testnet.hashio.io/api");

/**
 * ATS deployed contracts (Hedera IDs). Env-overridable.
 *
 * Defaults are the pair the ATS web app runs against (its `.env.example`):
 * Factory 0.0.9213391, Resolver/BLR 0.0.9212226. This is the set our bond
 * `configId` (0x…0002) belongs to, so `Bond.create` on the SDK resolves the
 * factory + config as one consistent deployment. (The v4.0.0 release pair
 * 0.0.7708432 / 0.0.7707874 is a *different* deployment whose resolver does not
 * carry that configId — using it deploys the diamond but reverts on config.)
 */
export const ATS_FACTORY_ID = env("ATS_FACTORY_ID") ?? "0.0.9213391";
export const ATS_RESOLVER_ID = env("ATS_RESOLVER_ID") ?? "0.0.9212226";

/** Operator identity (optional — reads never need it; writes are wallet/KMS-signed). */
export const OPERATOR = {
  accountId: env("HEDERA_OPERATOR_ID"),
  evmAddress: env("HEDERA_OPERATOR_EVM"),
} as const;

const HASHSCAN_BASE =
  NETWORK === "mainnet"
    ? "https://hashscan.io/mainnet"
    : "https://hashscan.io/testnet";

/** Build a HashScan link for a token, contract, account, or transaction. */
export const hashscan = {
  token: (id: string) => `${HASHSCAN_BASE}/token/${id}`,
  // ATS bonds are ERC-3643 contracts (diamonds), not HTS tokens.
  contract: (id: string) => `${HASHSCAN_BASE}/contract/${id}`,
  account: (id: string) => `${HASHSCAN_BASE}/account/${id}`,
  tx: (id: string) => `${HASHSCAN_BASE}/transaction/${id}`,
} as const;
