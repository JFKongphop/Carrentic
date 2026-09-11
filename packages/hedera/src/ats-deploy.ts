/**
 * Headless ATS bond deployment — the winner-style path.
 *
 * The ATS SDK only signs through a browser wallet (MetaMask), which made the
 * in-app issue flow fragile. Instead we deploy the ERC-3643 bond exactly like
 * the reference Hedera winners tokenized: server-side, signed with the operator
 * key. We call the ATS **factory**'s `deployBond` directly over the Hedera
 * JSON-RPC relay with ethers — no wallet, no browser SDK.
 *
 * SERVER-ONLY: needs the operator private key. Import from `@openledger-cfo/hedera/server`.
 */

import { Contract, JsonRpcProvider, Wallet, ZeroAddress } from "ethers";
import { ContractId } from "@hiero-ledger/sdk";

import {
  ATS_FACTORY_ID,
  ATS_RESOLVER_ID,
  MIRROR_NODE_URL,
  RPC_URL,
} from "./config";
import { FACTORY_ABI } from "./factory-abi";
import type { BondIssuanceParams, IssueResult } from "./port";

/** ERC-3643 diamond admin role (the deployer becomes DEFAULT_ADMIN). */
const DEFAULT_ADMIN_ROLE = "0x" + "0".repeat(64);

/** The Bond diamond config registered in the resolver (from the ATS web .env). */
const BOND_CONFIG_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000002";
const BOND_CONFIG_VERSION = 1;

/** Reg S (non-US), no 506 sub-type — a valid ATS regulation combo. */
const REG_TYPE_REG_S = 1;
const REG_SUBTYPE_NONE = 0;

/**
 * ERC-3643 role hashes (from the ATS contracts). To mint, the treasury needs
 * KYC, which needs a registered SSI issuer, which needs ROLE_SSI_MANAGER; and
 * issuing needs ROLE_ISSUER. The deployer is DEFAULT_ADMIN (we set the rbac at
 * deploy) so it self-grants these on the fresh diamond.
 */
const ROLE_KYC =
  "0x754f499f9fdfbb089d12bdec817a6863d593d8a3ea7f546c00a5cafd20957bfc";
const ROLE_ISSUER =
  "0x5eeaf5602c75bf26e73b5206d0bd6ee82f621166255e5fd73cc06bc7bd84a95f";
const ROLE_SSI_MANAGER =
  "0x3120494a82251fe85b0403877539486dbfcf0f94c20741a3229cfad31f625ee1";

/** The diamond facets we call to mint units to the treasury. */
const BOND_ABI = [
  "function grantRole(bytes32 role, address account)",
  "function addIssuer(address issuer)",
  "function grantKyc(address account, string vcId, uint256 validFrom, uint256 validTo, address issuer)",
  "function issue(address tokenHolder, uint256 value, bytes data)",
] as const;

/**
 * A Hedera contract's *canonical* EVM address (from Mirror), not the long-zero
 * form. The ATS diamond stores its resolver address and its internal checks
 * compare against the canonical address the contract was deployed with — so the
 * long-zero form (`toSolidityAddress()`) makes `deployBond` revert. Falls back
 * to long-zero only if Mirror has no canonical address.
 */
async function contractEvm(hederaId: string): Promise<string> {
  try {
    const res = await fetch(`${MIRROR_NODE_URL}/contracts/${hederaId}`);
    if (res.ok) {
      const body = (await res.json()) as { evm_address?: string };
      if (body.evm_address) return body.evm_address;
    }
  } catch {
    // fall through to long-zero
  }
  return "0x" + ContractId.fromString(hederaId).toSolidityAddress();
}

// ISO-4217 currency → bytes3 hex (e.g. "USD" → 0x555344).
const toBytes3 = (code: string): string =>
  "0x" +
  Array.from(code.slice(0, 3).padEnd(3, "\0"))
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");

const toUnixSeconds = (iso: string): bigint =>
  BigInt(Math.floor(new Date(iso).getTime() / 1000));

// The start must be in the future; a picked "today" parses to midnight (past).
const toStartSeconds = (iso: string): bigint =>
  BigInt(
    Math.max(
      Math.floor(new Date(iso).getTime() / 1000),
      Math.floor(Date.now() / 1000) + 120,
    ),
  );

const normalizeKey = (key: string): string =>
  key.startsWith("0x") ? key : "0x" + key;

/** Resolve a deployed contract's Hedera id (0.0.x) from its EVM address via Mirror. */
async function evmToHederaId(evmAddress: string): Promise<string> {
  try {
    const res = await fetch(`${MIRROR_NODE_URL}/contracts/${evmAddress}`);
    if (res.ok) {
      const body = (await res.json()) as { contract_id?: string };
      if (body.contract_id) return body.contract_id;
    }
  } catch {
    // fall through to the EVM address — HashScan resolves it either way
  }
  return evmAddress;
}

