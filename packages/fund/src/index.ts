/**
 * @openledger-cfo/fund — the Assetic fund domain service.
 *
 * Composes the three layers into one product surface:
 *   - Hedera  (`resolveReadPort`)  → the tokenized bond + holder register
 *   - Uniswap (`computeNav`)        → live NAV of the collateral
 *   - oled    (`createOpenLedger`)  → double-entry books (issuance postings)
 *
 * This is what Assetic's UI and the fund-admin agent consume.
 */

import { resolveReadPort, type HolderPosition } from "@openledger-cfo/hedera";
import {
  onboardHolderOnChain,
  submitEvent,
  type AtsTxResult,
  type HcsReceipt,
} from "@openledger-cfo/hedera/server";
import { createOpenLedger } from "@openledger-cfo/openledger";
import {
  computeNav,
  priceUsd,
  quoteRentPayout,
  type RentSwap,
  TOKENS,
  type Nav,
  type Portfolio,
} from "@openledger-cfo/uniswap";

/** A tokenized-bond fund: the on-chain security + its backing collateral. */
export interface FundConfig {
  /** Hedera token/contract id of the bond (ATS ERC-3643 or HTS). */
  bondTokenId: string;
  /** Face value per unit (bond nominal), for par-vs-NAV comparison. */
  faceValuePerUnit: number;
  /** Annual coupon rate (e.g. 0.05 = 5%). */
  couponRate: number;
  /** Coupons per year (e.g. 2 = semi-annual). */
  couponFrequency: number;
  /** Collateral + cash backing the fund, priced live via Uniswap. */
  portfolio: Portfolio;
  /** Ledger account ids for the postings. */
  ledger: {
    reserveAccount: string; // asset: where proceeds land / coupons draw from
    securityAccount: string; // liability: the issued bond
    couponExpenseAccount: string; // expense: interest paid to holders
  };
}

export interface FundSnapshot {
  bondTokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  /** Units issued on-chain (total supply). */
  unitsOutstanding: number;
  faceValuePerUnit: number;
  faceValueTotal: number;
  holders: HolderPosition[];
  nav: Nav;
  /** NAV premium/discount to par, as a fraction (e.g. 0.377 = +37.7%). */
  premiumToPar: number;
}

/**
 * Read the whole fund: on-chain security + holder register (Hedera) marked to
 * market (Uniswap). No signing, no ledger writes — safe to call per request.
 */
export const getFundSnapshot = async (
  config: FundConfig,
): Promise<FundSnapshot> => {
  const port = await resolveReadPort(config.bondTokenId);
  const [security, holders, nav] = await Promise.all([
    port.getSecurity(config.bondTokenId),
    port.getHolders(config.bondTokenId),
    computeNav(config.portfolio),
  ]);

  const unitsOutstanding = Number(security.totalSupply);
  const faceValueTotal = unitsOutstanding * config.faceValuePerUnit;
  const par = config.faceValuePerUnit;

  return {
    bondTokenId: config.bondTokenId,
    name: security.name,
    symbol: security.symbol,
    decimals: security.decimals,
    unitsOutstanding,
    faceValuePerUnit: par,
    faceValueTotal,
    holders,
    nav,
    premiumToPar: par > 0 ? (nav.navPerShare - par) / par : 0,
  };
};

/**
 * Record the bond issuance as a double-entry posting in the oled ledger:
 * debit the reserve (proceeds in), credit the security (bond owed out).
 * `resolve: true` creates the account paths if they don't exist yet.
 */
export const recordIssuance = async (
  config: FundConfig,
): Promise<{ transactionId: string; amount: number }> => {
  const oled = createOpenLedger();
  const port = await resolveReadPort(config.bondTokenId);
  const security = await port.getSecurity(config.bondTokenId);
  const amount = Number(security.totalSupply) * config.faceValuePerUnit;

  const result = await oled.transactions.add({
    debit_account: config.ledger.reserveAccount,
    credit_account: config.ledger.securityAccount,
    amount,
    description: `Assetic issuance: ${security.name} (${security.symbol}) ${config.bondTokenId}`,
    resolve: true,
  });
  if (!result.ok) {
    throw new Error(`ledger posting failed: ${result.error.message}`);
  }
  return { transactionId: result.value.transaction_id, amount };
};

