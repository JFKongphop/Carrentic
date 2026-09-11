# PLAN — Assetic: Tokenized Fund on Hedera (major) + Uniswap (minor)

> **Product name: Assetic** — _tokenize anything, administered by AI._
>
> Working plan for repurposing **OpenLedger CFO** (a personal double-entry
> finance terminal) into **Assetic**, an **AI fund administrator for a
> tokenized asset**. Discussion doc — not yet implemented.
>
> Naming: "Assetic" is the product/brand name used across README, UI, and the
> agent persona. Package scope stays `@openledger-cfo/*` unless we do a full
> rename pass (low priority — cosmetic, not demo-critical).

## 1. Direction

Pivot the existing app from personal income/expense tracking to **investment /
tokenized-asset management**, targeting two ETHGlobal sponsor prizes:

- **Major — Hedera "Tokenization of Anything" ($6,000).** Issue and manage a
  tokenized security via the **Asset Tokenization Studio (ATS)** on Hedera
  testnet. This is the hero; aim to _place_, not just qualify.
- **Minor — Uniswap "Best Uniswap Stack Contribution" ($3,000).** Integrate the
  Uniswap stack as the **NAV / pricing oracle** for the fund's holdings. Bank
  it as a bonus, not a fight we pick.
- **Stretch — The Graph "Best AI Tooling or AI Use Case" ($5,000).** Use The
  Graph (Subgraph MCP + a Uniswap subgraph) as the agent's **live blockchain-data
  source** for NAV/pricing + analytics. Their own examples name "portfolio
  copilots, risk monitors" — that is Assetic's agent. **Attempt only after
  Hedera + Uniswap core is solid.** See §10.
- **OpenAI** — the LLM engine for the agent. Not a prize, invisible infra,
  cheap. Reuse the existing OpenAI-compatible AI Gateway Config.

### The product in one line

> **Assetic** — a tokenized bond/fund on Hedera whose NAV is priced live off
> Uniswap, run by an OpenAI agent, with the existing double-entry ledger as the
> accounting backbone and holder register.

### Why this fits our codebase

- The **double-entry ledger is the moat.** ATS explicitly favors "real lifecycle
  management over a token with a name on it." We already have real books:
  cost basis, holder register, coupon/distribution accounting reconcile for free.
- The AI layer already speaks an **OpenAI-compatible gateway** — drop-in.
- The **UI is already polished** — huge demo advantage; we reuse ~90% of it.

### Lock the asset: a TOKENIZED BOND

Pick a concrete asset with an obvious lifecycle judges recognize:
**issue → KYC investor → coupon payment → redemption at maturity.**
A bounded beginning/middle/end demos far better in 5 minutes than an
open-ended "fund." Listed explicitly in the Hedera track ideas.

## 2. Why Hedera + Uniswap coexist cleanly (no hard cross-chain)

- **Hedera = the asset + its rules.** The ERC-3643 security token and every
  lifecycle event (issue, KYC, coupon, redeem) live on Hedera testnet.
- **Uniswap = what the asset is worth.** We only _read_ Uniswap prices to
  compute NAV, then _post_ NAV to the Hedera side. No bridging, no settlement
  across chains.
- ERC-3643 transfers are compliance-gated, so the security token cannot (and
  should not) trade on a permissionless Uniswap pool — which is exactly why
  Uniswap stays in the valuation role, not the execution role.

```
Uniswap API ──prices──► Ledger computes NAV ──► OpenAI agent decides
                                                      │
                                                      ▼
                        Hedera ATS token: issue / KYC / coupon / redeem
                                                      │
                                                      ▼
                        Ledger records the posting + updates holder register
                                                      │
                                                      ▼
                              Web UI: NAV chart, cap table, HashScan links
```

## 3. Architecture — mapping onto current packages

Legend: 🟣 Hedera/ATS · 🦄 Uniswap · 🤖 agent · 🧾 ledger

