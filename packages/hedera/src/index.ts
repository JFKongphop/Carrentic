/**
 * @openledger-cfo/hedera — Hedera adapter for Assetic.
 *
 * Phase 1: config + Mirror Node reads (server-safe, no signing).
 * Phase 2: ATS SDK write-adapter (browser/MetaMask), behind `TokenizationWritePort`.
 * See PLAN.md §9c.
 *
 * Two token models are supported behind one read interface (PLAN.md milestone 2):
 *   - HTS native tokens  → `mirrorReadPort` (Mirror `/tokens`)
 *   - ATS / ERC-3643     → `atsReadPort`   (`eth_call` + Transfer logs)
 * `resolveReadPort(tokenId)` auto-detects which to use.
 */

import { MIRROR_NODE_URL } from "./config";
import { atsReadPort } from "./ats-read-port";
import { mirrorReadPort } from "./mirror-read-port";
import type { TokenizationReadPort } from "./port";

export * from "./config";
export * from "./mirror";
export * from "./port";
export { erc20 } from "./eth-call";
export { mirrorReadPort } from "./mirror-read-port";
export { atsReadPort, resolveEvmAddress } from "./ats-read-port";

/**
 * Pick the right read port for a token id: HTS native (Mirror `/tokens/{id}`
 * resolves) vs ATS/ERC-3643 contract (it does not — read via `eth_call`).
 */
export const resolveReadPort = async (
  tokenId: string,
): Promise<TokenizationReadPort> => {
  const res = await fetch(`${MIRROR_NODE_URL}/tokens/${tokenId}`, {
    headers: { accept: "application/json" },
  });
  return res.ok ? mirrorReadPort : atsReadPort;
};
