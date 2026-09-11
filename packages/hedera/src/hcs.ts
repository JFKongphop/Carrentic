/**
 * On-chain coupon audit via Hedera Consensus Service — BACKEND ONLY.
 *
 * A coupon distribution is recorded as a timestamped, immutable HCS message
 * (per-holder amounts + total), signed with the operator key. This is the
 * agent's real on-chain action: the CIO decides to pay, and the payment is
 * written to consensus where anyone can audit it (pattern from the prior
 * winners' HCS evidence, PLAN.md §8).
 *
 * ⚠️ Uses `@hiero-ledger/sdk` + the operator key — never import from a client
 * component. Exposed via `@openledger-cfo/hedera/server`, not the root index.
 */

import {
  AccountId,
  Client,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
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

// Reused within the process; set HEDERA_COUPON_TOPIC to pin one across restarts.
let cachedTopic: string | undefined = process.env.HEDERA_COUPON_TOPIC;

/** Any lifecycle event written to the fund's audit topic. */
export interface HcsEvent {
  type: "coupon" | "redemption" | "onboard" | "rebalance";
  tokenId: string;
  date: string;
  [key: string]: unknown;
}

export interface HcsReceipt {
  topicId: string;
  sequenceNumber: string;
  txId: string;
}

/** Submit a lifecycle event to HCS. Creates the audit topic on first use. */
export const submitEvent = async (payload: HcsEvent): Promise<HcsReceipt> => {
  const client = operatorClient();
  try {
    if (!cachedTopic) {
      const created = await new TopicCreateTransaction()
        .setTopicMemo("Assetic coupon & redemption audit")
        .execute(client);
      const rx = await created.getReceipt(client);
      if (!rx.topicId) throw new Error("no topicId from TopicCreate");
      cachedTopic = rx.topicId.toString();
    }
    const submit = await new TopicMessageSubmitTransaction()
      .setTopicId(cachedTopic)
      .setMessage(JSON.stringify(payload))
      .execute(client);
    const rx = await submit.getReceipt(client);
    return {
      topicId: cachedTopic,
      sequenceNumber: rx.topicSequenceNumber?.toString() ?? "?",
      txId: submit.transactionId.toString(),
    };
  } finally {
    client.close();
  }
};

export const couponTopicId = (): string | undefined => cachedTopic;
