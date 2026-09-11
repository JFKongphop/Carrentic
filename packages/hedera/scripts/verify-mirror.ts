/**
 * Verify the Mirror Node read layer against the operator account.
 * Backend-safe: reads only, no signing. Run: `pnpm -F @openledger-cfo/hedera verify`
 *
 * Once a bond is issued (Phase 1), pass its token id to also print the security
 * snapshot + holder register:  `... verify 0.0.<tokenId>`
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Load the repo-root .env regardless of cwd.
loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });

const {
  ATS_FACTORY_ID,
  ATS_RESOLVER_ID,
  MIRROR_NODE_URL,
  NETWORK,
  OPERATOR,
  getAccount,
  getAccountTokens,
  hashscan,
  resolveReadPort,
} = await import("../src/index");

const line = (label: string, value: string) =>
  console.log(`  ${label.padEnd(18)} ${value}`);

console.log(`\nAssetic · Hedera Mirror check  (network: ${NETWORK})`);
console.log(`Mirror: ${MIRROR_NODE_URL}\n`);
line("ATS factory", ATS_FACTORY_ID);
line("ATS resolver", ATS_RESOLVER_ID);

const operatorId = OPERATOR.accountId;
if (!operatorId) {
  console.error("\n✗ HEDERA_OPERATOR_ID not set in .env");
  process.exit(1);
}

console.log(`\nOperator account ${operatorId}:`);
const account = await getAccount(operatorId);
line("EVM address", account.evm_address ?? "(none)");
line("HBAR balance", `${account.balance.balance / 1e8} ℏ`);
line("HashScan", hashscan.account(operatorId));

const rels = await getAccountTokens(operatorId);
line("token relations", String(rels.length));

const tokenId = process.argv[2];
if (tokenId) {
  const port = await resolveReadPort(tokenId);
  console.log(`\nSecurity ${tokenId}:`);
  const sec = await port.getSecurity(tokenId);
  line("name", `${sec.name} (${sec.symbol})`);
  line("decimals", String(sec.decimals));
  line("total supply", sec.totalSupply);
  line("treasury", sec.treasuryId ?? "(none / ERC-3643)");
  line("HashScan", hashscan.token(tokenId));

  const holders = await port.getHolders(tokenId);
  console.log(`\nHolder register (${holders.length}):`);
  for (const h of holders.slice(0, 20)) line(h.accountId, String(h.balance));
}

console.log("\n✓ Mirror read layer OK\n");
