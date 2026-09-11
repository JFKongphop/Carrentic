import Link from "next/link";

import type { FundSnapshot } from "@openledger-cfo/fund";
import { cn } from "@openledger-cfo/ui";

import {
  SEGMENT_STRIP,
  VITALS_BAND,
  VITALS_CELL,
  VITALS_GRID,
} from "~/app/grid";
import { Sparkline } from "~/components/charts/sparkline";
import type { Point } from "~/domain/series/types";

const FIGURE = "text-[20px] leading-6 font-medium tabular-nums";
// NAV/unit is a long figure ($1,370.20), so keep it modest — level with the
// other stat tiles rather than an oversized hero.
const HERO = "text-[18px] leading-6 font-medium tabular-nums";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const usd0 = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
const usdCompact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${Math.round(n)}`;
};

/** Mirrors the Everything dashboard's Cell — same design, fund data. */
function Cell({
  label,
  value,
  hint,
  href,
  title,
  valueClassName,
  spark,
}: {
  label: string;
  value: string;
  hint: string;
  href?: string;
  title?: string;
  valueClassName?: string;
  spark?: React.ReactNode;
}) {
  const body = (
    <>
      <figcaption className="label">{label}</figcaption>
      <div className={cn(FIGURE, valueClassName)} title={title}>
        {value}
      </div>
      <p className="text-muted-foreground truncate text-[10px]" title={hint}>
        {hint}
      </p>
      {spark}
    </>
  );
  if (href === undefined) return <figure className={VITALS_CELL}>{body}</figure>;
  return (
    <Link
      href={href}
      className={cn(VITALS_CELL, "hover:text-accent transition-colors")}
    >
      {body}
    </Link>
  );
}

function Segment({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex shrink-0 items-baseline gap-1.5">
      <span className="label">{label}</span>
      <span className="text-muted-foreground tabular-nums">{value}</span>
    </span>
  );
}

/** The fund's vital signs, in the Everything dashboard's vitals band. */
export function FundVitals({
  fund: f,
  navSeries,
  className,
}: {
  fund: FundSnapshot;
  navSeries: readonly Point[];
  className?: string;
}) {
  const premiumClass = f.premiumToPar >= 0 ? "text-emerald-500" : "text-destructive";

  return (
    <section className={cn(VITALS_BAND, className)}>
      <div className={VITALS_GRID}>
        <Cell
          label="NAV / unit"
          value={usd(f.nav.navPerShare)}
          title={usd(f.nav.navPerShare)}
          hint={`face ${usd0(f.faceValuePerUnit)}`}
          valueClassName={HERO}
          spark={
            <Sparkline
              points={navSeries}
              width={90}
              height={16}
              label={`NAV over the last ${navSeries.length} marks`}
            />
          }
        />
        <Cell
          label="Premium to par"
          value={`${(f.premiumToPar * 100).toFixed(1)}%`}
          hint={f.premiumToPar >= 0 ? "trading above par" : "trading below par"}
          valueClassName={premiumClass}
        />
        <Cell
          label="AUM"
          value={usdCompact(f.nav.totalUsd)}
          title={usd0(f.nav.totalUsd)}
          hint="marked via Uniswap"
        />
        <Cell
          label="Units"
          value={f.unitsOutstanding.toLocaleString("en-US")}
          hint={`${usd0(f.faceValueTotal)} face`}
        />
        <Cell
          label="Coupon"
          value="5.0%"
          hint="semi-annual"
        />
        <Cell
          label="Holders"
          value={String(f.holders.length)}
          hint="KYC-gated"
          href="/accounts"
        />
      </div>

      <div className={SEGMENT_STRIP}>
        {f.nav.marks.map((m) => (
          <Segment key={m.symbol} label={m.symbol} value={usdCompact(m.valueUsd)} />
        ))}
        <Segment label="Cash" value={usdCompact(f.nav.cashUsd)} />
      </div>
    </section>
  );
}
