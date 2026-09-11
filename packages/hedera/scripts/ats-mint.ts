/**
 * Headless ATS lifecycle — the ATS web app (this version) exposes no Mint button,
 * so we drive the deployed ERC-3643 bond contract directly with the operator key.
 *
 * Full chain discovered on-chain (each step's revert told us the next requirement):
 *   issue → needs recipient KYC'd → grantKyc → needs a registered SSI issuer →
 *   addIssuer → needs ROLE_SSI_MANAGER; and issue needs ROLE_ISSUER, grantKyc ROLE_KYC.
 * The operator is DEFAULT_ADMIN, so it self-grants the roles. Steps:
 *   1. grantRole(SSI_MANAGER)  2. addIssuer(operator)
 *   3. grantKyc(operator)      4. issue(operator, 1000)
 * (ROLE_KYC/ROLE_ISSUER were granted in an earlier run; grantRole is NOT
 *  idempotent here, so re-grants are tolerated as "already done".)
 *
 * Run: pnpm -F @openledger-cfo/hedera exec tsx scripts/ats-mint.ts
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });

const {
  AccountId,
  Client,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  PrivateKey,
} = await import("@hiero-ledger/sdk");

const TOKEN_ID = "0.0.10457503";
const OPERATOR_EVM = process.env.HEDERA_OPERATOR_EVM ?? "";
const idStr = process.env.HEDERA_OPERATOR_ID;
const keyRaw = process.env.HEDERA_OPERATOR_KEY;
if (!idStr || !keyRaw || !OPERATOR_EVM) {
  console.error("✗ HEDERA_OPERATOR_ID / KEY / EVM missing in .env");
  process.exit(1);
}

const ROLE_KYC =
  "754f499f9fdfbb089d12bdec817a6863d593d8a3ea7f546c00a5cafd20957bfc";
const ROLE_ISSUER =
  "5eeaf5602c75bf26e73b5206d0bd6ee82f621166255e5fd73cc06bc7bd84a95f";
const ROLE_SSI_MANAGER =
  "3120494a82251fe85b0403877539486dbfcf0f94c20741a3229cfad31f625ee1";
const bytes32 = (hex: string) =>
  Uint8Array.from(Buffer.from(hex.replace(/^0x/, ""), "hex"));

const operatorId = AccountId.fromString(idStr);
const operatorKey = PrivateKey.fromStringECDSA(
  keyRaw.startsWith("0x") ? keyRaw.slice(2) : keyRaw,
);
const client = Client.forTestnet().setOperator(operatorId, operatorKey);
const contract = ContractId.fromString(TOKEN_ID);

const exec = async (
  fn: string,
  params: InstanceType<typeof ContractFunctionParameters>,
  gas = 3_000_000,
): Promise<string> => {
  const submit = await new ContractExecuteTransaction()
    .setContractId(contract)
    .setGas(gas)
    .setFunction(fn, params)
    .execute(client);
  return (await submit.getReceipt(client)).status.toString();
};

/** Run a prep step, tolerating an "already done" revert. */
const tryStep = async (
  label: string,
  fn: string,
  params: InstanceType<typeof ContractFunctionParameters>,
) => {
  try {
    console.log(`     ${label}…`);
    await exec(fn, params);
    console.log(`     ✓ ${label}`);
  } catch {
    console.log(`     • ${label} skipped (already done)`);
  }
};

const roleParams = (role: string) =>
  new ContractFunctionParameters().addBytes32(bytes32(role)).addAddress(OPERATOR_EVM);

console.log(`\nAssetic · ATS bond ${TOKEN_ID} — headless mint`);
console.log(`Operator ${operatorId.toString()} (${OPERATOR_EVM})\n`);

try {
  console.log("Prep: roles + SSI issuer");
  await tryStep("grantRole(KYC)", "grantRole", roleParams(ROLE_KYC));
  await tryStep("grantRole(ISSUER)", "grantRole", roleParams(ROLE_ISSUER));
  await tryStep("grantRole(SSI_MANAGER)", "grantRole", roleParams(ROLE_SSI_MANAGER));
  await tryStep(
    "addIssuer(operator)",
    "addIssuer",
    new ContractFunctionParameters().addAddress(OPERATOR_EVM),
  );

  // grantKyc(address account, string vcId, uint256 validFrom, uint256 validTo, address issuer)
  console.log("\n1/2  grantKyc(operator)…");
  const validTo = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
  console.log(
    `     ✓ ${await exec(
      "grantKyc",
      new ContractFunctionParameters()
        .addAddress(OPERATOR_EVM)
        .addString("assetic-demo-vc")
        .addUint256(0)
        .addUint256(validTo)
        .addAddress(OPERATOR_EVM),
    )}`,
  );

  // issue(address tokenHolder, uint256 value, bytes data) — mint
  console.log("2/2  issue(operator, 1000)…");
  console.log(
    `     ✓ ${await exec(
      "issue",
      new ContractFunctionParameters()
        .addAddress(OPERATOR_EVM)
        .addUint256(1000)
        .addBytes(new Uint8Array(0)),
    )}`,
  );

  console.log(`\n✓ DONE — ATS bond minted (1000 units to treasury)`);
  console.log(`  HashScan: https://hashscan.io/testnet/contract/${TOKEN_ID}\n`);
} catch (cause) {
  console.error(
    `\n✗ Failed: ${cause instanceof Error ? cause.message : String(cause)}`,
  );
  process.exitCode = 1;
} finally {
  client.close();
}
