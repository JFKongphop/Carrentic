import type { UIMessage } from "ai";
import { sampleSize } from "es-toolkit";

/**
 * The transcript's message shape. The stream appends the follow-up chips it
 * generated as a `data-suggestions` part, so they ride along with the answer
 * they belong to and survive a route change like any other part.
 */
export type CfoChatMessage = UIMessage<unknown, { suggestions: string[] }>;

const PICK_COUNT = 4;

/**
 * Openers for an empty pane. Every one asks about the household's own money —
 * what it did, where it went, what it means — against figures the briefing or a
 * tool can actually produce. Nothing administrative: tidying account names and
 * hunting duplicate rows are chores, not questions worth putting to a CFO, and
 * nothing about budgets or reminders, which live in the control plane and not
 * in its hands. Short enough to read whole at the pane's narrowest, and phrased
 * as an ask rather than a question so the strip stays quiet.
 */
export const SUGGESTION_POOL: readonly string[] = [
  "What is the car worth right now",
  "What is one share worth",
  "How many shares are outstanding",
  "What is the value per share",

  "Who are the co-owners",
  "What is the largest owner's stake",
  "How concentrated is ownership",
  "Is every owner KYC-cleared",

  "How much rent has the car earned",
  "How much is each owner's rent",
  "Pay this month's rent to owners",
  "What is the rent yield",

  "Break down the rent treasury",
  "What is our WETH exposure",
  "Which asset moved most",

  "What would a 10% ETH drop do to the treasury",
  "How sensitive is the treasury to BTC",
  "Where is the value heading",

  "How is the car token configured",
  "What compliance rules apply to transfers",
  "What happens if we sell the car",
  "How much would a buy-out cost",
];

/**
 * Drawn on the server, once per request, and handed down as a prop. The layout
 * is already `force-dynamic`, so a fresh four cost nothing and arrive in the
 * first paint — drawing in the browser instead would rewrite all four lines a
 * beat after the reader's eyes had reached them.
 */
export const pickSuggestions = (): readonly string[] =>
  sampleSize(SUGGESTION_POOL, PICK_COUNT);
