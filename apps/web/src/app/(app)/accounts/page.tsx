import type { Metadata } from "next";

import { Pane } from "@openledger-cfo/ui/pane";

import {
  ACCOUNTS_GRID,
  GROUP_COL,
  INVESTMENTS_COL,
  STRIP_ROW,
  TOTALS_ROW,
} from "~/app/(app)/accounts/grid";
import { Breadcrumbs } from "~/components/breadcrumbs";
import {
  AllocationStrip,
  CapTablePane,
  CollateralGroupPane,
  IssuedBondPane,
  ReservePane,
  Total,
} from "~/components/fund/fund-accounts";
import { loadFund } from "~/server/fund";

export const metadata: Metadata = { title: "Owners & rent · Carrentic" };

// Read live per request: cap table (Hedera) + collateral NAV (Uniswap).
export const dynamic = "force-dynamic";

const usd0 = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export default async function CapTablePage() {
  const loaded = await loadFund();
  if (!loaded.ok) {
    return (
      <div className="flex min-h-full flex-col">
        <Breadcrumbs crumbs={[{ label: "Owners & rent" }]} />
        <div className="p-3">
          <Pane title="Car unavailable">
            <p className="text-muted-foreground text-xs">
              Could not load the fund: {loaded.error}
            </p>
          </Pane>
        </div>
      </div>
    );
  }

  const f = loaded.value;
  const equity = f.nav.totalUsd - f.faceValueTotal; // over-collateralization cushion

  return (
    <div className="flex min-h-full flex-col @4xl/main:h-full">
      <Breadcrumbs crumbs={[{ label: "Owners & rent" }]} />
      <h1 className="sr-only">Owners & rent</h1>
      <div className={ACCOUNTS_GRID}>
        <section className={TOTALS_ROW}>
          <Total label="Total value" value={usd0(f.nav.totalUsd)} />
          <Total label="Owner capital" value={usd0(f.faceValueTotal)} />
          <Total label="Rent surplus" value={usd0(equity)} />
        </section>

        <AllocationStrip fund={f} className={STRIP_ROW} />

        <CollateralGroupPane fund={f} className={GROUP_COL} />
        <ReservePane fund={f} className={GROUP_COL} />
        <IssuedBondPane fund={f} className={GROUP_COL} />

        <CapTablePane fund={f} className={INVESTMENTS_COL} />
      </div>
    </div>
  );
}
