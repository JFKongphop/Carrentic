/**
 * ATS write-adapter — implements `TokenizationWritePort` on the Asset
 * Tokenization Studio SDK.
 *
 * ⚠️ BROWSER-ONLY. The ATS SDK signs through a wallet (MetaMask/WalletConnect);
 * there is no backend raw-key mode (PLAN.md §9c). Import this from a client
 * component (`@openledger-cfo/hedera/ats`), never from server code. Server-side
 * reads use `mirrorReadPort` from the package root instead.
 *
 * Phase-2 status: structure + init/connect + the four lifecycle calls are wired
 * to the real SDK request shapes. Items marked TODO(phase2) need values that
 * come from the live resolver config / the issuance form, to be finalized when
 * we build the UI against a real issued bond.
 */

import {
  Bond,
  ConnectRequest,
  CreateBondRequest,
  FullRedeemAtMaturityRequest,
  GrantKycRequest,
  InitializationRequest,
  Kyc,
  Network,
  Security,
  SupportedWallets,
  TransferRequest,
} from "@hashgraph/asset-tokenization-sdk";

/**
 * Re-assert the factory/resolver on the SDK's NetworkService singleton.
 *
 * `Bond.create` reads the factory from `networkService.configuration`; if that
 * is ever cleared after `Network.init` (connect re-registers adapters), create
 * throws "Factory not found in request". `Network.setConfig` writes the same
 * singleton — we call it right before every create so the config is guaranteed
 * present. `SetConfigurationRequest` is not re-exported from the SDK root, but
 * `setConfig` only needs `{ factoryAddress, resolverAddress }` plus a passing
 * `validate()` (see core/validation/Validation.handleValidation).
 */
