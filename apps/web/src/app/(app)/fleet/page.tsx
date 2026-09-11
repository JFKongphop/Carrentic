import type { Metadata } from "next";

import { Pane } from "@openledger-cfo/ui/pane";

import { ACTION_COL, FLOW_COL, TAPE_COL, TRAJECTORY_COL } from "~/app/grid";
import { Breadcrumbs } from "~/components/breadcrumbs";
import { CarShowcase } from "~/components/car/car-showcase";
import { HowItWorks } from "~/components/car/how-it-works";
import {
  FundFlowPane,
  HolderPane,
  OnChainPane,
} from "~/components/fund/fund-panes";
import { TrajectoryPane } from "~/components/panes/trajectory-pane";
import { loadFund, synthNavSeries } from "~/server/fund";

export const metadata: Metadata = { title: "Fleet · Carrentic" };

// The bond + NAV are read live on-chain / from Uniswap per request.
export const dynamic = "force-dynamic";

export default async function FleetPage() {
  const loaded = await loadFund();

  if (!loaded.ok) {
    return (
      <div className="flex min-h-full flex-col">
        <Breadcrumbs crumbs={[{ label: "Fleet" }]} />
        <div className="p-3">
          <Pane title="Car unavailable">
            <p className="text-muted-foreground text-xs">
              Could not load the car: {loaded.error}
            </p>
          </Pane>
        </div>
      </div>
    );
  }

  const f = loaded.value;
  const navSeries = synthNavSeries(f.nav.navPerShare, f.faceValuePerUnit);

  return (
    <div className="flex min-h-full flex-col">
      <Breadcrumbs crumbs={[{ label: "Fleet" }]} />
      <h1 className="sr-only">Carrentic — tokenized car</h1>

      {/* Cinematic hero + explainer, full width above the data grid. */}
      <div className="flex flex-col gap-3 p-3 pb-0">
        <CarShowcase
          tokenId={f.bondTokenId}
          totalValue={f.nav.totalUsd}
          shares={f.unitsOutstanding}
          coOwners={f.holders.length}
          rentPerYear={0.05}
        />
        <HowItWorks />
      </div>

      <div className="grid grid-cols-12 gap-3 p-3 @4xl/main:grid-rows-[minmax(320px,auto)_minmax(240px,auto)]">
        <FundFlowPane fund={f} className={FLOW_COL} />
        <HolderPane fund={f} className={ACTION_COL} />
        <TrajectoryPane
          points={navSeries}
          currency="USD"
          title="Value trajectory"
          metaPrefix="Value · 12 mo"
          className={TRAJECTORY_COL}
        />
        <OnChainPane fund={f} className={TAPE_COL} />
      </div>
    </div>
  );
}
