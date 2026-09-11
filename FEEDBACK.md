# Uniswap developer feedback — Carrentic

Notes from building on the **Uniswap Trading API** for the ETHGlobal "Best
Uniswap Stack Contribution" track.

## How we used it

Carrentic uses the Trading API as a **live price oracle**, not as a swap venue.
Every USD figure in the product — a car's NAV, the treasury value, and the rent
paid out to owners — is marked to Uniswap prices instead of a hard-coded number.

- Base URL `https://trade-api.gateway.uniswap.org/v1`, auth via the `x-api-key`
  header.
- `POST /quote` on Ethereum **mainnet** (chain 1), where the deepest liquidity
  and the most trustworthy prices live.
- `priceUsd(token)` quotes `token → USDC` to get the USD price of one whole
  token (USDC is our unit of account).
- `quoteRentPayout(usd)` quotes `WETH → USDC` to price a rent payout: the rent a
  car earns (held as WETH) converted to USDC for distribution to owners, at the
  live rate.
- `computeNav(portfolio)` sums those live prices into the fund/car NAV.

Relevant code: `packages/uniswap/src/{config,quote,nav}.ts`.

## What worked well

- **One endpoint, one header.** A single `POST /quote` with `x-api-key` was
  enough to get real prices — no SDK, no on-chain calls, no pool math on our
  side. That made "mark this number to the market" a one-function change.
- **Mainnet quotes are honest.** Routing across real liquidity meant the NAV and
  rent numbers reflect actual prices, which is exactly what a tokenized-asset
  dashboard needs.
- **The quote response is enough to build on** — the output amount plus the
  route let us compute both a spot price and a payout in one round trip.

## Rough edges

- **The API is execution-shaped; we only wanted a price.** `/quote` is the front
  of a swap flow (quote → approve → Permit2 → swap), so a read-only consumer
  gets back routing and permit-oriented fields it doesn't need. A documented,
  lightweight **indicative/spot-price** path for apps using Uniswap as an oracle
  (rather than a trading venue) would be a great addition.
- **Base-unit → number conversion bites on 18-decimal tokens.** Quote amounts
  come back in base units; converting a WETH (18 dp) amount straight to a JS
  `Number` overflows precision, so we had to scale down with `pow10` before
  dividing. A short note (or a tiny helper) in the docs about safe decimal
  handling would save people this footgun.
- **Getting started as a "just give me a price" user.** The gateway base URL and
  the `x-api-key` auth weren't the first thing we found — most examples assume
  you're executing a swap. A "price a token in USD in 10 lines" quickstart would
  onboard oracle-style integrations faster.

## Suggestion

Publish a first-class, read-only **price/indicative-quote** entry point (or
clearly flag `/quote` for this use), with a decimals-safe example. A lot of RWA
and dashboard projects don't want to swap — they want Uniswap to be the source
of truth for *what something is worth right now* — and that path could be even
smoother than it already is.
