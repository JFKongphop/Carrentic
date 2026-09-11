import type { FundSnapshot } from "@openledger-cfo/fund";
import { Pane } from "@openledger-cfo/ui/pane";

import { HASHSCAN_TOKEN } from "~/server/fund";

const BODY = "flex min-h-0 flex-1 flex-col p-0";
const shortAddr = (a: string) =>
  a.startsWith("0x") && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;

/** The KYC registry — who is cleared to hold the security (the FileList slot). */
export function KycRegistryPane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  return (
    <Pane
      title="KYC registry"
      meta={`${f.holders.length} cleared`}
      className={className}
      bodyClassName={BODY}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {f.holders.length === 0 ? (
          <p className="text-muted-foreground px-3 py-2 text-xs">
            No investors onboarded yet.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {f.holders.map((h) => (
              <li key={h.accountId} className="flex flex-col gap-0.5 px-3 py-1.5">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="min-w-0 flex-1 truncate font-mono" title={h.accountId}>
                    {shortAddr(h.accountId)}
                  </span>
                  <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 text-[10px] text-emerald-500">
                    KYC ✓
                  </span>
                </div>
                <p className="text-muted-foreground text-[10px]">
                  ERC-3643 identity · holds {h.balance} units
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Pane>
  );
}

const STEPS = [
  {
    n: 1,
    title: "Investor connects wallet",
    body: "A prospective holder connects their Hedera account. Reg S gates non-eligible jurisdictions.",
  },
  {
    n: 2,
    title: "Verify identity → grant KYC",
    body: "The admin registers the investor's ERC-3643 on-chain identity and grants KYC. Until then, transfers to them revert.",
  },
  {
    n: 3,
    title: "Associate the token",
    body: "The investor associates the security so it can be received.",
  },
  {
    n: 4,
    title: "Allocate units",
    body: "The treasury transfers units. The transfer is compliance-checked on-chain — KYC, freeze, and blocklist all enforced by the token itself.",
  },
];

/** The onboarding flow — the RunFeed slot. */
export function OnboardingPane({ className }: { className?: string }) {
  return (
    <Pane
      title="Onboarding"
      meta="ERC-3643 compliance flow"
      className={className}
      bodyClassName="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto p-0"
    >
      <ol className="divide-border divide-y">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-3 px-3 py-3">
            <span className="border-border text-accent grid size-6 shrink-0 place-items-center rounded-full border text-[11px] tabular-nums">
              {s.n}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] font-medium">{s.title}</span>
              <span className="text-muted-foreground text-[11px]">{s.body}</span>
            </div>
          </li>
        ))}
      </ol>
    </Pane>
  );
}

/** How compliance works — the InfoPane slot. */
export function ComplianceInfoPane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  const facts: [string, string][] = [
    ["Standard", "ERC-3643 (T-REX) — permissioned security token"],
    ["Identity", "On-chain identity registry; KYC gates every transfer"],
    ["Regulation", "Regulation S — international offering"],
    ["Blocklist", "OFAC-sanctioned jurisdictions blocked at transfer"],
    ["Issued via", "Hedera Asset Tokenization Studio"],
  ];
  return (
    <Pane title="Compliance" meta="how it works" className={className} scroll>
      <dl className="flex flex-col gap-2 text-xs">
        {facts.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5">
            <dt className="label">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <a
          href={HASHSCAN_TOKEN(f.bondTokenId)}
          target="_blank"
          rel="noreferrer"
          className="text-accent border-border mt-1 border-t pt-2 underline"
        >
          Token {f.bondTokenId} on HashScan ↗
        </a>
      </dl>
    </Pane>
  );
}

/** Recent compliance actions — the CliLog slot. */
export function ComplianceLogPane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  const lines = [
    "addIssuer(operator) — SSI issuer registered",
    "grantKyc(0xdb3e…3d0a) — treasury cleared",
    "issue(0xdb3e…3d0a, 1000) — units minted",
    ...f.holders
      .filter((h) => !h.accountId.startsWith("0xdb3e"))
      .map((h) => `grantKyc(${shortAddr(h.accountId)}) — investor cleared`),
  ];
  return (
    <Pane title="On-chain log" meta="compliance ops" className={className} scroll>
      <ul className="flex flex-col gap-1 font-mono text-[10px]">
        {lines.map((l, i) => (
          <li key={i} className="text-muted-foreground">
            <span className="text-emerald-500">✓</span> {l}
          </li>
        ))}
      </ul>
    </Pane>
  );
}
