/**
 * Uniswap Trading API config + the reference tokens we price against.
 * Pure module: reads `process.env` with defaults; scripts load `.env` themselves.
 */

const env = (key: string): string | undefined => {
  if (typeof process === "undefined" || !process.env) return undefined;
  const v = process.env[key];
  return v === undefined || v === "" ? undefined : v;
};

/** Uniswap Trading API. Auth via the `x-api-key` header. */
export const UNISWAP_API_BASE =
  env("UNISWAP_API_BASE") ?? "https://trade-api.gateway.uniswap.org/v1";
export const UNISWAP_API_KEY = env("UNISWAP_API_KEY") ?? "";

/** Ethereum mainnet — where the deepest Uniswap liquidity (and real prices) live. */
export const CHAIN_ID = Number(env("UNISWAP_CHAIN_ID") ?? "1");

export interface TokenRef {
  symbol: string;
  address: string;
  decimals: number;
}

/** Reference tokens for pricing. USDC is the USD unit of account. */
export const TOKENS = {
  USDC: {
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
  },
  WETH: {
    symbol: "WETH",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
  },
  WBTC: {
    symbol: "WBTC",
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
  },
} as const satisfies Record<string, TokenRef>;
