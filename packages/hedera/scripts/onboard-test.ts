import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });

const { PrivateKey } = await import("@hiero-ledger/sdk");
const { onboardHolderOnChain } = await import("../src/ats-write");

const key = PrivateKey.generateECDSA();
const raw = key.publicKey.toEvmAddress();
const evm = raw.startsWith("0x") ? raw : `0x${raw}`;
console.log("\nOnboarding demo investor:", evm);

try {
  const r = await onboardHolderOnChain("0.0.10457503", evm, 100);
  console.log("  grantKyc:", r.kyc.status, r.kyc.txId);
  console.log("  transfer:", r.transfer.status, r.transfer.txId);
  console.log("✓ onboard on-chain OK — investor:", evm);
} catch (e) {
  console.error("✗", e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
}