| Package                           | Change                                                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/hedera` _(new)_         | 🟣 Hedera SDK + ATS integration — deploy & manage the ERC-3643 token on testnet, KYC grants, transfers, coupon distributions, redemption. **The hero and the risk.** |
| `packages/uniswap` _(new, small)_ | 🦄 Uniswap API → price the fund's underlying holdings → feed NAV. The whole minor integration.                                                                       |
| `packages/agent`                  | 🤖 CFO persona → **fund-admin / CIO persona**; new tools: `issueShares`, `grantKYC`, `computeNAV`, `distribute`, `redeem`.                                           |
| `packages/openledger` (ledger)    | 🧾 The fund's books: holder register, per-share cost basis, NAV, distributions. Minimal new work, big credibility.                                                   |
| `packages/db`                     | Fund config, investor KYC status, NAV snapshots (+ existing gateway config).                                                                                         |
| `apps/web`                        | Relabel panes, re-point data. Reuse the grid/skeleton system.                                                                                                        |
| `packages/ui`                     | **No change** — keep the design system as-is.                                                                                                                        |
| `packages/demo`                   | New seed: a bond, a couple of KYC'd holders, sample holdings.                                                                                                        |

## 4. UI pane mapping (reuse ~90%, relabel content)

All 7 routes carry over. **No page added or deleted.** Keep every pixel of the
design; fully convert the vocabulary (no "THB", "mortgage", "budget",
"savings rate" may survive into the demo).

### `/` — "Everything" → **Fund Overview**

| Current pane     | Becomes                                                             | Powered by |
| ---------------- | ------------------------------------------------------------------- | ---------- |
| `Vitals`         | Fund vitals: NAV/share, AUM, shares outstanding, yield, next coupon | 🦄 · 🧾    |
| `FlowPane`       | Distribution flow: subscriptions vs coupons/redemptions             | 🟣 · 🧾    |
| `ActionPane`     | Lifecycle queue: KYC approvals, coupon due, maturity, agent recs    | 🟣 · 🤖    |
| `TrajectoryPane` | NAV trajectory over time                                            | 🦄 · 🧾    |
| `TapePane`       | On-chain event tape, each row links to **HashScan**                 | 🟣         |
| chat pane        | Fund-admin agent (same pane, new persona)                           | 🤖         |

### `/accounts` → **Fund Books / Portfolio**

| Current pane            | Becomes                                                    | Powered by |
| ----------------------- | ---------------------------------------------------------- | ---------- |
| `CompositionStrip`      | Allocation strip (asset weights)                           | 🦄 · 🧾    |
| `InvestmentsPane`       | Underlying holdings, marked to market                      | 🦄         |
| `BanksPane`             | Reserves / cash leg                                        | 🧾         |
| `LoansPane`/`CardsPane` | Issued securities (token as liability, shares outstanding) | 🟣 · 🧾    |
| Totals (Net worth/Owed) | AUM / NAV and shares outstanding                           | 🦄 · 🧾    |

### `/accounts/[id]` → **Account / Position detail**

| Current pane    | Becomes                                                              | Powered by |
| --------------- | -------------------------------------------------------------------- | ---------- |
| `AccountHead`   | Account header (security or an asset holding)                        | 🧾         |
| `VizRow`        | Valuation / event charts (price history, par vs market)              | 🦄         |
| `PostingsTable` | Postings: issuance → coupon → redemption, or asset valuation entries | 🧾 · 🟣    |

### `/ingest` → **Onboarding & Issuance intake** (heaviest reuse)

| Current pane | Becomes                                                                | Powered by |
| ------------ | ---------------------------------------------------------------------- | ---------- |
| `FileList`   | Documents (investor KYC / bond term sheet)                             | 🧾         |
| `RunFeed`    | Onboarding run: agent reads doc → proposes KYC grant / issuance params | 🤖 · 🟣    |
| `InfoPane`   | Extracted terms (coupon rate, maturity, holder identity)               | 🤖         |
| `CliLog`     | On-chain tx log (Hedera calls streaming live)                          | 🟣         |

### `/plan` → **Mandate & Schedule**

| Current pane    | Becomes                                | Powered by |
| --------------- | -------------------------------------- | ---------- |
| `GoalsPane`     | Investment mandate / target allocation | 🤖 · 🧾    |
| `BudgetsPane`   | Allocation limits / risk caps          | 🦄 · 🧾    |
| `RemindersPane` | Coupon & maturity calendar             | 🟣         |

### `/loop` (Automation, "coming soon") → **Automation**

Hedera **Scheduled Transactions** for auto coupon payments / maturity
settlement. ATS _extra-points_ item. Ship only if Hedera core is done.

### `/marketplace` ("coming soon") → **Secondary Market**

Compliance-gated secondary market for the ATS token (KYC-enforced transfers).
ATS _extra-points_ item. Ship only if Hedera core is done.

## 5. Scope order (obey strictly — Hedera is the risk sink)

1. **Hedera ATS spike (day one, in isolation).** Before any UI: issue an
   ERC-3643 token on Hedera testnet, KYC an address, do ONE lifecycle op
   (transfer or coupon distribution), verify on HashScan. _If this drags or
   fails, we have no submission — find out first._
2. **Ledger models the fund** — holder register, NAV, distributions.
3. **Uniswap NAV oracle** — small, documented; this IS the whole Uniswap submission.
4. **Agent drives the lifecycle** — issue → distribute → redeem.
5. **UI relabel + demo polish.**
6. **(Stretch, if core is solid) The Graph** — Subgraph MCP + Uniswap subgraph
   as the agent's live data layer for NAV/analytics (§10).
7. **(If time) extra points** — Scheduled Transactions (`/loop`), secondary
   market (`/marketplace`).

## 6. Submission gates (disqualifying if skipped)

### Hedera — Tokenization of Anything

- [ ] Use ATS (SDK / contracts / web app) to issue or manage a tokenized asset
- [ ] Deploy and demonstrate on **Hedera testnet**
- [ ] Public GitHub repo (README + setup), contracts **verified on HashScan**
- [ ] Demo video **≤5 min**: issuance + configuration + ≥1 lifecycle op
      (transfer / compliance check / distribution)
- [ ] Explain which Hedera features/SDKs used; team names + contacts
- Extra points: secondary market, compliance controls (KYC/freeze/pause),
  custom fee schedules / coupons / dividends, oracle for NAV, scheduled
  transactions, upstream contributions to ATS.

### Uniswap — Best Uniswap Stack Contribution

- [ ] Public open-source GitHub repo
- [ ] **`FEEDBACK.md`** in the repo
- [ ] Completed **Uniswap Developer Feedback Form** linking to FEEDBACK.md
      (https://developers.uniswap.org/hackathon-feedback)
- [ ] README points at the **exact contracts / lines of code** for the Uniswap
      integration

### The Graph — AI Use Case (stretch, see §10)

- [ ] Graph as a load-bearing data source (Subgraph MCP / Uniswap subgraph)
- [ ] **Live** data via `GRAPH_API_KEY` (Subgraph Studio) — no mocked/static data
- [ ] Meaningful work (agent reasoning / NL), not a raw query dump
- [ ] Public repo + README/`FEEDBACK.md` + 2–4 min demo; declare **Continuity** pool

### All

- [ ] Live, demoable build (already cleared — the app runs)
- [ ] No personal-finance vocabulary left in the demo

## 7. Risks & honest notes

- **ATS is a load-bearing unknown.** The entire major prize rests on an SDK we
  haven't touched (ERC-3643, testnet deploy, HashScan). De-risk via the day-one
  spike. Check current ATS docs before implementing — do not assume the API.
- **Ledger retrofit could be a tar pit.** `oled` is currency-denominated;
  bending it to share-based NAV/cost-basis is clean but can eat time. A
  _convincing_ holder register beats a _perfect_ one for a 5-min demo.
- **Scope creep toward "both equally."** Resist making Uniswap fancy (real
  swaps). Uniswap-as-oracle is enough for the $3k stack prize. Time goes to ATS.
- **The stricter $7k "Best Uniswap API Integration"** needs core trade
  execution — out of scope. Target the $3k stack prize as the floor.

## 8. Lessons from previous Hedera tokenization winners

Analyzed two prior winners in `hedera-prev-tokenization-winner/`:
**Mint & Chill** (ethlisbon — a real RWA tokenization project) and
**nook-rent** (an agentic-payments/escrow project; reference for engineering,
not lifecycle — its own docs say it did *not* target the Tokenization track).

### 🚨 Key finding — ATS vs plain HTS (unresolved decision)
**Neither winner used the Asset Tokenization Studio, ERC-3643, or ERC-1400.**
Both built compliance on **native HTS + the Hedera SDK**, using HTS's native
compliance keys (KYC / Freeze / Wipe / Pause) to enforce rules at the network
level. This conflicts with our track's requirements.txt, which explicitly says
"Use the Asset Tokenization Studio."

**Decision (resolve in the day-one spike):** spike **ATS (ERC-3643) first** to
satisfy the literal requirement, but architect the token behind a **port /
adapter** (hexagonal, per nook-rent) so plain HTS — the *proven* winner — can be
swapped in without a rewrite if ATS proves too heavy for the timeframe.

> **UPDATE (2026-09-10 — see §9c):** ATS confirmed **feasible** (pre-deployed
> testnet factory/resolver, native Bond type). Key constraint discovered: the
> ATS SDK has **no backend private-key signer** — issuance is browser (MetaMask)
> or KMS. Approach chosen: **web app first, then integrate the SDK**, HTS still
> the port-level fallback. Full detail in §9c.

### Our differentiator (a gap in both winners)
Neither implemented **coupons/dividends** or a **NAV oracle**. Our bond
lifecycle (issue → KYC → **coupon** → redeem) + Uniswap NAV extends exactly
where they stopped.

### Patterns to copy (apply regardless of ATS vs HTS)
- **Compliance-key mapping** — conditionally attach KYC/Freeze(+freezeDefault)/
  Wipe/Pause/Supply/FeeSchedule keys at token creation. Ref:
  `ethlisbon/apps/platform/src/lib/hedera/tokenService.ts` (`createToken`).
- **Redemption** — two templates: `wipeAllFungible` (wipe key) and
  allowance-based `reclaimViaAllowanceNow` (holder consents once — cleaner for
  bond maturity). Same file.
- **Idempotency** — pre-reserve a `TransactionId`; on submit error re-query the
  receipt by that id. Ref: `nook-rent/packages/hedera/src/sdk-helpers.ts`
  (`executeReservedTransaction`). Critical for coupon runs / redemption
  (double-payment is catastrophic).
- **Mirror Node = confirmation authority** — confirm on-chain before flipping DB
  to "confirmed"; model a `reconciling` state for indexing latency. Refs:
  `ethlisbon/.../mirrorNode.ts` (`waitForTokenAllowance`),
  `nook-rent/packages/hedera/src/mirror-node.ts`.
- **HCS audit trail** — versioned envelope + PII-blocking regex + byte cap +
  Mirror read-back. Ref: `nook-rent/packages/hedera/src/evidence.ts`. Strong
  compliance story: log every coupon/redemption event to HCS.
- **Scheduled coupons (HIP-423)** — `ScheduleCreateTransaction` +
  `setExpirationTime` + `setWaitForExpiry(true)`. Ref:
  `ethlisbon/.../scheduleService.ts`. But amount is fixed at creation and expiry
  caps at ~62 days → NAV-linked coupons need an off-chain worker + Mirror balance
  read at execution (`liveness.ts` pattern).
- **LLM never touches money** — amounts/tokens/recipients/NAV all come from
  validated stored state; agent passes only an id. Read/write MCP split. Refs:
  `ethlisbon/apps/agent/mcps/hedera/write_server.py`, and nook-rent's rule that
  LLM output stays out of financial/authorization decisions.
- **Architecture** — adopt nook-rent's hexagonal `pnpm` monorepo: `packages/core`
  owns domain + ports; `packages/hedera` is a swappable adapter. Makes the
  ATS↔HTS swap a new adapter behind the same port.

### Pitfalls to avoid
- **Key format (DER vs raw)** — the #1 documented pain ("signatures did not
  match"). Nail this in the spike (`ethlisbon/feedbacks/hedera.md`).
- **SDK fork mismatch** — pick `@hiero-ledger/sdk` OR `@hashgraph/sdk`, never
  mix (wallet-connect libs bind to one; two copies of `AccountId`/`Transaction`
  break silently). Mint & Chill chose `@hiero-ledger/sdk` for wallet-connect.
- **Single operator key** — hackathon-only shortcut; a bond should split keys
  and authenticate admin endpoints (both winners flagged this).
- **NFT per-serial** — both stubbed it. If the bond is a tranche/series of NFTs,
  budget for per-serial minting neither built. (Fungible shares avoid this.)

## 9. Local run notes (env-specific)

- Node **22** required (native `better-sqlite3` fails to build on the local
  Node 26). No version manager installed; `node@22` is Homebrew keg-only.
  Prefix project commands:
  ```bash
  export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
  ```
- `oled` CLI is installed **locally** (dev dependency), not global; run via
  `pnpm` so `node_modules/.bin` is on PATH.
- Serve: `pnpm build && pnpm serve` → http://localhost:3001

## 9b. Deployment & data (decided)

Two data stores, deployed differently:

| Store | Managed cloud DB? | How it deploys |
|---|---|---|
| **`oled` ledger** (`.oled/ledger.db`) | ❌ impossible — `oled` writes a local **SQLite file** (`dbPath` is a filesystem path, no connection string) | **persistent volume** on the app host |
| **Control plane** (`packages/db`) | ✅ **Railway Postgres** (user has one; `DATABASE_URL`) | connect over the network from anywhere |

**Decisions:**
- **Control plane → Railway Postgres.** Migrate drizzle `sqlite` (`better-sqlite3`,
  `sqliteTable`) → `pg` (`pgTable`). `DATABASE_URL` lives in `.env` (secret).
  **Use the PUBLIC url** (`*.proxy.rlwy.net`), not the internal
  `*.postgres.railway.internal` — the app is not hosted on Railway, so the
  internal host is unreachable.
- **`oled` ledger → volume.** Cannot go into Postgres (or any managed DB). It is
  a file; it needs a writable persistent disk wherever the app runs.

**App host: Fly.io (Docker image, deployed manually by the user).** Satisfies
the constraint — the app spawns the `oled` binary and needs a writable volume +
Node 22, which Fly.io (container + volumes) provides; serverless (Vercel/Netlify/
Cloudflare) would not. DB stays on Railway, app on Fly → cross-provider, so the
app uses Railway's **public** `DATABASE_URL`.

Fly.io deploy essentials (Step 6/7, user-driven):
- **Dockerfile** on **Node 22**; install the `oled` CLI (`@aquartier/openledger`)
  into the image so it is on `PATH`.
- **`fly volumes create`** and mount it at the `.oled/` path so `ledger.db`
  persists across deploys; point `OLED_CONFIG`/`dbPath` at the mounted volume.
- Set secrets via `fly secrets set` (`DATABASE_URL` public url, `HEDERA_*`,
  `UNISWAP_API_KEY`, `OPENAI_API_KEY`, `GRAPH_API_KEY`).

**Timing:** develop locally first; do the Postgres migration + deploy at
Step 6/7, after the Hedera spike proves out. Do not let deployment distract from
the day-one spike.

## 9c. ATS findings (hard-won — 2026-09-10 research + install)

Investigated the Hedera **Asset Tokenization Studio** to resolve the ATS-vs-HTS
question from §8. Installed `@hashgraph/asset-tokenization-sdk@8.0.0` and read
its source + the official docs/repo.

### Feasibility: ✅ ATS is viable — no contract deployment needed
- **Pre-deployed testnet contracts** (point the SDK/app at these, the factory
  deploys each token instance): from `apps/ats/web/.env.example` —
  - Factory `0.0.9213391`, Resolver (Business Logic) `0.0.9212226`
  - (the SDK integration doc shows different example ids `0.0.7708432` /
    `0.0.7707874` — the hosted app has its own baked in; treat exact ids as
    environment-specific and read them from the source you use)
  - RPC `https://testnet.hashio.io/api` (chain **296**),
    Mirror `https://testnet.mirrornode.hedera.com/api/v1/`
