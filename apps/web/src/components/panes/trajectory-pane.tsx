import type { Point } from "~/domain/series/types";
import { ChartPane } from "~/components/charts/chart-pane";
import { LineChart } from "~/components/charts/line-chart";
import { formatThbCompactSigned } from "~/domain/format";
import { hasMovement } from "~/domain/series/account";

const deltaOf = (points: readonly Point[]) => {
  const first = points[0];
  const last = points.at(-1);
  if (first === undefined || last === undefined) return undefined;
  return last.y - first.y;
};

// Deterministic compact (Node/browser ICU differ on compact notation → hydration).
const usdCompactSigned = (n: number) => {
  const s = n >= 0 ? "+" : "-";
  const a = Math.abs(n);
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(1)}K`;
  return `${s}$${Math.round(a)}`;
};

export function TrajectoryPane({
  points,
  className,
  currency = "THB",
  title = "Trajectory",
  metaPrefix = "24 mo",
}: {
  points: readonly Point[];
  className?: string;
  /** Value currency (defaults THB). The fund passes USD for NAV. */
  currency?: "THB" | "USD";
  title?: string;
  metaPrefix?: string;
}) {
  const delta = deltaOf(points);
  const fmt = currency === "USD" ? usdCompactSigned : formatThbCompactSigned;

  return (
    <ChartPane
      title={title}
      meta={delta === undefined ? metaPrefix : `${metaPrefix} · ${fmt(delta)}`}
      expandable={hasMovement(points)}
      className={className}
      bodyClassName="flex min-h-0 flex-1 flex-col p-3"
      expandedChildren={
        <LineChart points={points} currency={currency} area accent expanded />
      }
    >
      <LineChart
        points={points}
        currency={currency}
        area
        accent
        empty="Not enough history to plot."
      />
    </ChartPane>
  );
}
