/**
 * `TokenizationReadPort` for ATS / ERC-3643 tokens (EVM contracts, not HTS).
 * Reads via `eth_call` (name/symbol/decimals/totalSupply/balanceOf) and rebuilds
 * the holder register from Transfer event logs on the Mirror Node. Server-safe.
 *
 * Sibling of `mirrorReadPort` (which handles native HTS tokens) — the port seam
 * lets Assetic read either token model through one interface.
 */

import { MIRROR_NODE_URL } from "./config";
import { erc20 } from "./eth-call";
import type {
  HolderPosition,
  SecuritySnapshot,
  TokenizationReadPort,
} from "./port";

interface ContractInfo {
  evm_address: string;
}
interface Log {
  topics: string[];
}
interface LogsResponse {
  logs: Log[];
  links: { next: string | null };
}

const mirror = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${MIRROR_NODE_URL}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Mirror ${res.status} for ${path}`);
  return (await res.json()) as T;
};

/** Resolve a token's `0.0.x` id to its 0x EVM contract address. */
export const resolveEvmAddress = async (tokenId: string): Promise<string> => {
  const info = await mirror<ContractInfo>(`/contracts/${tokenId}`);
  return info.evm_address.startsWith("0x")
    ? info.evm_address
    : `0x${info.evm_address}`;
};

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

/** A 32-byte log topic → 0x EVM address (last 20 bytes). */
const topicToAddr = (topic: string) => `0x${topic.replace(/^0x/, "").slice(24)}`;

/** A topic encodes an address iff its top 12 bytes are zero. */
const isAddressTopic = (topic: string) =>
  topic.replace(/^0x/, "").slice(0, 24) === "0".repeat(24);

export const atsReadPort: TokenizationReadPort = {
  async getSecurity(tokenId: string): Promise<SecuritySnapshot> {
    const evm = await resolveEvmAddress(tokenId);
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      erc20.name(evm),
      erc20.symbol(evm),
      erc20.decimals(evm),
      erc20.totalSupply(evm),
    ]);
    return {
      tokenId,
      name,
      symbol,
      decimals,
      totalSupply: totalSupply.toString(),
      treasuryId: null, // ERC-3643 has no HTS treasury; supply is contract state.
    };
  },

  async getHolders(tokenId: string): Promise<HolderPosition[]> {
    const evm = await resolveEvmAddress(tokenId);

    // ATS emits ERC-1400 partition events (not ERC-20 Transfer), and Mirror
    // rejects topic filters without a timestamp range. So harvest every
    // address-shaped topic from all logs, then balanceOf-filter — false
    // positives (e.g. a uint that looks like an address) resolve to 0.
    const addrs = new Set<string>();
    let path: string | null = `/contracts/${tokenId}/results/logs?limit=100&order=asc`;
    while (path !== null) {
      const page: LogsResponse = await mirror<LogsResponse>(path);
      for (const log of page.logs) {
        for (const t of log.topics.slice(1)) {
          if (!isAddressTopic(t)) continue;
          const a = topicToAddr(t).toLowerCase();
          if (a !== ZERO_ADDR) addrs.add(a);
        }
      }
      path = page.links.next ? page.links.next.replace("/api/v1", "") : null;
    }

    const holders = await Promise.all(
      [...addrs].map(async (a) => ({
        accountId: a,
        balance: Number(await erc20.balanceOf(evm, a)),
      })),
    );
    return holders.filter((h) => h.balance > 0);
  },
};
