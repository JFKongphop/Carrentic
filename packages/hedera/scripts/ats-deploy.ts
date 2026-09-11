/**
 * Headless ATS bond deploy — validates deployBondOnChain end-to-end with the
 * operator key (winner-style, no wallet). Deploys a REAL new ERC-3643 bond.
 *
 * Run: pnpm -F @openledger-cfo/hedera exec tsx scripts/ats-deploy.ts
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });

const { deployBondOnChain } = await import("../src/ats-deploy");
const { hashscan } = await import("../src/config");

const key = process.env.HEDERA_OPERATOR_KEY;
if (!key) {
  console.error("✗ HEDERA_OPERATOR_KEY missing in .env");
  process.exit(1);
}

const params = {
  name: "Assetic Demo Bond",
  symbol: "ADB",
  isin: "US0378331005",
  decimals: 0,
  currency: "USD",
  numberOfUnits: "1000",
  nominalValue: "1000",
  startingDate: new Date().toISOString(),
  maturityDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
  couponRate: 0.05,
  couponFrequency: 2,
  requireKyc: true,
};

console.log("\nAssetic · deploying a new ATS bond (operator-signed)…\n");
try {
  const res = await deployBondOnChain(params, key);
  console.log(`✓ DEPLOYED — bond ${res.tokenId}`);
  console.log(`  tx ${res.txId}`);
  console.log(`  HashScan ${hashscan.token(res.tokenId)}\n`);
} catch (cause) {
  console.error(
    `✗ Failed: ${cause instanceof Error ? cause.message : String(cause)}`,
  );
  if (cause instanceof Error && cause.stack) console.error(cause.stack);
  process.exitCode = 1;
}