/**
 * Deploy a new ERC-3643 bond via the ATS factory, signed with the operator key.
 * Returns the deployed bond's Hedera id (0.0.x) and the deploy tx hash.
 */
export async function deployBondOnChain(
  params: BondIssuanceParams,
  operatorKey: string,
): Promise<IssueResult> {
  const provider = new JsonRpcProvider(RPC_URL, undefined, {
    batchMaxCount: 1,
  });
  const wallet = new Wallet(normalizeKey(operatorKey), provider);
  const operatorEvm = await wallet.getAddress();
  const [factoryEvm, resolverEvm] = await Promise.all([
    contractEvm(ATS_FACTORY_ID),
    contractEvm(ATS_RESOLVER_ID),
  ]);
  const factory = new Contract(factoryEvm, FACTORY_ABI, wallet);

  const bondData = {
    security: {
      resolver: resolverEvm,
      maxSupply: BigInt(params.numberOfUnits),
      resolverProxyConfiguration: {
        key: BOND_CONFIG_ID,
        version: BigInt(BOND_CONFIG_VERSION),
      },
      erc20MetadataInfo: {
        name: params.name,
        symbol: params.symbol,
        isin: params.isin,
        decimals: params.decimals,
      },
      rbacs: [{ role: DEFAULT_ADMIN_ROLE, members: [operatorEvm] }],
      externalPauses: [],
      externalControlLists: [],
      externalKycLists: [],
      compliance: ZeroAddress,
      identityRegistry: ZeroAddress,
      arePartitionsProtected: false,
      isMultiPartition: false,
      isControllable: true,
      isWhiteList: false,
      clearingActive: false,
      internalKycActivated: params.requireKyc,
      erc20VotesActivated: false,
    },
    bondDetails: {
      currency: toBytes3(params.currency),
      nominalValue: BigInt(params.nominalValue),
      nominalValueDecimals: params.decimals,
      startingDate: toStartSeconds(params.startingDate),
      maturityDate: toUnixSeconds(params.maturityDate),
    },
    proceedRecipients: [],
    proceedRecipientsData: [],
  };

  const regulationData = {
    regulationType: REG_TYPE_REG_S,
    regulationSubType: REG_SUBTYPE_NONE,
    additionalSecurityData: {
      countriesControlListType: false,
      listOfCountries: "",
      info: "",
    },
  };

  const tx = await (
    factory as unknown as {
      deployBond: (
        b: unknown,
        r: unknown,
        o: { gasLimit: number },
      ) => Promise<{ hash: string; wait: () => Promise<{ logs: unknown[] }> }>;
    }
  ).deployBond(bondData, regulationData, { gasLimit: 13_000_000 });
  const receipt = await tx.wait();

  let bondEvm: string | undefined;
  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = factory.interface.parseLog(
        log as { topics: string[]; data: string },
      );
      if (parsed?.name === "BondDeployed") {
        bondEvm = parsed.args.bondAddress as string;
        break;
      }
    } catch {
      // not a factory event
    }
  }
  if (!bondEvm) {
    throw new Error("deployBond succeeded but no BondDeployed event was found");
  }

  // The diamond deploys empty. Mint the requested units to the treasury (the
  // operator) so the bond is issued with real supply, not a 0-supply shell.
  await mintToTreasury(bondEvm, operatorEvm, params.numberOfUnits, wallet);

  const tokenId = await evmToHederaId(bondEvm);
  return { tokenId, txId: tx.hash };
}

/**
 * Grant the roles, register the operator as an SSI issuer, KYC the treasury, and
 * issue `units` to it — the on-chain chain each step's revert taught us (see
 * scripts/ats-mint.ts). All operator-signed; the operator is the fresh diamond's
 * DEFAULT_ADMIN so every grant is authorized.
 */
async function mintToTreasury(
  bondEvm: string,
  treasuryEvm: string,
  units: string,
  wallet: Wallet,
): Promise<void> {
  const bond = new Contract(bondEvm, BOND_ABI, wallet) as unknown as Record<
    string,
    (...args: unknown[]) => Promise<{ wait: () => Promise<unknown> }>
  >;
  const send = async (method: string, args: unknown[]) => {
    const fn = bond[method];
    if (!fn) throw new Error(`bond method ${method} not found`);
    const tx = await fn(...args, { gasLimit: 4_000_000 });
    await tx.wait();
  };

  await send("grantRole", [ROLE_KYC, treasuryEvm]);
  await send("grantRole", [ROLE_ISSUER, treasuryEvm]);
  await send("grantRole", [ROLE_SSI_MANAGER, treasuryEvm]);
  await send("addIssuer", [treasuryEvm]);

  const validTo = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
  await send("grantKyc", [
    treasuryEvm,
    "assetic-demo-vc",
    0,
    validTo,
    treasuryEvm,
  ]);

  await send("issue", [treasuryEvm, BigInt(units), "0x"]);
}
