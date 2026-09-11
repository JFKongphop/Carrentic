import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });

const { rebalance, redeem, DEMO_FUND } = await import("../src/index");
const { TOKENS } = await import("@openledger-cfo/uniswap");

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const fund = {
  ...DEMO_FUND,
  portfolio: {
    ...DEMO_FUND.portfolio,
    holdings: [
      { token: TOKENS.WETH, amount: 300 },
      { token: TOKENS.WBTC, amount: 5 },
    ],
  },
};

console.log("\n=== Rebalance (Uniswap-priced) ===");
const rb = await rebalance(fund);
console.log(`  AUM ${usd(rb.aumUsd)} · HCS seq ${rb.hcs.sequenceNumber}`);
for (const t of rb.trades)
  console.log(
    `  ${t.side.toUpperCase()} ${t.symbol}: ${usd(t.usdDelta)} (${t.units.toFixed(3)} @ ${usd(t.priceUsd)}) · ${(t.actualPct * 100).toFixed(0)}%→${(t.targetPct * 100).toFixed(0)}%`,
  );
if (rb.trades.length === 0) console.log("  in balance");

console.log("\n=== Redeem at maturity ===");
const rd = await redeem(DEMO_FUND);
console.log(`  total ${usd(rd.total)} to ${rd.holders} holders`);
console.log(`  HCS seq ${rd.hcs.sequenceNumber} · ledger ${rd.ledgerTransaction ?? "(none)"}`);
console.log("");
