/**
 * Fund NAV, marked to market via Uniswap.
 *
 * A tokenized bond fund holds collateral (crypto) + cash against its issued
 * shares. NAV per share = (live value of holdings + cash) / shares. Uniswap
 * supplies the live value, so NAV moves with the market — the "smart valuation"
 * that makes the bond more than a static face value.
 */

import type { TokenRef } from "./config";
import { priceUsd } from "./quote";

/** A crypto holding in the fund's collateral pool. */
export interface Holding {
  token: TokenRef;
  /** Whole-token amount (e.g. 12.5 WETH). */
  amount: number;
}

export interface Portfolio {
  holdings: Holding[];
  /** Cash / stable reserves in USD. */
  cashUsd: number;
  /** Shares (bond units) outstanding. */
  shares: number;
}

/** Per-holding mark. */
export interface Mark {
  symbol: string;
  amount: number;
  priceUsd: number;
  valueUsd: number;
}

export interface Nav {
  marks: Mark[];
  cashUsd: number;
  totalUsd: number;
  shares: number;
  /** NAV per share (bond unit). */
  navPerShare: number;
  asOf: string;
}

/** Compute NAV for a portfolio, pricing every holding via Uniswap. */
export const computeNav = async (portfolio: Portfolio): Promise<Nav> => {
  const marks: Mark[] = await Promise.all(
    portfolio.holdings.map(async (h) => {
      const price = await priceUsd(h.token);
      return {
        symbol: h.token.symbol,
        amount: h.amount,
        priceUsd: price,
        valueUsd: price * h.amount,
      };
    }),
  );

  const holdingsUsd = marks.reduce((sum, m) => sum + m.valueUsd, 0);
  const totalUsd = holdingsUsd + portfolio.cashUsd;

  return {
    marks,
    cashUsd: portfolio.cashUsd,
    totalUsd,
    shares: portfolio.shares,
    navPerShare: portfolio.shares > 0 ? totalUsd / portfolio.shares : 0,
    asOf: new Date().toISOString(),
  };
};