/** One holder's coupon payment. */
export interface CouponPayment {
  account: string;
  units: number;
  amount: number;
}

export interface CouponResult {
  date: string;
  ratePerUnit: number;
  total: number;
  payments: CouponPayment[];
  /** On-chain HCS audit record of the distribution. */
  hcs: HcsReceipt;
  /** Double-entry posting id in the ledger, if it recorded. */
  transactionId?: string;
  /** The Uniswap-routed swap that converts the rent (WETH) into USDC for payout. */
  swap?: RentSwap;
}

/**
 * Pay a coupon: compute each holder's pro-rata interest from the live on-chain
 * register, record the distribution on-chain (HCS audit), and post it to the
 * double-entry ledger (interest expense ← reserve). Amounts are computed here
 * from validated state — never by the agent/LLM (PLAN.md §8).
 */
export const payCoupon = async (config: FundConfig): Promise<CouponResult> => {
  const port = await resolveReadPort(config.bondTokenId);
  const holders = await port.getHolders(config.bondTokenId);

  const ratePerUnit =
    (config.faceValuePerUnit * config.couponRate) / config.couponFrequency;
  const payments: CouponPayment[] = holders.map((h) => ({
    account: h.accountId,
    units: h.balance,
    amount: h.balance * ratePerUnit,
  }));
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const date = new Date().toISOString().slice(0, 10);

  // 0) Rent-payout swap: the rent accrues in the treasury as WETH; route it to
  // USDC through Uniswap so owners are paid in stable value. Quote is live; a
  // failure must not block the distribution, so it is best-effort.
  let swap: RentSwap | undefined;
  if (total > 0) {
    try {
      swap = await quoteRentPayout(total);
    } catch {
      swap = undefined;
    }
  }

  // 1) On-chain audit: write the coupon to consensus.
  const hcs = await submitEvent({
    type: "coupon",
    tokenId: config.bondTokenId,
    date,
    ratePerUnit,
    total,
    holders: payments,
  });

  // 2) Double-entry: interest expense debits, reserve credits.
  let transactionId: string | undefined;
  if (total > 0) {
    const oled = createOpenLedger();
    const posted = await oled.transactions.add({
      debit_account: config.ledger.couponExpenseAccount,
      credit_account: config.ledger.reserveAccount,
      amount: total,
      description: `Coupon ${date} · ${payments.length} holders · ${config.bondTokenId}`,
      resolve: true,
    });
    if (posted.ok) transactionId = posted.value.transaction_id;
  }

  return { date, ratePerUnit, total, payments, hcs, transactionId, swap };
};

// --- Onboard an investor ----------------------------------------------------

export interface OnboardResult {
  investor: string;
  units: number;
  proceeds: number;
  kyc: AtsTxResult;
  transfer: AtsTxResult;
  hcs: HcsReceipt;
  ledgerTransaction?: string;
}

/**
 * Onboard an investor: grant KYC and transfer `units` from the treasury on-chain
 * (both compliance-checked), audit it to HCS, and post the subscription to the
 * ledger (reserve ← subscriptions equity).
 */
export const onboardInvestor = async (
  config: FundConfig,
  investorEvm: string,
  units: number,
): Promise<OnboardResult> => {
  const { kyc, transfer } = await onboardHolderOnChain(
    config.bondTokenId,
    investorEvm,
    units,
  );
  const proceeds = units * config.faceValuePerUnit;
  const date = new Date().toISOString().slice(0, 10);

  const hcs = await submitEvent({
    type: "onboard",
    tokenId: config.bondTokenId,
    date,
    investor: investorEvm,
    units,
    proceeds,
  });

  let ledgerTransaction: string | undefined;
  const oled = createOpenLedger();
  const posted = await oled.transactions.add({
    debit_account: config.ledger.reserveAccount,
    credit_account: "usd:equity:subscriptions",
    amount: proceeds,
    description: `Subscription ${date} · ${units} units · ${investorEvm}`,
    resolve: true,
  });
  if (posted.ok) ledgerTransaction = posted.value.transaction_id;

  return { investor: investorEvm, units, proceeds, kyc, transfer, hcs, ledgerTransaction };
};

// --- Redeem at maturity -----------------------------------------------------

