<p align="center">
  <img src="covers/icon.png" alt="Carrentic" width="120" />
</p>

# Carrentic — Own the car. Earn its rent.

Carrentic turns a **real car into shares**. A car becomes an ERC-3643 security
token on Hedera; people buy a share, the car is rented out, and the rent flows
back to every owner on-chain, pro-rata to what they hold. An **AI fleet manager**
watches the car and drafts the on-chain actions, while the car's value and the
rent owners receive are priced against a live market through **Uniswap** — not a
hard-coded number.

Tokenizing a car is a single click: no wallet, the platform signs as the issuer
the way a real securities issuer does, and every step settles on **Hedera
testnet**, verifiable on HashScan.

Built for **ETHGlobal** — Hedera (Tokenization of Anything), Uniswap, and OpenAI.

## How it works

A car is issued as an ERC-3643 security token through the Asset Tokenization
Studio (ATS). The whole deploy-and-mint chain runs **server-side and
operator-signed** over the Hashio JSON-RPC relay — there is no wallet in the
flow, because the platform signs as the issuer. Once a car is tokenized, its
value and the rent paid to owners are marked to live market prices through the
Uniswap Trading API, and an OpenAI fleet manager reasons over the position and
drafts the next on-chain action for the owner to approve.

## Core flow

```text
tokenize a car
  -> deploy an ERC-3643 token on Hedera (operator-signed, no wallet)
  -> grant KYC / issuer / SSI roles, register the issuer, grant KYC to treasury
  -> mint 1,000 ownership shares to the treasury
  -> owners hold KYC-gated shares (non-compliant transfers revert)
  -> the car is rented out
  -> rent is priced through Uniswap and split pro-rata
  -> the AI fleet manager drafts the on-chain payout
  -> owners are paid on-chain, verifiable on HashScan
```

## Sponsor responsibilities

- **Hedera** — a real-world asset (a car) as a compliant ERC-3643 token via ATS,
  deployed and minted server-side over the Hashio relay, verifiable on HashScan
  (example car token: `0.0.10478278` on testnet).
- **Uniswap** — the car's NAV and the rent owners are paid are computed live
  through the Uniswap Trading API (`computeNav`, `priceUsd`, `quoteRentPayout`),
  so the dashboard's numbers are market prices, not fixed figures.
- **OpenAI** — the AI fleet manager reads the car's position, answers questions
  about value/owners/rent, and drafts the on-chain actions owners act on.

## Repository layout

| Path | What it is |
|---|---|
| [`apps/web/`](apps/web) | Next.js app — splash, fleet, tokenize (`/issue`), owners & rent, the isolated 3D `/showcase`, and the API routes (`/api/issue`, `/api/chat`). |
| `packages/hedera/` | ERC-3643 / ATS deploy + mint over Hashio (ethers v6, operator-signed) and Mirror Node reads. |
| `packages/uniswap/` | NAV and rent pricing through the Uniswap Trading API. |
| `packages/agent/` | The AI fleet manager (LangChain + OpenAI). |
| `packages/fund/` · `packages/db/` · `packages/api/` | Car/fund model, persistence, and the app's data gateway. |
| `packages/ui/` | Shared UI + fonts (Geist Mono). |
| `tooling/` | Shared `tsconfig`, ESLint, and Prettier config packages. |
| [`deck/carrentic.html`](deck/carrentic.html) | The 1-minute pitch deck (self-contained). |
| [`DEPLOY.md`](DEPLOY.md) · [`step.txt`](step.txt) | Vercel deploy guide and the demo click-through. |

## Tech stack

TypeScript, Next.js (App Router) + React 19, react-three-fiber for the 3D cars,
a pnpm + Turborepo monorepo — plus `@hashgraph/asset-tokenization-*` and
`ethers` v6 for Hedera, the Uniswap Trading API for pricing, and
`@langchain/openai` for the agent.

## Running it

Requires **Node 22** and a filled-in `.env` (copy from `.env.example`; the real
`.env` stays gitignored).

```bash
# from the repo root
pnpm install
pnpm -F web build
pnpm -F web start      # production server on http://localhost:3001
```

For development with hot reload:

```bash
pnpm -F web dev        # http://localhost:3001
```

**Environment variables** (see `.env.example`): `HEDERA_NETWORK`,
`HEDERA_OPERATOR_ID`, `HEDERA_OPERATOR_EVM`, `HEDERA_OPERATOR_KEY`,
`HEDERA_COUPON_TOPIC`, `UNISWAP_API_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`.

## Demo

Open `http://localhost:3001` and follow the four pages (also in
[`step.txt`](step.txt)):

1. **Landing** (`/`) — the pitch; click **Enter the fleet**.
2. **Tokenize** (`/issue`) — one click deploys the ERC-3643 token and mints the
   shares; open the **HashScan** link.
3. **Fleet** (`/fleet`) — the live token, its value (marked via Uniswap), and
   the co-owners.
4. **Owners & rent** (`/accounts`) — who owns shares and their pro-rata rent.

## Deploy

Deploys to Vercel with the config in `apps/web/vercel.json`. Set **Root
Directory = `apps/web`**, add the environment variables above, and deploy. Full
steps and caveats (the `/issue` timeout on the free plan, key rotation) are in
[`DEPLOY.md`](DEPLOY.md).

## Notes

- Hedera work stays on **testnet**. Keep no mainnet key on a public deploy —
  `/api/issue` signs with the operator key.
- No credentials belong in this repository; secrets live only in `.env`.
