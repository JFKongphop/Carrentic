# Deploying Carrentic to Vercel

The web app (`apps/web`) is a Next.js app in a pnpm workspace. It deploys to
Vercel with the config already in this repo (`apps/web/vercel.json`).

## One-time setup

1. **Import the repo** into Vercel (New Project → pick this Git repo).
2. **Root Directory** → set to `apps/web`. Vercel then auto-detects Next.js and
   uses `apps/web/vercel.json` (framework `nextjs`, `pnpm install`, `next build`).
   - `buildCommand` is plain `next build` (not the repo's `with-env` script) so
     the build doesn't need a local `.env` — Vercel injects env vars instead.
3. **Node version** → 22.x (pinned via `engines` in `apps/web/package.json`).
4. **Environment Variables** (Project → Settings → Environment Variables) — add
   each of these (values come from your local `.env`, which stays gitignored):

   - `HEDERA_NETWORK`
   - `HEDERA_OPERATOR_ID`
   - `HEDERA_OPERATOR_EVM`
   - `HEDERA_OPERATOR_KEY`
   - `HEDERA_COUPON_TOPIC`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `UNISWAP_API_KEY`
   - `GRAPH_API_KEY`

5. **Deploy.**

## Plan requirement

- `/api/issue` and `/api/chat` set `maxDuration = 300`. The **Hobby (free) plan
  caps functions at 60s**; the tokenize+mint chain takes ~20–30s, so it usually
  fits under 60s but is not guaranteed. **Vercel Pro** is the safe choice for the
  full 5-minute budget.

## Notes / caveats

- **Public `/api/issue`**: once live, anyone can call it, and it signs real
  (testnet) transactions with your operator key. Keep it on **testnet** only, and
  consider adding rate limiting or auth before sharing the URL widely.
- **Rotate** the API keys after the event (they were used locally during dev).
- **3D models**: `apps/web/public/models` is ~42 MB (the 58 MB `bmwM8.gltf` was
  removed; the fleet keeps the BMW E34). These ship as static CDN assets.
- **The pitch deck** (`deck/carrentic.html`) is separate and not part of this
  deploy. Its slide-1 live car points at `localhost:3001`; if you want the car on
  a deployed deck, change that iframe URL to your Vercel domain (or use the static
  `porsche.png` fallback).
