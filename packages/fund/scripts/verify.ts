/**
 * End-to-end fund verify: reads the ATS bond (Hedera), marks NAV (Uniswap),
 * and records the issuance in the double-entry ledger (oled). Proves all three
 * layers compose. Run: pnpm -F @openledger-cfo/fund verify [--post]
 *   --post also writes the issuance posting to the ledger.
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });

const { getFundSnapshot, recordIssuance, DEMO_FUND } = await import("../src/index");
const { TOKENS } = await import("@openledger-cfo/uniswap");

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// Attach a live collateral pool (kept out of the package to avoid a hard dep).
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

console.log(`\nAssetic · fund snapshot — bond ${fund.bondTokenId}\n`);
const snap = await getFundSnapshot(fund);
console.log(`  ${snap.name} (${snap.symbol})`);
console.log(`  units outstanding   ${snap.unitsOutstanding}`);
console.log(`  face value / unit   ${usd(snap.faceValuePerUnit)}`);
console.log(`  face value total    ${usd(snap.faceValueTotal)}`);
console.log(`\n  Holder register (${snap.holders.length}):`);
for (const h of snap.holders.slice(0, 10))
  console.log(`    ${h.accountId}  ${h.balance}`);
console.log(`\n  Collateral NAV (live via Uniswap):`);
for (const m of snap.nav.marks)
  console.log(`    ${m.symbol.padEnd(5)} ${m.amount} × ${usd(m.priceUsd)} = ${usd(m.valueUsd)}`);
console.log(`    cash        ${usd(snap.nav.cashUsd)}`);
console.log(`    AUM         ${usd(snap.nav.totalUsd)}`);
console.log(`    NAV / unit  ${usd(snap.nav.navPerShare)}`);
console.log(
  `    vs par      ${(snap.premiumToPar * 100).toFixed(1)}% ${snap.premiumToPar >= 0 ? "premium" : "discount"}`,
);

if (process.argv.includes("--post")) {
  console.log(`\n  Recording issuance in the ledger…`);
  const { transactionId, amount } = await recordIssuance(fund);
  console.log(`    ✓ posted ${usd(amount)} — tx ${transactionId}`);
  console.log(
    `      debit  ${fund.ledger.reserveAccount}\n      credit ${fund.ledger.securityAccount}`,
  );
}

console.log(`\n✓ Fund service OK\n`);
