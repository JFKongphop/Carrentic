import { randomBytes } from "node:crypto";

import { tool } from "@langchain/core/tools";
import { z } from "zod/v4";

import {
  DEMO_FUND,
  getFundSnapshot,
  onboardInvestor,
  payCoupon,
  rebalance,
  redeem,
} from "@openledger-cfo/fund";
import { TOKENS } from "@openledger-cfo/uniswap";

import { guardedRun, toolResult } from "./caller";

/** DEMO_FUND with its live collateral pool attached (needed for NAV/rebalance). */
const fundWithCollateral = () => ({
  ...DEMO_FUND,
  portfolio: {
    ...DEMO_FUND.portfolio,
    holdings: [
      { token: TOKENS.WETH, amount: 300 },
      { token: TOKENS.WBTC, amount: 5 },
    ],
  },
});

/**
 * The fund's live state: the tokenized bond on Hedera + its holder register,
 * marked to market via Uniswap. The collateral pool is fixed for the demo; the
 * agent never chooses amounts or prices — it reads validated on-chain/oracle
 * state and reasons over it (PLAN.md §8: LLM never touches money).
 */
export const getFund = tool(
  async () =>
    guardedRun(async () => {
      const snap = await getFundSnapshot({
        ...DEMO_FUND,
        portfolio: {
          ...DEMO_FUND.portfolio,
          holdings: [
            { token: TOKENS.WETH, amount: 300 },
            { token: TOKENS.WBTC, amount: 5 },
          ],
        },
      });
      return toolResult({
        bond: {
          tokenId: snap.bondTokenId,
          name: snap.name,
          symbol: snap.symbol,
          unitsOutstanding: snap.unitsOutstanding,
          faceValuePerUnit: snap.faceValuePerUnit,
          faceValueTotal: snap.faceValueTotal,
        },
        holders: snap.holders,
        nav: {
          marks: snap.nav.marks,
          cashUsd: snap.nav.cashUsd,
          aumUsd: snap.nav.totalUsd,
          navPerUnit: snap.nav.navPerShare,
          premiumToPar: snap.premiumToPar,
          asOf: snap.nav.asOf,
        },
      });
    }),
  {
    name: "getFund",
    description:
      "The tokenized bond fund's live state: on-chain security + holder register (Hedera) and NAV per unit marked to market via Uniswap, with premium/discount to par. Use for any question about the fund's value, holdings, NAV, or investors.",
    schema: z.object({}),
    responseFormat: "content_and_artifact",
  },
);

/**
 * Pay this period's coupon to every holder. Computes each holder's pro-rata
 * interest from the live on-chain register (never the LLM), records the
 * distribution on-chain via HCS, and posts the double-entry to the ledger.
 * This is a real, signed on-chain action — use only when the user asks to pay.
 */
export const payCouponTool = tool(
  async () =>
    guardedRun(async () => {
      const r = await payCoupon(DEMO_FUND);
      return toolResult({
        status: "paid",
        date: r.date,
        rentPerShare: r.ratePerUnit,
        total: r.total,
        owners: r.payments.length,
        payments: r.payments,
        uniswapPayoutSwap: r.swap
          ? {
              route: `${r.swap.tokenIn} → ${r.swap.tokenOut}`,
              wethSold: r.swap.amountInWeth,
              usdcOut: r.swap.usdcOut,
              rateUsdPerWeth: r.swap.rateUsdPerWeth,
            }
          : undefined,
        onChain: {
          topicId: r.hcs.topicId,
          sequence: r.hcs.sequenceNumber,
          hashscan: `https://hashscan.io/testnet/topic/${r.hcs.topicId}`,
        },
        ledgerTransaction: r.transactionId,
      });
    }),
  {
    name: "payCoupon",
    description:
      "Pay this period's RENT to all car co-owners NOW. Computes each owner's pro-rata rent from the live on-chain register, routes the payout WETH→USDC through Uniswap, records the distribution on-chain (HCS audit), and books it double-entry. A real on-chain action — call only when the user explicitly asks to pay or distribute rent. Returns the total, per-owner amounts, the Uniswap payout swap, the HCS topic/sequence, and the ledger transaction.",
    schema: z.object({}),
    responseFormat: "content_and_artifact",
  },
);

/** Onboard a new investor: grant KYC + allocate units on-chain. */
export const onboardInvestorTool = tool(
  async ({ units }) =>
    guardedRun(async () => {
      const investor = `0x${randomBytes(20).toString("hex")}`;
      const r = await onboardInvestor(DEMO_FUND, investor, units ?? 100);
      return toolResult({
        status: "onboarded",
        investor: r.investor,
        units: r.units,
        proceeds: r.proceeds,
        onChain: { kyc: r.kyc.status, transfer: r.transfer.status, hcsTopic: r.hcs.topicId, hcsSequence: r.hcs.sequenceNumber },
        ledgerTransaction: r.ledgerTransaction,
      });
    }),
  {
    name: "onboardInvestor",
    description:
      "Onboard a NEW investor to the bond: grants KYC and transfers `units` from the treasury on-chain (both compliance-checked), audits it to HCS, and books the subscription. A real on-chain action — call only when the user asks to onboard/add an investor or allocate units to a new holder. A fresh compliant account is created; report its address, units, and the on-chain statuses.",
    schema: z.object({
      units: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Units to allocate to the new investor (default 100)"),
    }),
    responseFormat: "content_and_artifact",
  },
);

/** Redeem the bond at maturity — settle principal to all holders. */
export const redeemTool = tool(
  async () =>
    guardedRun(async () => {
      const r = await redeem(DEMO_FUND);
      return toolResult({
        status: "redeemed",
        total: r.total,
        holders: r.holders,
        onChain: { hcsTopic: r.hcs.topicId, hcsSequence: r.hcs.sequenceNumber },
        ledgerTransaction: r.ledgerTransaction,
      });
    }),
  {
    name: "redeemAtMaturity",
    description:
      "Redeem the bond at maturity: settle principal (par × units) to every holder, record it on-chain (HCS), and book it double-entry (security liability ← reserve). A real on-chain action — call only when the user asks to redeem or settle the bond at maturity.",
    schema: z.object({}),
    responseFormat: "content_and_artifact",
  },
);

/** AI rebalancing: compute drift vs mandate, price the trades via Uniswap. */
export const rebalanceTool = tool(
  async () =>
    guardedRun(async () => {
      const r = await rebalance(fundWithCollateral());
      return toolResult({
        status: r.trades.length === 0 ? "in-balance" : "rebalance-planned",
        aumUsd: r.aumUsd,
        trades: r.trades,
        onChain: { hcsTopic: r.hcs.topicId, hcsSequence: r.hcs.sequenceNumber },
      });
    }),
  {
    name: "rebalance",
    description:
      "Rebalance the collateral toward the mandate. Compares live allocation to targets, and for each drifted asset computes the trade to correct it — sized and priced live via Uniswap — then records the plan on-chain (HCS). Call when the user asks to rebalance, or whether the fund needs rebalancing. Returns the trades (buy/sell, USD, units, price) and AUM.",
    schema: z.object({}),
    responseFormat: "content_and_artifact",
  },
);
