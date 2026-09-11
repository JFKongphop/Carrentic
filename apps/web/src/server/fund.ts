import "server-only";

import {
  DEMO_FUND,
  getFundSnapshot,
  type FundSnapshot,
} from "@openledger-cfo/fund";
import { TOKENS } from "@openledger-cfo/uniswap";

/** The demo fund's live collateral pool, priced via Uniswap. */
const FUND_CONFIG = {
  ...DEMO_FUND,
  portfolio: {
    ...DEMO_FUND.portfolio,
    holdings: [
      { token: TOKENS.WETH, amount: 300 },
      { token: TOKENS.WBTC, amount: 5 },
    ],
  },
};

export type LoadFund =
  | { ok: true; value: FundSnapshot }
  | { ok: false; error: string };

/** Read the whole fund per request: on-chain bond + holders + live NAV. */
export const loadFund = async (): Promise<LoadFund> => {
  try {
    return { ok: true, value: await getFundSnapshot(FUND_CONFIG) };
  } catch (cause) {
    return {
      ok: false,
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
};

export const HASHSCAN_TOKEN = (id: string) =>
  `https://hashscan.io/testnet/token/${id}`;
export const HASHSCAN_CONTRACT = (id: string) =>
  `https://hashscan.io/testnet/contract/${id}`;

/**
 * A NAV-per-unit series for the sparkline/trajectory. We don't persist NAV
 * history yet, so we synthesize a gentle path from par up to the live NAV — the
 * shape reads true (collateral drifting up to today's mark). Replace with stored
 * snapshots once we record them.
 */
export const synthNavSeries = (
  currentNav: number,
  par: number,
  months = 12,
): { x: string; y: number }[] => {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const t = i / (months - 1); // 0 → 1
    // ease from par to current NAV with a little wobble so it isn't a ruler.
    const wobble = Math.sin(i * 1.3) * (currentNav - par) * 0.04;
    const y = par + (currentNav - par) * (t * t) + (i === months - 1 ? 0 : wobble);
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { x: d.toISOString().slice(0, 10), y: Math.max(0, y) };
  });
};