- **Native Bond type** + KYC/compliance. Clean SDK API: `Bond.create` /
  `Equity.create`, `Kyc.grantKyc`, `Security.transfer`, `Network.init`,
  `Network.connect`.
- **Hosted demo app:** https://tokenization-studio.hedera.com/ (testnet, factory/
  resolver pre-configured) — issue a bond by connecting a wallet, no local build.
- npm: `@hashgraph/asset-tokenization-sdk` (v8). Node ≥ 20.19.4 (we run 22).
- ATS depends on **`@hiero-ledger/sdk`** → this settles the SDK-fork choice from
  §8: use `@hiero-ledger/sdk`, never `@hashgraph/sdk`, to avoid a double-SDK clash.

### 🔑 Critical constraint: no backend raw-private-key signer
`SupportedWallets` in the installed SDK (v8):
`METAMASK`, `HWALLETCONNECT` (HashPack/Blade), `DFNS`, `FIREBLOCKS`, `AWSKMS`.
The plain **`CLIENT` (raw private key) signer is commented out.** So ATS signs
either **in a browser wallet** (MetaMask/WalletConnect) or via a **custodial KMS**
(DFNS / Fireblocks / AWS KMS). **There is no `.env` private-key backend mode.**

**Consequences:**
- A headless backend script cannot issue/sign ATS transactions with the operator
  key. Issuance is a **client-side (browser + MetaMask) flow**, or KMS-signed.
