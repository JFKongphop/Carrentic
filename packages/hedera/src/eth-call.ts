/**
 * Minimal JSON-RPC `eth_call` client for reading ERC-20/ERC-3643 contract state
 * on Hedera (via the Hashio relay). Server-safe, read-only, no signer.
 *
 * We hand-encode the handful of view functions we need rather than pull a heavy
 * ABI library: selectors are fixed, and the return shapes (uint256 / string) are
 * trivial to decode.
 */

import { RPC_URL } from "./config";

export class EthCallError extends Error {
  constructor(
    message: string,
    readonly fn: string,
  ) {
    super(message);
    this.name = "EthCallError";
  }
}

const rpc = async (method: string, params: unknown[]): Promise<string> => {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: string; error?: { message: string } };
  if (json.error) throw new EthCallError(json.error.message, method);
  return json.result ?? "0x";
};

/** eth_call a function selector (+ optional pre-encoded args) against `to`. */
const call = (to: string, data: string): Promise<string> =>
  rpc("eth_call", [{ to, data }, "latest"]);

/** Left-pad a 20-byte address to a 32-byte ABI word (no 0x). */
const addrWord = (addr: string) =>
  addr.replace(/^0x/, "").toLowerCase().padStart(64, "0");

/** Decode an ABI-encoded uint256 to bigint. */
const toBigInt = (hex: string): bigint =>
  hex && hex !== "0x" ? BigInt(hex) : 0n;

/** Decode an ABI-encoded dynamic string (offset, length, bytes). */
const toStr = (hex: string): string => {
  const h = hex.replace(/^0x/, "");
  if (h.length < 128) return "";
  const len = Number(BigInt("0x" + h.slice(64, 128)));
  const bytes = h.slice(128, 128 + len * 2);
  return Buffer.from(bytes, "hex").toString("utf8");
};

// Function selectors (keccak256(sig)[:4]).
const SEL = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  balanceOf: "0x70a08231",
} as const;

export const erc20 = {
  name: async (to: string) => toStr(await call(to, SEL.name)),
  symbol: async (to: string) => toStr(await call(to, SEL.symbol)),
  decimals: async (to: string) => Number(toBigInt(await call(to, SEL.decimals))),
  totalSupply: async (to: string) => toBigInt(await call(to, SEL.totalSupply)),
  balanceOf: async (to: string, account: string) =>
    toBigInt(await call(to, SEL.balanceOf + addrWord(account))),
};
