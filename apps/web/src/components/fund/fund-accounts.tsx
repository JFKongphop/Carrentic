import Link from "next/link";

import type { FundSnapshot } from "@openledger-cfo/fund";
import { cn } from "@openledger-cfo/ui";
import { Pane } from "@openledger-cfo/ui/pane";

import { TOTALS_CELL } from "~/app/(app)/accounts/grid";
import { HASHSCAN_TOKEN } from "~/server/fund";

// Row styling lifted verbatim from the accounts group panes, so the fund books
// read identically to the original.
const STACKED = "flex flex-col gap-0.5 px-3 py-1.5 hover:bg-secondary/60";
const ROW = "flex h-7 items-center gap-2 px-3 text-[11px] hover:bg-secondary/60";
const NAME = "min-w-0 flex-1 truncate";
const SUB = "text-muted-foreground text-[10px] tabular-nums";
const BODY = "flex min-h-0 flex-1 flex-col p-0";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const usdCompact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${Math.round(n)}`;
};
const shortAddr = (a: string) =>
  a.startsWith("0x") && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;

export function Total({ label, value }: { label: string; value: string }) {
  return (
    <figure className={TOTALS_CELL}>
      <figcaption className="label">{label}</figcaption>
      <div className="text-[20px] leading-6 font-medium tabular-nums">{value}</div>
    </figure>
  );
}

function Meter({ share, tone }: { share: number; tone?: string }) {
  return (
    <span className="bg-secondary h-[3px] w-16 shrink-0 overflow-hidden">
      <span
        className={cn("block h-full", tone ?? "bg-accent")}
        style={{ width: `${Math.min(share, 1) * 100}%` }}
      />
    </span>
  );
}

/** Collateral allocation bar — mirrors the composition strip's role. */
export function AllocationStrip({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  const segs = [
    ...f.nav.marks.map((m) => ({ label: m.symbol, value: m.valueUsd })),
    { label: "Cash", value: f.nav.cashUsd },
  ];
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const tones = ["bg-accent", "bg-emerald-500", "bg-sky-500", "bg-amber-500"];
  return (
    <div className={cn("flex flex-col justify-center gap-1", className)}>
      <span className="bg-secondary flex h-3 w-full overflow-hidden rounded">
        {segs.map((s, i) => (
          <span
            key={s.label}
            className={tones[i % tones.length]}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label} ${usdCompact(s.value)}`}
          />
        ))}
      </span>
      <span className="flex flex-wrap gap-x-3 text-[10px]">
        {segs.map((s) => (
          <span key={s.label} className="text-muted-foreground tabular-nums">
            {s.label} {usdCompact(s.value)}
          </span>
        ))}
      </span>
    </div>
  );
}

/** Collateral holdings, marked to market — the Investments-pane role. */
export function CollateralGroupPane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  const total = f.nav.marks.reduce((s, m) => s + m.valueUsd, 0);
  return (
    <Pane
      title="Rent treasury"
      meta={`${f.nav.marks.length} · ${usdCompact(total)}`}
      className={className}
      bodyClassName={BODY}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="divide-border divide-y">
          {f.nav.marks.map((m) => (
            <li key={m.symbol} className={STACKED}>
              <span className="flex items-baseline gap-2 text-[11px]">
                <span className={NAME}>{m.symbol}</span>
                <span className="shrink-0 tabular-nums">{usd(m.valueUsd)}</span>
              </span>
              <span className={SUB}>
                {m.amount} × {usd(m.priceUsd)} · live · Uniswap
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Pane>
  );
}

/** Cash reserve — the Banks-pane role. */
export function ReservePane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  return (
    <Pane
      title="Cash reserve"
      meta={usdCompact(f.nav.cashUsd)}
      className={className}
      bodyClassName={BODY}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="divide-border divide-y">
          <li className={STACKED}>
            <span className="flex items-baseline gap-2 text-[11px]">
              <span className={NAME}>Cash reserve</span>
              <span className="shrink-0 tabular-nums">{usd(f.nav.cashUsd)}</span>
            </span>
            <span className={SUB}>stable · settlement</span>
          </li>
        </ul>
      </div>
    </Pane>
  );
}

/** The issued bond as a liability — the Loans-pane role. */
export function IssuedBondPane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  return (
    <Pane
      title="Car token"
      meta={`${usdCompact(f.faceValueTotal)} face`}
      className={className}
      bodyClassName={BODY}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="divide-border divide-y">
          <li className={STACKED}>
            <span className="flex items-baseline gap-2 text-[11px]">
              <span className={NAME} title={f.symbol}>
                Carrentic vehicle
              </span>
              <span className="shrink-0 tabular-nums">{usd(f.faceValueTotal)}</span>
            </span>
            <span className={SUB}>
              {f.unitsOutstanding.toLocaleString("en-US")} shares ×{" "}
              {usd(f.faceValuePerUnit)} per share · ERC-3643
            </span>
          </li>
        </ul>
      </div>
    </Pane>
  );
}

/** The KYC-gated cap table — the headline, in the Investments-column slot. */
export function CapTablePane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  const units = f.unitsOutstanding || 1;
  return (
    <Pane
      title="Co-owners"
      meta={`${f.holders.length} owners · ${f.unitsOutstanding.toLocaleString("en-US")} shares`}
      className={className}
      bodyClassName={BODY}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {f.holders.length === 0 ? (
          <p className="text-muted-foreground px-3 py-2 text-xs">No owners yet.</p>
        ) : (
          <ul className="divide-border divide-y">
            {f.holders.map((h) => {
              const share = h.balance / units;
              return (
                <li key={h.accountId}>
                  <Link
                    href={`/accounts/${encodeURIComponent(h.accountId)}`}
                    className={ROW}
                  >
                    <span className="w-40 shrink-0 truncate font-mono" title={h.accountId}>
                      {shortAddr(h.accountId)}
                    </span>
                    <span className={cn(NAME, "flex items-center gap-2")}>
                      <Meter share={share} />
                      <span className={SUB}>{(share * 100).toFixed(1)}%</span>
                    </span>
                    <span className="w-20 shrink-0 text-right tabular-nums">
                      {h.balance}
                    </span>
                    <span className="w-28 shrink-0 text-right tabular-nums">
                      {usd(h.balance * f.faceValuePerUnit)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <a
        href={HASHSCAN_TOKEN(f.bondTokenId)}
        target="_blank"
        rel="noreferrer"
        className="border-border text-accent shrink-0 border-t px-3 py-1 text-[10px] underline"
      >
        Verify owners on HashScan ↗
      </a>
    </Pane>
  );
}
