import {
  ACCOUNTS_GRID,
  GROUP_COL,
  INVESTMENTS_COL,
  STRIP_ROW,
  TOTALS_CELL,
  TOTALS_ROW,
} from "~/app/(app)/accounts/grid";
import { Breadcrumbs } from "~/components/breadcrumbs";
import { PaneFrame } from "~/components/pane-frame";
import { GhostLine, ShimmerBox } from "~/components/skeleton";

/**
 * Soft on purpose: the grid constants and pane frames hold the layout, every
 * pane says its loading line, and no body pretends to know how many accounts
 * the ledger holds. The totals row keeps its three cells because the row
 * always has three, and the composition strip alone wears the sweep.
 */
const TOTALS = ["Assets (AUM)", "Liabilities (face)", "Net (equity)"];

export default function CapTableLoading() {
  return (
    <div className="flex min-h-full flex-col @4xl/main:h-full">
      <Breadcrumbs crumbs={[{ label: "Cap table" }]} />
      <h1 className="sr-only">Cap table & fund books</h1>
      <div className={ACCOUNTS_GRID}>
        <section className={TOTALS_ROW}>
          {TOTALS.map((label) => (
            <figure key={label} className={TOTALS_CELL}>
              <figcaption className="label">{label}</figcaption>
              <GhostLine className="text-[20px] leading-6" />
            </figure>
          ))}
        </section>

        <section className={`${STRIP_ROW} flex flex-col gap-1`}>
          <ShimmerBox className="h-3 w-full" />
          <GhostLine className="text-[10px]" />
        </section>

        <PaneFrame title="Collateral" className={GROUP_COL} />
        <PaneFrame title="Reserves" className={GROUP_COL} />
        <PaneFrame title="Issued security" className={GROUP_COL} />
        <PaneFrame title="Cap table" className={INVESTMENTS_COL} />
      </div>
    </div>
  );
}
