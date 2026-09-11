/**
 * Test the on-chain coupon payment end-to-end (HCS audit + ledger posting).
 * Run: pnpm -F @openledger-cfo/fund exec tsx scripts/coupon.ts
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });

const { payCoupon, DEMO_FUND } = await import("../src/index");

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

console.log(`\nAssetic · pay coupon on bond ${DEMO_FUND.bondTokenId}\n`);
const r = await payCoupon(DEMO_FUND);
console.log(`  rate / unit   ${usd(r.ratePerUnit)}`);
console.log(`  total         ${usd(r.total)} to ${r.payments.length} holder(s)`);
for (const p of r.payments)
  console.log(`    ${p.account}  ${p.units} units → ${usd(p.amount)}`);
console.log(`\n  on-chain (HCS): topic ${r.hcs.topicId} · seq ${r.hcs.sequenceNumber}`);
console.log(`  ledger posting: ${r.transactionId ?? "(none)"}`);
console.log(`  HashScan topic: https://hashscan.io/testnet/topic/${r.hcs.topicId}\n`);
