import type { FundSnapshot } from "@openledger-cfo/fund";
import { cn } from "@openledger-cfo/ui";
import { Pane } from "@openledger-cfo/ui/pane";

import { TOTALS_CELL } from "~/app/(app)/accounts/grid";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const BODY = "flex min-h-0 flex-1 flex-col p-0";

function Total({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <figure className={TOTALS_CELL}>
      <figcaption className="label">{label}</figcaption>
      <div className={cn("text-[20px] leading-6 font-medium tabular-nums", tone)}>
        {value}
      </div>
    </figure>
  );
}

interface Order {
  price: number;
  size: number;
}

/** A small, deterministic book around NAV so the view is stable across reloads. */
function book(nav: number): { bids: Order[]; asks: Order[]; last: number } {
  const asks: Order[] = [0.006, 0.012, 0.02, 0.03, 0.045].map((d, i) => ({
    price: Math.round(nav * (1 + d)),
    size: 40 - i * 6,
  }));
  const bids: Order[] = [0.004, 0.011, 0.019, 0.028, 0.04].map((d, i) => ({
    price: Math.round(nav * (1 - d)),
    size: 35 - i * 5,
  }));
  return { bids, asks, last: Math.round(nav * 1.001) };
}

/** Market stats band. */
export function MarketStats({ fund: f, className }: { fund: FundSnapshot; className?: string }) {
  const { bids, asks, last } = book(f.nav.navPerShare);
  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 0;
  const spread = bestAsk - bestBid;
  return (
    <section className={cn("border-border bg-card grid grid-cols-4 overflow-hidden rounded-lg border", className)}>
      <Total label="Last" value={usd(last)} />
      <Total label="NAV / unit" value={usd(f.nav.navPerShare)} />
      <Total label="Spread" value={usd(spread)} />
      <Total label="Best bid / ask" value={`${usd(bestBid)} / ${usd(bestAsk)}`} />
    </section>
  );
}

function Depth({ share, side }: { share: number; side: "bid" | "ask" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-y-0 right-0",
        side === "bid" ? "bg-emerald-500/10" : "bg-destructive/10",
      )}
      style={{ width: `${Math.min(share, 1) * 100}%` }}
    />
  );
}

/** The compliance-gated order book. */
export function OrderBookPane({ fund: f, className }: { fund: FundSnapshot; className?: string }) {
  const { bids, asks } = book(f.nav.navPerShare);
  const maxSize = Math.max(...bids.map((o) => o.size), ...asks.map((o) => o.size), 1);
  const row = (o: Order, side: "bid" | "ask") => (
    <li key={`${side}-${o.price}`} className="relative flex items-center justify-between px-3 py-1 text-[11px] tabular-nums">
      <Depth share={o.size / maxSize} side={side} />
      <span className={cn("relative", side === "bid" ? "text-emerald-500" : "text-destructive")}>
        {usd(o.price)}
      </span>
      <span className="text-muted-foreground relative">{o.size} units</span>
    </li>
  );
  return (
    <Pane title="Order book" meta="ADB · compliance-gated" className={className} bodyClassName={BODY}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul>{[...asks].reverse().map((o) => row(o, "ask"))}</ul>
        <div className="border-border bg-secondary/40 border-y px-3 py-1 text-center text-[10px] tabular-nums">
          NAV {usd(f.nav.navPerShare)}
        </div>
        <ul>{bids.map((o) => row(o, "bid"))}</ul>
      </div>
    </Pane>
  );
}

/** Recent settled trades. */
export function TradesPane({ fund: f, className }: { fund: FundSnapshot; className?: string }) {
  const nav = f.nav.navPerShare;
  const trades = [
    { t: "11:42", price: Math.round(nav * 1.001), size: 12, side: "buy" as const },
    { t: "11:31", price: Math.round(nav * 0.998), size: 8, side: "sell" as const },
    { t: "11:20", price: Math.round(nav * 1.003), size: 20, side: "buy" as const },
    { t: "10:58", price: Math.round(nav * 0.996), size: 5, side: "sell" as const },
    { t: "10:41", price: Math.round(nav * 1.0), size: 15, side: "buy" as const },
  ];
  return (
    <Pane title="Trades" meta="last 15" className={className} bodyClassName={BODY}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="divide-border divide-y">
          {trades.map((tr, i) => (
            <li key={i} className="flex items-center justify-between px-3 py-1.5 text-[11px] tabular-nums">
              <span className="text-muted-foreground w-12 shrink-0">{tr.t}</span>
              <span className={tr.side === "buy" ? "text-emerald-500" : "text-destructive"}>
                {usd(tr.price)}
              </span>
              <span className="text-muted-foreground">{tr.size} units</span>
            </li>
          ))}
        </ul>
      </div>
    </Pane>
  );
}

/** How settlement works — the compliance story. */
export function MarketInfoPane({ className }: { className?: string }) {
  const facts: [string, string][] = [
    ["Eligibility", "Only KYC-cleared, whitelisted accounts can place or fill orders"],
    ["Enforcement", "The ERC-3643 token rejects any non-compliant transfer on-chain"],
    ["Settlement", "Atomic, on Hedera — no custodian holds the asset"],
    ["Restrictions", "Regulation S: sanctioned jurisdictions blocked at transfer"],
  ];
  return (
    <Pane title="Secondary market" meta="compliance-enforced" className={className}>
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
