/**
 * Backend ATS contract writes (operator-signed) — grant KYC + transfer units.
 * Same headless path proven by scripts/ats-mint.ts. BACKEND ONLY; exposed via
 * `@openledger-cfo/hedera/server`.
 */

import {
  AccountId,
  Client,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  PrivateKey,
} from "@hiero-ledger/sdk";

const operatorClient = (): Client => {
  const id = process.env.HEDERA_OPERATOR_ID;
  const key = process.env.HEDERA_OPERATOR_KEY;
  if (!id || !key) throw new Error("HEDERA_OPERATOR_ID / KEY missing");
  return Client.forTestnet().setOperator(
    AccountId.fromString(id),
    PrivateKey.fromStringECDSA(key.startsWith("0x") ? key.slice(2) : key),
  );
};

const operatorEvm = (): string => {
  const evm = process.env.HEDERA_OPERATOR_EVM;
  if (!evm) throw new Error("HEDERA_OPERATOR_EVM missing");
  return evm;
};

export interface AtsTxResult {
  txId: string;
  status: string;
}

const exec = async (
  client: Client,
  contract: ContractId,
  fn: string,
  params: InstanceType<typeof ContractFunctionParameters>,
  gas = 3_000_000,
): Promise<AtsTxResult> => {
  const submit = await new ContractExecuteTransaction()
    .setContractId(contract)
    .setGas(gas)
    .setFunction(fn, params)
    .execute(client);
  const rx = await submit.getReceipt(client);
  return { txId: submit.transactionId.toString(), status: rx.status.toString() };
};

/**
 * Grant KYC to a holder, then transfer `units` from the treasury (operator) to
 * them — onboarding an investor on-chain. Both are compliance-checked by the
 * token. Returns both receipts.
 */
export const onboardHolderOnChain = async (
  tokenId: string,
  recipientEvm: string,
  units: number,
): Promise<{ kyc: AtsTxResult; transfer: AtsTxResult }> => {
  const client = operatorClient();
  const contract = ContractId.fromString(tokenId);
  try {
    const validTo = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
    // grantKyc(address account, string vcId, uint256 validFrom, uint256 validTo, address issuer)
    const kyc = await exec(
      client,
      contract,
      "grantKyc",
      new ContractFunctionParameters()
        .addAddress(recipientEvm)
        .addString("assetic-investor-vc")
        .addUint256(0)
        .addUint256(validTo)
        .addAddress(operatorEvm()),
    );
    // transfer(address to, uint256 value) — from the treasury (operator).
    const transfer = await exec(
      client,
      contract,
      "transfer",
      new ContractFunctionParameters().addAddress(recipientEvm).addUint256(units),
    );
    return { kyc, transfer };
  } finally {
    client.close();
  }
};
