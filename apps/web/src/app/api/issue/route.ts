import { z } from "zod/v4";

import { deployBondOnChain } from "@openledger-cfo/hedera/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Issue a real ERC-3643 bond on Hedera via the ATS factory — deployed AND minted
 * server-side with the operator key (no wallet). This is the winner-style path:
 * the ATS SDK can't sign server-side, so we call the factory's `deployBond`
 * directly over the JSON-RPC relay. See packages/hedera/src/ats-deploy.ts.
 */
const BodySchema = z.object({
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(20),
  isin: z.string().min(1).max(12),
  decimals: z.number().int().min(0).max(18),
  currency: z.string().min(3).max(3),
  numberOfUnits: z.string().regex(/^\d+$/),
  nominalValue: z.string().regex(/^\d+$/),
  startingDate: z.string().min(1),
  maturityDate: z.string().min(1),
  couponRate: z.number(),
  couponFrequency: z.number().int(),
  requireKyc: z.boolean(),
});

export async function POST(request: Request) {
  const key = process.env.HEDERA_OPERATOR_KEY;
  if (!key) {
    return Response.json(
      { error: "HEDERA_OPERATOR_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let params: z.infer<typeof BodySchema>;
  try {
    params = BodySchema.parse(await request.json());
  } catch (cause) {
    return Response.json(
      { error: `Invalid request: ${cause instanceof Error ? cause.message : String(cause)}` },
      { status: 400 },
    );
  }

  try {
    const result = await deployBondOnChain(params, key);
    return Response.json(result);
  } catch (cause) {
    return Response.json(
      { error: cause instanceof Error ? cause.message : String(cause) },
      { status: 502 },
    );
  }
}