export interface RedeemResult {
  total: number;
  holders: number;
  hcs: HcsReceipt;
  ledgerTransaction?: string;
}

/**
 * Redeem the bond at maturity: settle principal to every holder at par. Records
 * the settlement on-chain (HCS) and posts it double-entry (security liability
 * cleared ← reserve). The on-chain unit burn is a maturity-gated Scheduled
 * Transaction; this books the settlement.
 */
export const redeem = async (config: FundConfig): Promise<RedeemResult> => {
  const port = await resolveReadPort(config.bondTokenId);
  const holders = await port.getHolders(config.bondTokenId);
  const settlements = holders.map((h) => ({
    account: h.accountId,
    units: h.balance,
    amount: h.balance * config.faceValuePerUnit,
  }));
  const total = settlements.reduce((s, x) => s + x.amount, 0);
  const date = new Date().toISOString().slice(0, 10);

  const hcs = await submitEvent({
    type: "redemption",
    tokenId: config.bondTokenId,
    date,
    total,
    holders: settlements,
  });

  let ledgerTransaction: string | undefined;
  if (total > 0) {
    const oled = createOpenLedger();
    const posted = await oled.transactions.add({
      debit_account: config.ledger.securityAccount,
      credit_account: config.ledger.reserveAccount,
      amount: total,
      description: `Redemption ${date} · ${settlements.length} holders · ${config.bondTokenId}`,
      resolve: true,
    });
    if (posted.ok) ledgerTransaction = posted.value.transaction_id;
  }
  return { total, holders: settlements.length, hcs, ledgerTransaction };
};

// --- AI rebalancing via Uniswap ---------------------------------------------

export interface RebalanceTrade {
  symbol: string;
  side: "buy" | "sell";
  actualPct: number;
  targetPct: number;
  usdDelta: number;
  priceUsd: number;
  units: number;
}

export interface RebalanceResult {
  aumUsd: number;
  trades: RebalanceTrade[];
  hcs: HcsReceipt;
}

/**
 * AI rebalancing: compare live allocation to the mandate, and for each drifted
 * asset compute the trade to bring it back — priced live via Uniswap — then
 * record the plan on-chain (HCS). Amounts come from validated NAV + Uniswap,
 * never the LLM.
 */
export const rebalance = async (
  config: FundConfig,
  targets: Record<string, number> = { WETH: 0.5, WBTC: 0.28, USDC: 0.12 },
): Promise<RebalanceResult> => {
  const nav = await computeNav(config.portfolio);
  const aum = nav.totalUsd || 1;
  const priceable = [TOKENS.WETH, TOKENS.WBTC];

  const trades: RebalanceTrade[] = [];
  for (const mark of nav.marks) {
    const target = targets[mark.symbol];
    if (target === undefined) continue;
    const actualPct = mark.valueUsd / aum;
    const drift = actualPct - target;
    if (Math.abs(drift) < 0.02) continue; // within tolerance
    const token = priceable.find((t) => t.symbol === mark.symbol);
    const price = token ? await priceUsd(token) : mark.priceUsd;
    const usdDelta = Math.abs(drift) * aum;
    trades.push({
      symbol: mark.symbol,
      side: drift > 0 ? "sell" : "buy",
      actualPct,
      targetPct: target,
      usdDelta,
      priceUsd: price,
      units: price > 0 ? usdDelta / price : 0,
    });
  }

  const hcs = await submitEvent({
    type: "rebalance",
    tokenId: config.bondTokenId,
    date: new Date().toISOString().slice(0, 10),
    aumUsd: aum,
    trades,
  });

  return { aumUsd: aum, trades, hcs };
};

/** The demo fund: our live ATS bond, backed by a crypto collateral pool. */
export const DEMO_FUND: FundConfig = {
  bondTokenId: "0.0.10457503",
  faceValuePerUnit: 1000,
  couponRate: 0.05,
  couponFrequency: 2,
  portfolio: {
    holdings: [], // filled from TOKENS at call sites to avoid a hard dep here
    cashUsd: 250_000,
    shares: 1000,
  },
  ledger: {
    reserveAccount: "usd:asset:fund:reserve",
    securityAccount: "usd:liability:security:assetic-bond",
    couponExpenseAccount: "usd:expense:interest:coupon",
  },
};
