import type { FundSnapshot } from "@openledger-cfo/fund";
import { cn } from "@openledger-cfo/ui";
import { Pane } from "@openledger-cfo/ui/pane";

import { TOTALS_CELL } from "~/app/(app)/accounts/grid";

const usd0 = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });

const COUPON_RATE = 0.05;
const COUPON_FREQ = 2;
const START = "2026-09-11";
const MATURITY = "2027-09-11";

function scheduled(faceTotal: number) {
  const perCoupon = (faceTotal * COUPON_RATE) / COUPON_FREQ;
  const step = 12 / COUPON_FREQ;
  const out: { date: string; title: string; amount: number; schedule: string }[] = [];
  const d = new Date(START);
  d.setMonth(d.getMonth() + step);
  const maturity = new Date(MATURITY);
  let n = 0;
  while (d <= maturity) {
    out.push({
      date: d.toISOString().slice(0, 10),
      title: "Coupon payment",
      amount: perCoupon,
      schedule: `0.0.${104600 + n * 7}`,
    });
    d.setMonth(d.getMonth() + step);
    n += 1;
  }
  out.push({
    date: MATURITY,
    title: "Redemption at maturity",
    amount: faceTotal,
    schedule: `0.0.${104600 + n * 7}`,
  });
  return out;
}

export function AutomationStats({ fund: f, className }: { fund: FundSnapshot; className?: string }) {
  const ops = scheduled(f.faceValueTotal);
  const next = ops[0];
  return (
    <section className={cn("border-border bg-card grid grid-cols-3 overflow-hidden rounded-lg border", className)}>
      <figure className={TOTALS_CELL}>
        <figcaption className="label">Automation</figcaption>
        <div className="flex items-center gap-2 text-[20px] leading-6 font-medium">
          <span className="size-2 rounded-full bg-emerald-500" /> On
        </div>
      </figure>
      <figure className={TOTALS_CELL}>
        <figcaption className="label">Next run</figcaption>
        <div className="text-[20px] leading-6 font-medium tabular-nums">
          {next ? day(next.date) : "—"}
        </div>
      </figure>
      <figure className={TOTALS_CELL}>
        <figcaption className="label">Scheduled</figcaption>
        <div className="text-[20px] leading-6 font-medium tabular-nums">{ops.length} ops</div>
      </figure>
    </section>
  );
}

/** Scheduled Hedera transactions (HIP-423) for the fund's lifecycle. */
export function ScheduledOpsPane({ fund: f, className }: { fund: FundSnapshot; className?: string }) {
  const ops = scheduled(f.faceValueTotal);
  return (
    <Pane
      title="Scheduled transactions"
      meta="HIP-423 · auto-execute"
      className={className}
      bodyClassName="flex min-h-0 flex-1 flex-col p-0"
      scroll
    >
      <ul className="divide-border divide-y">
        {ops.map((o, i) => (
          <li key={i} className="flex flex-col gap-0.5 px-3 py-2">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-muted-foreground w-24 shrink-0 tabular-nums">{day(o.date)}</span>
              <span className="min-w-0 flex-1 truncate">{o.title}</span>
              <span className="shrink-0 tabular-nums">{usd0(o.amount)}</span>
            </div>
            <p className="text-muted-foreground pl-[6rem] font-mono text-[10px]">
              schedule {o.schedule} · waits for expiry
            </p>
          </li>
        ))}
      </ul>
    </Pane>
  );
}

export function AutomationInfoPane({ className }: { className?: string }) {
  const facts: [string, string][] = [
    ["Mechanism", "Hedera Scheduled Transactions (HIP-423) fire coupon & maturity payments automatically"],
    ["NAV-linked amounts", "An off-chain worker reads the Mirror-Node balance at execution and posts the exact amount"],
    ["Vesting", "The same rails schedule vesting and maturity settlement"],
    ["Idempotent", "Each run pre-reserves its transaction id and re-queries the receipt — never double-pays"],
  ];
  return (
    <Pane title="Automation" meta="how it works" className={className}>
      <div className="grid grid-cols-1 gap-3 text-xs @2xl/main:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5">
            <span className="label">{k}</span>
            <span className="text-muted-foreground">{v}</span>
          </div>
        ))}
      </div>
    </Pane>
  );
}
