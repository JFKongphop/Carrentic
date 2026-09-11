/**
 * HTS fallback issuance — headless, no browser, no wallet.
 *
 * Issues a compliant fungible "bond" token with native HTS compliance keys
 * (KYC/Freeze/Wipe/Pause/Supply) using the operator key, then runs one full
 * lifecycle: create a holder account → associate → grant KYC → transfer.
 * This is the winners' proven native-HTS path (PLAN.md §8), used because the
 * ATS hosted app is down. Run: `pnpm -F @openledger-cfo/hedera hts`
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });

const {
  AccountCreateTransaction,
  AccountId,
  Client,
  Hbar,
  PrivateKey,
  TokenAssociateTransaction,
  TokenCreateTransaction,
  TokenGrantKycTransaction,
  TokenSupplyType,
  TokenType,
  TransferTransaction,
} = await import("@hiero-ledger/sdk");

const HASHSCAN = "https://hashscan.io/testnet";
const say = (m: string) => console.log(m);

const idStr = process.env.HEDERA_OPERATOR_ID;
const keyRaw = process.env.HEDERA_OPERATOR_KEY;
if (!idStr || !keyRaw) {
  console.error("✗ HEDERA_OPERATOR_ID / HEDERA_OPERATOR_KEY missing in .env");
  process.exit(1);
}

const operatorId = AccountId.fromString(idStr);
const operatorKey = PrivateKey.fromStringECDSA(
  keyRaw.startsWith("0x") ? keyRaw.slice(2) : keyRaw,
);
const client = Client.forTestnet().setOperator(operatorId, operatorKey);

say(`\nAssetic · HTS issuance (testnet)`);
say(`Operator ${operatorId.toString()}\n`);

try {
  // 1) Issue the bond — fungible, with the full native compliance key set.
  say("1/4  Creating bond token…");
  const createRx = await (
    await new TokenCreateTransaction()
      .setTokenName("Assetic Demo Bond")
      .setTokenSymbol("ADB")
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(0)
      .setInitialSupply(1000)
      .setTreasuryAccountId(operatorId)
      .setSupplyType(TokenSupplyType.Finite)
      .setMaxSupply(1000)
      .setAdminKey(operatorKey.publicKey)
      .setSupplyKey(operatorKey.publicKey)
      .setKycKey(operatorKey.publicKey)
      .setFreezeKey(operatorKey.publicKey)
      .setWipeKey(operatorKey.publicKey)
      .setPauseKey(operatorKey.publicKey)
      .setTokenMemo("Assetic bond · 5% semi-annual · face 1000 · matures 2027-09-10")
      .freezeWith(client)
      .execute(client)
  ).getReceipt(client);
  const tokenId = createRx.tokenId;
  if (!tokenId) throw new Error("no tokenId in receipt");
  say(`     ✓ Issued ${tokenId.toString()}  (1000 units to treasury)`);
  say(`       ${HASHSCAN}/token/${tokenId.toString()}`);

  // 2) Create a holder account (fresh ECDSA key).
  say("2/4  Creating holder account…");
  const holderKey = PrivateKey.generateECDSA();
  const holderRx = await (
    await new AccountCreateTransaction()
      .setKeyWithoutAlias(holderKey.publicKey)
      .setInitialBalance(new Hbar(2))
      .execute(client)
  ).getReceipt(client);
  const holderId = holderRx.accountId;
  if (!holderId) throw new Error("no holder accountId");
  say(`     ✓ Holder ${holderId.toString()}`);

  // 3) Associate + grant KYC (compliance gate).
  say("3/4  Associating + granting KYC…");
  await (
    await (
      await new TokenAssociateTransaction()
        .setAccountId(holderId)
        .setTokenIds([tokenId])
        .freezeWith(client)
        .sign(holderKey)
    ).execute(client)
  ).getReceipt(client);
  await (
    await new TokenGrantKycTransaction()
      .setAccountId(holderId)
      .setTokenId(tokenId)
      .execute(client)
  ).getReceipt(client);
  say(`     ✓ ${holderId.toString()} associated + KYC-granted`);

  // 4) Transfer 100 units treasury → holder (compliance-checked on-chain).
  say("4/4  Transferring 100 units…");
  const xferRx = await (
    await new TransferTransaction()
      .addTokenTransfer(tokenId, operatorId, -100)
      .addTokenTransfer(tokenId, holderId, 100)
      .execute(client)
  ).getReceipt(client);
  say(`     ✓ Transferred (status ${xferRx.status.toString()})`);

  say(`\n✓ DONE — tokenized bond live on testnet`);
  say(`  Token:  ${tokenId.toString()}`);
  say(`  Holder: ${holderId.toString()} holds 100`);
  say(`  Verify: pnpm -F @openledger-cfo/hedera verify ${tokenId.toString()}`);
  say(`  HashScan: ${HASHSCAN}/token/${tokenId.toString()}\n`);
} catch (cause) {
  console.error(`\n✗ Failed: ${cause instanceof Error ? cause.message : String(cause)}`);
  process.exitCode = 1;
} finally {
  client.close();
}
