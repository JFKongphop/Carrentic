import type { FundSnapshot } from "@openledger-cfo/fund";
import { cn } from "@openledger-cfo/ui";
import { Pane } from "@openledger-cfo/ui/pane";

const usd0 = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });

function Meter({ share, tone }: { share: number; tone?: string }) {
  return (
    <span className="bg-secondary h-[3px] w-full shrink-0 overflow-hidden">
      <span
        className={cn("block h-full", tone ?? "bg-accent")}
        style={{ width: `${Math.min(Math.max(share, 0), 1) * 100}%` }}
      />
    </span>
  );
}

// --- Bond terms (from the ATS issuance) ------------------------------------
const COUPON_RATE = 0.05; // 5% annual
const COUPON_FREQ = 2; // semi-annual
const START = "2026-09-11";
const MATURITY = "2027-09-11";

interface Event {
  date: string;
  title: string;
  amount: number;
  kind: "coupon" | "maturity";
}

/** Coupon dates from start→maturity + the maturity redemption. */
function schedule(faceTotal: number): Event[] {
  const events: Event[] = [];
  const perCoupon = (faceTotal * COUPON_RATE) / COUPON_FREQ;
  const stepMonths = 12 / COUPON_FREQ;
  const start = new Date(START);
  const maturity = new Date(MATURITY);
  const d = new Date(start);
  d.setMonth(d.getMonth() + stepMonths);
  while (d <= maturity) {
    events.push({
      date: d.toISOString().slice(0, 10),
      title: "Coupon payment",
      amount: perCoupon,
      kind: "coupon",
    });
    d.setMonth(d.getMonth() + stepMonths);
  }
  events.push({
    date: MATURITY,
    title: "Redemption at maturity",
    amount: faceTotal,
    kind: "maturity",
  });
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/** Coupon & maturity schedule — the Reminders-pane role (read-only). */
export function SchedulePane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  const events = schedule(f.faceValueTotal);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Pane
      title="Coupon & maturity"
      meta={`${COUPON_RATE * 100}% · semi-annual`}
      className={className}
      bodyClassName="flex min-h-0 flex-1 flex-col p-0"
      scroll
    >
      <ul className="divide-border divide-y">
        {events.map((e, i) => {
          const upcoming = e.date >= today;
          return (
            <li key={i} className="flex flex-col gap-0.5 px-3 py-1.5">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-muted-foreground w-24 shrink-0 tabular-nums">
                  {day(e.date)}
                </span>
                <span className={cn("min-w-0 flex-1 truncate", !upcoming && "text-muted-foreground")}>
                  {e.title}
                </span>
                <span className="shrink-0 tabular-nums">{usd0(e.amount)}</span>
              </div>
              <p className="text-muted-foreground pl-[6rem] text-[10px]">
                {e.kind === "maturity" ? "principal · to all holders" : "to holders pro-rata"}
                {upcoming ? "" : " · paid"}
              </p>
            </li>
          );
        })}
      </ul>
    </Pane>
  );
}

/** Investment mandate: target allocation vs live — the Goals-pane role. */
export function MandatePane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  const total = f.nav.totalUsd || 1;
  const targets: Record<string, number> = { WETH: 0.5, WBTC: 0.28, Cash: 0.12 };
  const rows = [
    ...f.nav.marks.map((m) => ({
      label: m.symbol,
      actual: m.valueUsd / total,
      target: targets[m.symbol] ?? 0,
    })),
    { label: "Cash", actual: f.nav.cashUsd / total, target: targets.Cash ?? 0 },
  ];
  return (
    <Pane title="Mandate" meta="target vs live" className={className} bodyClassName="flex min-h-0 flex-1 flex-col p-0" scroll>
      <ul className="divide-border divide-y">
        {rows.map((r) => (
          <li key={r.label} className="flex flex-col gap-1 px-3 py-2">
            <div className="flex items-baseline justify-between text-[11px]">
              <span>{r.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {(r.actual * 100).toFixed(0)}% <span className="opacity-60">/ {(r.target * 100).toFixed(0)}% target</span>
              </span>
            </div>
            <Meter share={r.actual} tone={r.actual > r.target * 1.15 ? "bg-amber-500" : "bg-accent"} />
          </li>
        ))}
      </ul>
    </Pane>
  );
}

/** Risk caps: max exposure per asset — the Budgets-pane role. */
export function RiskCapsPane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  const total = f.nav.totalUsd || 1;
  const caps: Record<string, number> = { WETH: 0.6, WBTC: 0.4 };
  const rows = f.nav.marks.map((m) => ({
    label: m.symbol,
    used: m.valueUsd / total,
    cap: caps[m.symbol] ?? 0.5,
  }));
  return (
    <Pane title="Risk caps" meta="exposure vs limit" className={className} bodyClassName="flex min-h-0 flex-1 flex-col p-0" scroll>
      <ul className="divide-border divide-y">
        {rows.map((r) => {
          const share = r.used / r.cap;
          return (
            <li key={r.label} className="flex flex-col gap-1 px-3 py-2">
              <div className="flex items-baseline justify-between text-[11px]">
                <span>{r.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {(r.used * 100).toFixed(0)}% <span className="opacity-60">/ {(r.cap * 100).toFixed(0)}% cap</span>
                </span>
              </div>
              <Meter share={share} tone={share > 0.9 ? "bg-destructive" : "bg-accent"} />
            </li>
          );
        })}
      </ul>
    </Pane>
  );
}