async function ensureConfig(): Promise<void> {
  await Network.setConfig({
    factoryAddress: ATS_FACTORY_ID,
    resolverAddress: ATS_RESOLVER_ID,
    validate: () => [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

import {
  ATS_FACTORY_ID,
  ATS_RESOLVER_ID,
  MIRROR_NODE_URL,
  NETWORK,
  RPC_URL,
} from "./config";
import type {
  BondIssuanceParams,
  IssueResult,
  TokenizationWritePort,
  TxResult,
} from "./port";

const node = (baseUrl: string) => ({ baseUrl, apiKey: "", headerName: "" });

/**
 * The connected wallet's Hedera account id, captured at connect. `Bond.create`
 * needs it as `diamondOwnerAccount` — the deployed diamond's admin/owner. Without
 * it the factory call dereferences an undefined account and throws.
 */
let connectedAccountId: string | undefined;

/**
 * Initialize the SDK against the network + ATS contracts, then connect MetaMask.
 * Captures the connected account for use as the bond's diamond owner. Call once
 * on the client before any write.
 */
export async function initAts(): Promise<void> {
  await Network.init(
    new InitializationRequest({
      network: NETWORK,
      mirrorNode: node(MIRROR_NODE_URL),
      rpcNode: node(RPC_URL),
      configuration: {
        factoryAddress: ATS_FACTORY_ID,
        resolverAddress: ATS_RESOLVER_ID,
      },
      // MetaMask delivers the paired account asynchronously via this event, not
      // in the connect() return — capture a *valid* Hedera id if one comes.
      events: {
        walletPaired: (event: {
          data?: { account?: { id?: { toString(): string } } };
        }) => {
          const id = event?.data?.account?.id?.toString();
          if (isValidHederaId(id)) connectedAccountId = id;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    }),
  );

  const data = await Network.connect(
    new ConnectRequest({
      network: NETWORK,
      mirrorNode: node(MIRROR_NODE_URL),
      rpcNode: node(RPC_URL),
      wallet: SupportedWallets.METAMASK,
    }),
  );

  // The SDK often resolves the wallet to the null id 0.0.0 (mirror lookup of an
  // ECDSA/EVM-alias account). CreateBondRequest rejects 0.0.0, so fall back to
  // the wallet's EVM address — getAccountEvmAddress accepts a 0x… address as-is
  // and the request validator treats it as a valid owner.
  const idFromConnect = data?.account?.id?.toString();
  if (isValidHederaId(idFromConnect)) connectedAccountId = idFromConnect;
  connectedAccountId ??= data?.account?.evmAddress ?? (await metamaskEvmAddress());

  if (!connectedAccountId) {
    throw new Error(
      "ATS connect returned no account — unlock MetaMask, select the operator account, approve the connection, and retry.",
    );
  }
}

/** A non-null Hedera id like "0.0.123" (rejects undefined and the 0.0.0 sentinel). */
const isValidHederaId = (id?: string): id is string =>
  !!id && /^\d+\.\d+\.\d+$/.test(id) && id !== "0.0.0";

/** The connected wallet's EVM address, read straight from the injected provider. */
async function metamaskEvmAddress(): Promise<string | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (globalThis as any).ethereum;
  if (!eth?.request) return undefined;
  try {
    const accounts: string[] = await eth.request({ method: "eth_accounts" });
    return accounts?.[0];
  } catch {
    return undefined;
  }
}

/** The security's Hedera id from a create response (`diamondAddress`, not `tokenId`). */
const securityIdOf = (security: {
  diamondAddress?: string;
  evmDiamondAddress?: string;
}): string => {
  const id = security.diamondAddress ?? security.evmDiamondAddress;
  if (!id) throw new Error("ATS create returned no security address");
  return id;
};

// ATS wants an ISO-4217 currency as a bytes3 hex (e.g. "USD" → 0x555344).
const toBytes3 = (code: string): string =>
  "0x" +
  Array.from(code.slice(0, 3).padEnd(3, "\0"))
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");

// ATS wants dates as Unix timestamps in seconds, not ISO strings.
const toUnixSeconds = (iso: string): string =>
  String(Math.floor(new Date(iso).getTime() / 1000));

// The start must be in the future; a picked "today" parses to midnight (past),
// so floor it at now + a small buffer.
const toStartSeconds = (iso: string): string =>
  String(
    Math.max(
      Math.floor(new Date(iso).getTime() / 1000),
      Math.floor(Date.now() / 1000) + 120,
    ),
  );

// The Bond diamond config in the ATS resolver (from the web app's .env).
const BOND_CONFIG_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000002";

export const atsWritePort: TokenizationWritePort = {
  async issueBond(params: BondIssuanceParams): Promise<IssueResult> {
    // Guarantee the factory/resolver are on the singleton right before create.
    await ensureConfig();
    if (!connectedAccountId) {
      throw new Error("Connect a wallet first (initAts was not run).");
    }
    const req = new CreateBondRequest({
      name: params.name,
      symbol: params.symbol,
      isin: params.isin,
      decimals: params.decimals,
      currency: toBytes3(params.currency),
      numberOfUnits: params.numberOfUnits,
      nominalValue: params.nominalValue,
      nominalValueDecimals: params.decimals,
      startingDate: toStartSeconds(params.startingDate),
      maturityDate: toUnixSeconds(params.maturityDate),
      // The connected wallet owns the deployed diamond (admin roles land here).
      diamondOwnerAccount: connectedAccountId,
      // Compliance: KYC-gate transfers (ERC-3643 style) when requested.
      internalKycActivated: params.requireKyc,
      isWhiteList: false,
      // Sensible bond defaults.
      erc20VotesActivated: false,
      isControllable: true,
      arePartitionsProtected: false,
      isMultiPartition: false,
      clearingActive: false,
      // Reg S offering (non-US), no 506 sub-type — a valid ATS regulation combo.
      // 1 = REG_S, 0 = NONE; the SDK rejects a bond with no regulation set.
      regulationType: 1,
      regulationSubType: 0,
      // Empty external-list / proceeds arrays — the factory call maps over these.
      externalPausesIds: [],
      externalControlListsIds: [],
      externalKycListsIds: [],
      configId: BOND_CONFIG_ID,
      configVersion: 1,
    });

    const { security, transactionId } = await Bond.create(req);
    return { tokenId: securityIdOf(security), txId: transactionId };
  },

  async grantKyc(tokenId: string, accountId: string): Promise<TxResult> {
    const { transactionId } = await Kyc.grantKyc(
      new GrantKycRequest({
        securityId: tokenId,
        targetId: accountId,
        // TODO(phase2): a real base64 verifiable credential. Empty is accepted
        // for internal-KYC demo grants; swap for an issued VC for compliance.
        vcBase64: "",
      }),
    );
    return { txId: transactionId };
  },

  async transfer(
    tokenId: string,
    to: string,
    amount: string,
  ): Promise<TxResult> {
    const { transactionId } = await Security.transfer(
      new TransferRequest({ securityId: tokenId, targetId: to, amount }),
    );
    return { txId: transactionId };
  },

  async payCoupon(_tokenId: string, _ratePerUnit: string): Promise<TxResult[]> {
    // TODO(phase2): fixed-rate bonds accrue coupons on-chain; distribution is a
    // separate ATS op (set/execute coupon) or the mass-payout package. Wire once
    // a coupon bond exists on testnet to confirm the exact call.
    throw new Error("payCoupon: not yet implemented (Phase 2)");
  },

  async redeem(
    tokenId: string,
    accountId: string,
    _amount: string,
  ): Promise<TxResult> {
    const { transactionId } = await Bond.fullRedeemAtMaturity(
      new FullRedeemAtMaturityRequest({
        securityId: tokenId,
        sourceId: accountId,
      }),
    );
    return { txId: transactionId };
  },
};
