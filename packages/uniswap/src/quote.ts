/**
 * Uniswap Trading API quote client — the pricing oracle.
 *
 * A quote for `amountIn` of `tokenIn` → `tokenOut` is a live, liquidity-weighted
 * price straight from Uniswap's routing. We use it to mark the fund's holdings
 * to market (see `nav.ts`). Read-only: quotes don't sign or execute anything.
 */

import {
  CHAIN_ID,
  TOKENS,
  UNISWAP_API_BASE,
  UNISWAP_API_KEY,
  type TokenRef,
} from "./config";

export class UniswapError extends Error {
  constructor(
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "UniswapError";
  }
}

const ZERO = "0x0000000000000000000000000000000000000000";

interface QuoteResponse {
  quote: { output: { amount: string } };
}

/** Raw EXACT_INPUT quote: how much `tokenOut` you get for `amountIn` of `tokenIn`. */
export const getQuote = async (
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
): Promise<bigint> => {
  if (!UNISWAP_API_KEY) throw new UniswapError("UNISWAP_API_KEY not set");
  const res = await fetch(`${UNISWAP_API_BASE}/quote`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": UNISWAP_API_KEY },
    body: JSON.stringify({
      type: "EXACT_INPUT",
      amount: amountIn,
      tokenInChainId: CHAIN_ID,
      tokenOutChainId: CHAIN_ID,
      tokenIn,
      tokenOut,
      swapper: ZERO,
      routingPreference: "BEST_PRICE",
    }),
  });
  const json = (await res.json()) as QuoteResponse & { detail?: string };
  if (!res.ok || !json.quote) {
    throw new UniswapError(`Uniswap quote ${res.status}`, json.detail);
  }
  return BigInt(json.quote.output.amount);
};

const pow10 = (n: number) => 10n ** BigInt(n);

/**
 * Price of one whole `token` in USD, via a token→USDC quote. Returns a JS number
 * (fine for display/NAV; not for settlement math).
 */
export const priceUsd = async (token: TokenRef): Promise<number> => {
  if (token.address.toLowerCase() === TOKENS.USDC.address.toLowerCase()) return 1;
  const out = await getQuote(
    token.address,
    TOKENS.USDC.address,
    pow10(token.decimals).toString(), // one whole token
  );
  return Number(out) / Number(pow10(TOKENS.USDC.decimals));
};

/** A Uniswap-routed conversion of rent (held as WETH) into USDC for payout. */
export interface RentSwap {
  tokenIn: string;
  tokenOut: string;
  amountInWeth: number;
  usdcOut: number;
  rateUsdPerWeth: number;
}

/**
 * Quote the rent-payout swap: converting `usdAmount` of accrued rent (held in the
 * treasury as WETH) into USDC to distribute to owners, routed live through the
 * Uniswap Trading API. Returns the WETH sold, USDC received, and the live rate.
 */
export const quoteRentPayout = async (usdAmount: number): Promise<RentSwap> => {
  const rateUsdPerWeth = await priceUsd(TOKENS.WETH);
  const amountInWeth = usdAmount / rateUsdPerWeth;
  // Build the base-unit amount without overflowing a JS number (WETH has 18 dp).
  const amountInBase =
    BigInt(Math.round(amountInWeth * 1e9)) *
    pow10(TOKENS.WETH.decimals - 9);
  const outBase = await getQuote(
    TOKENS.WETH.address,
    TOKENS.USDC.address,
    amountInBase.toString(),
  );
  const usdcOut = Number(outBase) / Number(pow10(TOKENS.USDC.decimals));
  return { tokenIn: "WETH", tokenOut: "USDC", amountInWeth, usdcOut, rateUsdPerWeth };
};
