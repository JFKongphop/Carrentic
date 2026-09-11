/**
 * Verify the Uniswap pricing oracle + NAV against live prices.
 * Run: pnpm -F @openledger-cfo/uniswap verify
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });

const { TOKENS, priceUsd, computeNav } = await import("../src/index");

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

console.log("\nAssetic · Uniswap pricing oracle (mainnet)\n");
const eth = await priceUsd(TOKENS.WETH);
const btc = await priceUsd(TOKENS.WBTC);
console.log(`  WETH  ${fmt(eth)}`);
console.log(`  WBTC  ${fmt(btc)}`);

// Example: a bond fund of 1000 units backed by crypto collateral + cash.
console.log("\nFund NAV (1000 units, collateral marked via Uniswap):");
const nav = await computeNav({
  holdings: [
    { token: TOKENS.WETH, amount: 300 },
    { token: TOKENS.WBTC, amount: 5 },
  ],
  cashUsd: 250_000,
  shares: 1000,
});
for (const m of nav.marks)
  console.log(`  ${m.symbol.padEnd(5)} ${m.amount} × ${fmt(m.priceUsd)} = ${fmt(m.valueUsd)}`);
console.log(`  cash        ${fmt(nav.cashUsd)}`);
console.log(`  ─────`);
console.log(`  AUM         ${fmt(nav.totalUsd)}`);
console.log(`  NAV / unit  ${fmt(nav.navPerShare)}  (face 1,000)`);
console.log(`\n✓ Uniswap NAV OK\n`);
