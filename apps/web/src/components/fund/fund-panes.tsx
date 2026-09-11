import type { FundSnapshot } from "@openledger-cfo/fund";
import { Pane } from "@openledger-cfo/ui/pane";

import { ChartPane } from "~/components/charts/chart-pane";
import { Sankey } from "~/components/sankey";
import type { FlowGraph, FlowLink, FlowNode } from "~/domain/flows/types";
import { HASHSCAN_CONTRACT, HASHSCAN_TOKEN } from "~/server/fund";

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
const shortAddr = (a: string) =>
  a.startsWith("0x") && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;

/** Collateral → AUM → par + premium, as a flow graph for the sankey. */
function fundFlowGraph(f: FundSnapshot): FlowGraph {
  const aum = f.nav.totalUsd;
  const par = Math.min(f.faceValueTotal, aum);
  const premium = Math.max(0, aum - f.faceValueTotal);

  const nodes: FlowNode[] = [
    ...f.nav.marks.map(
      (m): FlowNode => ({
        id: `col:${m.symbol}`,
        label: m.symbol,
        kind: "income",
        total: m.valueUsd,
      }),
    ),
    { id: "col:cash", label: "Cash", kind: "income", total: f.nav.cashUsd },
    { id: "aum", label: "Total value", kind: "hub", total: aum },
    { id: "par", label: "Car value", kind: "outcome", total: par },
    ...(premium > 0
      ? [{ id: "premium", label: "Rent earned", kind: "outcome" as const, total: premium }]
      : []),
  ];

  const links: FlowLink[] = [
    ...f.nav.marks.map(
      (m): FlowLink => ({ source: `col:${m.symbol}`, target: "aum", value: m.valueUsd }),
    ),
    { source: "col:cash", target: "aum", value: f.nav.cashUsd },
    { source: "aum", target: "par", value: par },
    ...(premium > 0 ? [{ source: "aum", target: "premium", value: premium }] : []),
  ];

  return { nodes, links };
}

/** The FLOW slot: the original sankey, driven by fund flows in USD. */
export function FundFlowPane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  const graph = fundFlowGraph(f);
  const premium = Math.max(0, f.nav.totalUsd - f.faceValueTotal);
  const meta = `Treasury ${usdCompact(f.nav.totalUsd - f.nav.cashUsd)} · Value ${usdCompact(f.nav.totalUsd)} · Rent ${usdCompact(premium)}`;
  const sankey = (expanded: boolean) => (
    <Sankey
      graph={graph}
      note="live · Uniswap"
      expanded={expanded}
      currency="USD"
      unitLabel="value"
    />
  );
  return (
    <ChartPane
      title="Value flow"
      meta={meta}
      className={className}
      bodyClassName="flex min-h-0 flex-1 flex-col p-1"
      expandedChildren={sankey(true)}
    >
      {sankey(false)}
    </ChartPane>
  );
}

/** Collateral, marked to market via Uniswap — the FLOW_COL slot. */
export function CollateralPane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  return (
    <Pane title="Collateral" meta="live · Uniswap" className={className} scroll>
      <table className="w-full text-xs tabular-nums">
        <thead className="label text-left">
          <tr>
            <th className="pb-2 font-normal">Asset</th>
            <th className="pb-2 text-right font-normal">Amount</th>
            <th className="pb-2 text-right font-normal">Price</th>
            <th className="pb-2 text-right font-normal">Value</th>
          </tr>
        </thead>
        <tbody>
          {f.nav.marks.map((m) => (
            <tr key={m.symbol} className="border-border border-t">
              <td className="py-2 font-medium">{m.symbol}</td>
              <td className="py-2 text-right">{m.amount}</td>
              <td className="py-2 text-right">{usd(m.priceUsd)}</td>
              <td className="py-2 text-right">{usd0(m.valueUsd)}</td>
            </tr>
          ))}
          <tr className="border-border border-t">
            <td className="py-2 font-medium">Cash reserve</td>
            <td className="py-2 text-right">—</td>
            <td className="py-2 text-right">—</td>
            <td className="py-2 text-right">{usd0(f.nav.cashUsd)}</td>
          </tr>
          <tr className="border-border border-t-2">
            <td className="py-2 font-medium">AUM</td>
            <td colSpan={2} />
            <td className="py-2 text-right font-medium">{usd0(f.nav.totalUsd)}</td>
          </tr>
        </tbody>
      </table>
    </Pane>
  );
}

/** The KYC-gated holder register (Hedera) — the ACTION_COL slot. */
export function HolderPane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  return (
    <Pane
      title="Co-owners"
      meta={`${f.holders.length} on-chain`}
      className={className}
      scroll
    >
      {f.holders.length === 0 ? (
        <p className="text-muted-foreground text-xs">No holders yet.</p>
      ) : (
        <table className="w-full text-xs tabular-nums">
          <thead className="label text-left">
            <tr>
              <th className="pb-2 font-normal">Account</th>
              <th className="pb-2 text-right font-normal">Shares</th>
              <th className="pb-2 text-right font-normal">Invested</th>
            </tr>
          </thead>
          <tbody>
            {f.holders.map((h) => (
              <tr key={h.accountId} className="border-border border-t">
                <td className="py-2 font-mono">{shortAddr(h.accountId)}</td>
                <td className="py-2 text-right">{h.balance}</td>
                <td className="py-2 text-right">
                  {usd0(h.balance * f.faceValuePerUnit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Pane>
  );
}

/** On-chain identity + HashScan — the TAPE_COL slot. */
export function OnChainPane({
  fund: f,
  className,
}: {
  fund: FundSnapshot;
  className?: string;
}) {
  return (
    <Pane title="On-chain" meta="Hedera testnet" className={className} scroll>
      <dl className="flex flex-col gap-3 text-xs">
        <div className="flex flex-col gap-0.5">
          <dt className="label">Token id</dt>
          <dd className="font-mono">{f.bondTokenId}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="label">Standard</dt>
          <dd>ERC-3643 · Asset Tokenization Studio</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="label">Symbol</dt>
          <dd>{f.symbol}</dd>
        </div>
        <div className="border-border flex flex-col gap-1 border-t pt-2">
          <a
            href={HASHSCAN_TOKEN(f.bondTokenId)}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            Token on HashScan ↗
          </a>
          <a
            href={HASHSCAN_CONTRACT(f.bondTokenId)}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            Contract on HashScan ↗
          </a>
        </div>
      </dl>
    </Pane>
  );
}