- Our operator account is **ECDSA** (has an EVM address `0xdb3e…`) → MetaMask
  compatible; the same key can be imported into MetaMask to sign.
- Agent **proposes** actions; the issuer's **wallet signs** — aligns with the
  winners' "LLM never touches keys" rule (§8).
- Automated coupons can't use MetaMask (needs a human click) → either
  **admin-clicked** signing (fine for demo) or a **KMS** signer for autonomy.
- The ATS SDK is a heavy browser bundle (react-native / walletconnect / viem) →
  **bundling into Next.js 16 is a known integration risk** for Phase 2.

### Chosen approach (user decision, 2026-09-10)
**"Web app first, then integrate."**
- **Phase 1 (now):** issue a real Bond via the **hosted ATS app** with the user's
  MetaMask (operator account imported), grant KYC + one transfer, verify on
  HashScan. Fastest proof; zero local build; confirms ATS works with our account.
- **Phase 2:** integrate `@hashgraph/asset-tokenization-sdk` into Assetic's own
  UI (MetaMask signing), behind the swappable port so plain HTS stays the
  fallback if the browser-bundle integration fights us.

### Scaffolding done + read layer verified (2026-09-10)
`packages/hedera` (`@openledger-cfo/hedera`) built and typechecking clean:
- `config.ts` — ATS testnet addresses (env-overridable), Mirror/RPC URLs, HashScan links
- `mirror.ts` — Mirror Node REST reads (token info, holders, account tokens/balance)
- `port.ts` — the swappable seam: `TokenizationWritePort` (ATS/HTS adapters) + `TokenizationReadPort`
- `mirror-read-port.ts` — Mirror-backed read view, live server-side now
- `scripts/verify-mirror.ts` — `pnpm -F @openledger-cfo/hedera verify [tokenId]`

