import type { UIMessage } from "ai";
import { z } from "zod/v4";

import { createAgent } from "@openledger-cfo/agent";
import { readGateway } from "@openledger-cfo/api";

export const maxDuration = 300;

const BodySchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  context: z.object({ path: z.string().max(200) }).optional(),
});

/**
 * Static orientation for the CIO agent. Live numbers come from the `getFund`
 * tool (bond + NAV + holders) and the ledger read tools — kept out of the system
 * prompt so every turn doesn't pay for a live on-chain + Uniswap read.
 */
const FUND_BRIEFING = `You manage a real car tokenized as an ERC-3643 security on Hedera via the Asset Tokenization Studio (token 0.0.10457503). Ownership is split into shares held by KYC-gated co-owners; the car is rented out and its value (car + rent treasury) is marked to market from crypto priced live on Uniswap. For any question about the car's value, treasury, shares or owners, call getFund. For the books (purchase, rent, distributions, sale), use the ledger tools.`;

/** The one boundary that catches: every failure below becomes a JSON body. */
export async function POST(request: Request) {
  const gateway = await readGateway();
  if (gateway === undefined) {
    return Response.json(
      {
        error: "AI gateway not configured",
        hint: "Open the AI settings in the app and save a base URL, API key, and model. The rest of the terminal works without it.",
      },
      { status: 503 },
    );
  }

  try {
    const body = BodySchema.parse(await request.json());

    const agent = createAgent("cio", {
      gateway,
      system: FUND_BRIEFING,
      followUps: true,
    });
    return agent.stream(body.messages, request.signal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    console.error("/api/chat failed", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