Verified against live testnet: operator `0.0.10443181`, 1000 ℏ, 0 tokens yet.
Only **writes/signing** remain browser/KMS-bound (Phase 2 ATS adapter).

**ATS write-adapter scaffolded (2026-09-10, typechecks clean):**
`src/ats-adapter.ts` — **browser-only** (`@openledger-cfo/hedera/ats`), implements
`TokenizationWritePort` on the real ATS SDK v8 API (shapes read from the installed
package, not guessed):
- `initAts()` → `Network.init` (testnet + factory/resolver from config) + `Network.connect(METAMASK)`
- `issueBond` → `Bond.create(CreateBondRequest)` — KYC-gated via `internalKycActivated`; returns `security.diamondAddress` (the real id field; the docs' `tokenId` is wrong)
- `grantKyc` → `Kyc.grantKyc` · `transfer` → `Security.transfer` · `redeem` → `Bond.fullRedeemAtMaturity`
- `payCoupon` → stubbed pending a live coupon bond to confirm the exact call

Phase-2 TODOs (in code): `configId`/`configVersion` from the live resolver, a real
`vcBase64` credential for KYC, the coupon-distribution call, currency format.

**Issuance UI built + the bundling risk is SOLVED (2026-09-10, `pnpm build` green):**
- Route `apps/web/src/app/issue/page.tsx` + client form
  `src/components/issue/issue-bond.tsx` (`"use client"`), on `initAts`/`atsWritePort`,
  dynamic-importing `@openledger-cfo/hedera/ats` at call time so the SDK never SSRs.
- **The flagged Next-bundling risk is resolved.** Turbopack `resolveAlias` in
  `apps/web/next.config.js` stubs the ATS SDK's Node-only deps:
  `react-native`, `@mattrglobal/node-bbs-signatures` (native `.node`),
  `thread-stream` → empty shim (`apps/web/shims/empty.ts`);
  `pino` → `pino/browser.js` (browser build — supplies the `levels` export
  `@walletconnect/logger` needs, and drops thread-stream);
  `fs` → empty **browser-only** (`{ browser: ... }`, so the server ledger/sqlite
  keep real `fs`). Full `pnpm build` compiles clean; `/issue` is a live route.
- Note: Next 16 builds with **Turbopack** — a `webpack` config errors; use
  `turbopack.resolveAlias`.

### ✅ MILESTONE — a real tokenized bond is live on testnet (2026-09-10, HTS path)
The ATS **hosted app went down** (403 / blank render) mid-session, so we executed
the **HTS fallback** (the winners' proven native path, §8) headless with the
operator key — no browser, no wallet:
- Script `packages/hedera/scripts/hts-issue.ts` (add `@hiero-ledger/sdk` as a
  direct dep; run `pnpm -F @openledger-cfo/hedera exec tsx scripts/hts-issue.ts`).
- **Bond `0.0.10446760`** ("Assetic Demo Bond" / ADB, 1000 units, full native
  compliance keys: KYC/Freeze/Wipe/Pause/Supply/Admin), treasury `0.0.10443181`.
- **Full lifecycle SUCCEEDED:** issue → create holder `0.0.10446761` → associate
  → grant KYC → transfer 100 units.
- **Verified through our own Mirror read layer** (`verify 0.0.10446760`): reads
  name/supply/treasury + holder register (`0.0.10446761`→100, treasury→900).
- HashScan: https://hashscan.io/testnet/token/0.0.10446760

**Status of the two token paths:**
- **HTS (fallback): WORKING end-to-end.** Unblocks all downstream work now.
- **ATS (primary, for the literal requirement): scaffolded** (adapter + `/issue`
  UI + green build), but blocked on the hosted app being down and the in-app
  MetaMask flow being untested. Revisit when the hosted app recovers or after
  driving `/issue` with the funded operator account in MetaMask.
- TODO: formalize the HTS script into `src/hts-adapter.ts` implementing
  `TokenizationWritePort` (the port is ready for it).

**Next:** ledger integration (record issuance + the holder register as double-entry
postings) → Uniswap NAV → agent. All can proceed on the live HTS bond now.

### ✅ MILESTONE 2 — ATS bond issued via the ATS web app (2026-09-10)
Ran the official ATS web app locally (`:4173`) with a **fresh Chrome profile
(MetaMask only)** — that fixed the recurring `ethereum.isConnected` multi-wallet
crash. Issued a real ERC-3643 bond through the Studio:
- **Bond `0.0.10457503`** (EVM `0x57d7197c704eeae8ff7a6711180740537231ee5e`),
  "Assetic Demo Bond"/ADB, ISIN US0378331005, USD, nominal 1000, max supply 1000,
  Reg S, Internal KYC on. **This is the token that satisfies the "use ATS" requirement.**
- Config chosen: Controllable+Blocklist on, Approval/Clearing off, Internal KYC on;
  no external compliance/identity/pause/control modules; Reg S w/ default OFAC block list.
- HashScan: https://hashscan.io/testnet/contract/0.0.10457503

**🔑 Architectural finding — ATS tokens are CONTRACTS, not HTS tokens.**
Mirror `/tokens/{id}` 404s for the ATS bond; it's an ERC-3643 EVM contract. Confirmed
via Mirror `/contracts/{id}` + ERC-20 `eth_call` (symbol()→"ADB", totalSupply()→0).
Consequences:
- Our HTS Mirror read layer works for the HTS bond (`0.0.10446760`) but NOT ATS.
- **TODO:** add an ERC-3643/ERC-20 read path to `packages/hedera` (JSON-RPC
  `eth_call` for name/symbol/decimals/totalSupply/balanceOf against the EVM
  address, or use the ATS SDK read queries) as a sibling of `mirror-read-port`.
- The two bonds exercise the two token models; the port seam already abstracts them.

**Immediate next on ATS bond:** mint 1000 (supply is 0, pending 1000) → grant KYC
→ transfer (the required lifecycle op). Then wire the ERC-3643 read path + ledger.

### ✅ MILESTONE 2b — ATS bond minted + KYC'd headless (2026-09-10)
This ATS web-app version exposes **no Mint button** (Operations→ERC1400 only has
"Hold"; ERC3643 blank). So we drove the deployed Diamond contract directly with
the operator key (`scripts/ats-mint.ts`, `@hiero-ledger/sdk`
`ContractExecuteTransaction`). Confirmed on-chain: **totalSupply = 1000,
balanceOf(operator) = 1000.**

**The ATS mint requirement chain (reverse-engineered from on-chain revert codes):**
`issue` reverts `0xfc855b1b` (recipient not KYC'd) → `grantKyc` reverts
`0xcd324f53` (AccountIsNotIssuer) → issuer must be registered via `addIssuer`,
which needs `ROLE_SSI_MANAGER`; and `issue` needs `ROLE_ISSUER`, `grantKyc` needs
`ROLE_KYC`. Operator is `DEFAULT_ADMIN` (`hasRole(0x00,op)=1`) so it self-grants.
Working order:
1. `grantRole(ROLE_SSI_MANAGER, op)` (also ROLE_KYC, ROLE_ISSUER — **not
   idempotent**: re-grant reverts `0xa6006e94`, so tolerate "already done")
2. `addIssuer(op)` — register operator as trusted SSI issuer
3. `grantKyc(op, vcId, validFrom=0, validTo=+10y, issuer=op)`
4. `issue(op, 1000, 0x)` — ERC-1594 mint
Role hashes: ROLE_KYC `0x754f…7bfc`, ROLE_ISSUER `0x5eea…a95f`,
ROLE_SSI_MANAGER `0x3120…5ee1`. This is the exact flow our own ATS write-adapter
(or the SDK) must follow for issuance/KYC/mint.

**ATS lifecycle now DONE via ATS:** issuance + configuration + KYC (compliance
check) + mint (distribution) — satisfies the Hedera demo requirement.

### ✅ MILESTONE 3 — full domain stack built & verified (2026-09-10)
All four backend layers built, typechecking (workspace 19/19), and verified live:

1. **ERC-3643 read path** (`packages/hedera`): `eth-call.ts` (JSON-RPC `eth_call`),
   `ats-read-port.ts` (name/symbol/decimals/totalSupply/balanceOf + holder
   register from contract logs), and `resolveReadPort(tokenId)` auto-detects
   HTS vs ATS. Verified: ATS bond `0.0.10457503` reads (supply 1000, holder
   register) AND HTS bond `0.0.10446760` reads — both through one dispatcher.
2. **Uniswap NAV** (`packages/uniswap`): `quote.ts` (Trading API
   `POST /v1/quote`, `x-api-key`, `BEST_PRICE`) + `nav.ts` (mark holdings →
   NAV/share). Verified live: WETH ~$2,462, WBTC ~$77,733; demo fund AUM
   ~$1.38M, NAV/unit ~$1,377 (+37.7% premium to par).
3. **Fund service + ledger integration** (`packages/fund`): `getFundSnapshot`
   composes Hedera read + Uniswap NAV; `recordIssuance` posts a real double-entry
   transaction to `oled` (`resolve:true` auto-creates accounts). Verified
   end-to-end: posted $1,000,000 issuance, debit `usd:asset:fund:reserve` /
   credit `usd:liability:security:assetic-bond` (tx returned).
4. **CIO fund-admin agent** (`packages/agent`): `personas/cio.ts` +
   `tools/fund.ts` (`getFund` tool → live bond+NAV+holders), registered as
   AgentKind `cio` (reuses the cfo skill, own persona). LLM reads validated
   state, never chooses amounts/prices (PLAN.md §8).

Verify commands: `pnpm -F @openledger-cfo/hedera verify <tokenId>` ·
`pnpm -F @openledger-cfo/uniswap verify` · `pnpm -F @openledger-cfo/fund verify --post`.

**Sponsors now both wired in code:** Hedera (ATS bond, read + on-chain lifecycle)
+ Uniswap (live NAV oracle), tied together by the fund service and driven by the
CIO agent — with the oled double-entry ledger as the accounting backbone.

### ✅ MILESTONE 4 — UI spine wired (2026-09-10)
- **Home `/`** is now the **fund overview** (`FundDashboard` component +
  `server/fund.ts` `loadFund`): NAV/unit, premium-to-par, AUM, units, live
  collateral marks (Uniswap), holder register (Hedera), HashScan links. Verified
  rendering live at :3001. (Old `/fund` route removed; `/` is canonical.)
- **`/issue`** ATS issuance page kept.
- **Rail nav relabeled** to the fund domain + `/issue` added: Fund · Cap table ·
  Issue · Schedule · Onboarding · Automation(soon) · Secondary market(soon).
- **Chat switched to the `cio` agent** (`api/chat/route.ts`), static fund
  briefing; live numbers via the `getFund` tool. (Chat needs the AI gateway
  configured in-app — OpenAI base URL + key + model — to run.)

**Decision: use ALL pages** (win-focused) — convert every route to the fund
domain; the extra pages double as Hedera extra-points features.

**UI approach (user decision):** *adapt the ORIGINAL beautiful panes to fund data* —
reuse the exact design (grid classes, `Cell` tiles, `Sparkline`, `TrajectoryPane`),
not a new UI. (A first attempt replaced `/` with a new plainer UI; reverted.)

### ✅ MILESTONE 5 — home `/` adapted to the fund in the original design (2026-09-10)
- `components/fund/fund-vitals.tsx` — reuses the Everything vitals band (`VITALS_*`
  grid, `Cell`, `Sparkline`) with fund numbers: NAV/unit (+ NAV sparkline),
  premium-to-par, AUM, units, coupon, holders + collateral segment strip.
- `components/fund/fund-panes.tsx` — CollateralPane / HolderPane / OnChainPane
  (Pane-based, fund data) placed in the FLOW / ACTION / TAPE grid slots.
- `TrajectoryPane` reused verbatim with a NAV series (`synthNavSeries` in
  `server/fund.ts` until we persist real NAV snapshots).
- `page.tsx` uses the original `EVERYTHING_GRID` + slots. Nav + CIO chat relabeled.
- **FLOW sankey reused** (`FundFlowPane`): the original `Sankey` diagram driven by
  fund flows — collateral (WETH/WBTC/Cash) → AUM → par + premium. Made `Sankey`
  accept optional `format`/`formatCompact`/`unitLabel` props (default THB, so the
  personal-finance flow is unchanged) so the fund can render it in USD.
- Verified rendering live at :3001 in the original layout, sankey included.

### ✅ MILESTONE 6 — `/accounts` = Cap table & fund books (2026-09-10)
Reuses the accounts grid (`ACCOUNTS_GRID`, `TOTALS_ROW`, `GROUP_COL`,
`INVESTMENTS_COL`, `STRIP_ROW`) + `Total` + the group-pane row/`Meter` styling
(`components/fund/fund-accounts.tsx`):
- Totals band: **Assets (AUM) · Liabilities (face) · Net (equity cushion)**
- Allocation strip (collateral weights)
- Collateral / Reserves / Issued-security panes (the balance sheet)
- **Cap table** (headline): holders + % ownership `Meter` + face value + HashScan verify
Live from `loadFund` (Hedera holders + Uniswap NAV). Verified at :3001, 0 RSC errors.
Fixed: the sankey RSC error (functions can't cross the server→client boundary) —
`Sankey` now takes a serializable `currency` string.

### ✅ MILESTONE 7 — `/plan` = Coupon & maturity schedule (2026-09-10)
`components/fund/fund-plan.tsx` reusing the plan grid (`PLAN_GRID`, `GOALS_COL`,
`SPLIT_COL`) + row/meter design (read-only, no tRPC): **SchedulePane** (coupon
dates from bond terms — 5% semi-annual $25k each + $1M redemption at maturity),
**MandatePane** (target allocation vs live), **RiskCapsPane** (exposure vs cap).
Verified at :3001.

**Remaining pages (per §4), same adapt-the-design approach:**
1. ✅ `/accounts` → cap table / holder register + fund books
2. ✅ `/plan` → coupon & maturity schedule
3. ✅ `/ingest` → KYC onboarding console (`fund-ingest.tsx`: KycRegistry /
   Onboarding steps / Compliance info / On-chain log — reuses the ingest grid)
4. ✅ `/marketplace` → secondary market (order book/trades/spread, compliance-gated) — extra points
5. ✅ `/loop` → automation (HIP-423 scheduled coupons/maturity) — extra points
6. ✅ `/accounts/[id]` → holder detail (units/%/KYC/HashScan); cap table rows link to it

### ✅ MILESTONE 8 — ALL pages converted (2026-09-10)
Every route is now the fund product in the original design; nav unmarked; no
personal-finance page survives. All 8 routes HTTP 200. Components in
`components/fund/*`; each page loads `server/fund.ts loadFund` (Hedera + Uniswap).

### ✅ MILESTONE 9 — full personal-finance cleanup (2026-09-10)
Scanned every rendered page; removed all residual personal-finance copy:
chat suggestions → fund-admin prompts; `TrajectoryPane` → currency-aware (USD for
NAV); all 5 loading skeletons (`app/loading.tsx` + accounts/plan/ingest/[id]) →
fund titles; `not-found` "Back to Everything" → "Back to Fund". Final scan: all 8
routes HTTP 200, zero personal-finance strings.

### ✅ MILESTONE 10 — the CIO agent ACTS on-chain: pays coupons (2026-09-11)
Turned the agent from read-only Q&A into an operator (the "interesting" gap vs the
prior winners, who had agents that *do* things):
- `packages/hedera/src/hcs.ts` (`@openledger-cfo/hedera/server`, backend-only):
  `submitCouponEvent` writes the coupon distribution to Hedera Consensus Service,
  operator-signed (audit topic `HEDERA_COUPON_TOPIC=0.0.10463022`).
- `packages/fund` `payCoupon()`: computes each holder's pro-rata interest from the
  live on-chain register, records it on-chain (HCS), and posts double-entry
  (interest expense ← reserve). Amounts computed server-side, never by the LLM.
- `packages/agent` `payCouponTool` + CIO persona + registry: the CIO calls it only
  when the user asks to pay. **Verified via chat**: "pay the coupon" → $25,000
  distributed, HCS seq incremented, ledger tx posted, HashScan link returned.
- Verified standalone too: `pnpm -F @openledger-cfo/fund exec tsx scripts/coupon.ts`.

### ✅ MILESTONE 11 — full agent-operated lifecycle (2026-09-11)
All four CIO actions built, on-chain, and verified via chat:
- **payCoupon** — pro-rata coupon → HCS audit + double-entry.
- **onboardInvestor** — **real on-chain** `grantKyc` + `transfer` from treasury
  (`packages/hedera/src/ats-write.ts` `onboardHolderOnChain`, operator-signed),
  + HCS + subscription posting. Verified: creates a fresh KYC'd holder (e.g.
  `0xc494…`, `0x1c85…`), both txns SUCCESS. The ATS bond now has multiple holders.
- **redeemAtMaturity** — settle par to all holders → HCS + double-entry.
- **rebalance** — drift vs mandate, each trade **sized + priced live via Uniswap**
  (`/quote`), recorded on HCS. Verified: SELL WETH $50.6k @ live price when 54%>50%.
Backend writes live in `@openledger-cfo/hedera/server` (`server.ts` barrels
`hcs.ts` + `ats-write.ts`); HCS event type generalized (`submitEvent`). Tools in
`packages/agent` (`onboardInvestorTool`/`redeemTool`/`rebalanceTool`) + CIO persona
+ registry. Guardrail intact: amounts from validated on-chain/Uniswap state, never
the LLM. Standalone: `pnpm -F @openledger-cfo/fund exec tsx scripts/{coupon,actions}.ts`.

**Assetic is now an autonomous AI fund administrator**: issue → onboard/KYC → pay
coupons → rebalance (Uniswap) → redeem, all on-chain + double-entry books. This
closes the "agent that acts" gap vs the prior winners, across a full lifecycle.

**Remaining: submission gates + deploy (no more features needed):**
- `FEEDBACK.md` (Uniswap) + Uniswap Developer Feedback Form
- README: point at Hedera + Uniswap code lines; contracts on HashScan
- Demo video ≤5 min (issuance + KYC + mint + NAV + a lifecycle op)
- Fly.io deploy (Node-22 Dockerfile w/ `oled`, volume for `.oled/`, Railway
  Postgres public URL, secrets)
- Optional real-data upgrades: persist NAV snapshots (replace `synthNavSeries`);
  wire the CIO chat's write tools to trigger a coupon.

**Note:** `synthNavSeries` is placeholder NAV history — replace with persisted
NAV snapshots (control-plane DB) when time allows.

## 10. Stretch — The Graph (AI Use Case track, Continuity pool)

**Prize:** "Best AI Tooling or AI Use Case with The Graph" ($5,000). **Attempt
only after Steps 1–4 (Hedera + Uniswap core) are solid** — it is a stretch, not
a pillar. Because it reuses the valuation pipeline it is cheap *if* the core is
done, and a distraction if it is not.

### Which of The Graph's two tracks — and why
- ✅ **Track B — "Best AI Tooling or AI Use Case."** Rewards an agent/app using
  The Graph as its **live blockchain-data source**; their examples literally
  name "portfolio copilots, risk monitors" = Assetic's agent.
- ❌ **Track A — "Composable or Standardized Graph Products."** A data-eng track
  (compose 2+ Graph products / standardized schema / author a Substreams
  module). Its own rules say *"simply querying one Subgraph… does not qualify;
  consider the Best AI Use Case track instead"* — it redirects us to Track B.

### Pool
**Continuity (Extend Open Source / Ship a Feature)** — Assetic is a pivot of an
existing AGPL open-source repo; the Graph integration is the new feature, and
only work done during the event is judged.

### Role in the product (reuses the valuation pipeline)
Use The Graph as the agent's **data layer for valuation/analytics**:
- **Subgraph MCP + a Uniswap subgraph** → the agent queries live pool/price data
  in natural language and computes NAV / risk / holder analytics.
- This is "meaningful work" (reasoning/decisions), not a raw query dump — the
  qualification bar.
- Synergy: one pipeline serves both **Uniswap (minor)** (sourcing AMM data) and
  **The Graph (stretch)** (Graph as the live source + agent reasoning).

### Technical catch
**The Graph does not natively index Hedera HTS** — the prior winner Mint & Chill
indexed their **EVM (Sepolia)** side, not Hedera. So The Graph attaches to the
**Uniswap/EVM** data (pricing/NAV), never the Hedera bond token directly. Do not
try to point a subgraph at Hedera.

### Requirements (do not skip)
- [ ] Consume **live** data from a Graph provider (Subgraph Studio API key —
      `GRAPH_API_KEY` in `.env`); mocked/static does not qualify
- [ ] Meaningful work with the data (agent reasoning / NL interface)
- [ ] Public repo + README/`FEEDBACK.md` + demo video (2–4 min)
- [ ] Declare the **Continuity** pool

### Avoid
Do not chase Track A's ERC-4626 tokenized-vault Substreams angle — it superficially
matches our fund but is a heavy EVM data-eng lift, wrong track, wrong chain.
