import type { Metadata } from "next";

import { Pane } from "@openledger-cfo/ui/pane";

import { INGEST_GRID, INGEST_NARROW, INGEST_WIDE } from "~/app/(app)/ingest/grid";
import { Breadcrumbs } from "~/components/breadcrumbs";
import {
  ComplianceInfoPane,
  ComplianceLogPane,
  KycRegistryPane,
  OnboardingPane,
} from "~/components/fund/fund-ingest";
import { loadFund } from "~/server/fund";

export const metadata: Metadata = { title: "Onboarding · Assetic" };

// The KYC registry is read live per request from the chain.
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const loaded = await loadFund();
  if (!loaded.ok) {
    return (
      <div className="flex min-h-full flex-col">
        <Breadcrumbs crumbs={[{ label: "Onboarding" }]} />
        <div className="p-3">
          <Pane title="Fund unavailable">
            <p className="text-muted-foreground text-xs">
              Could not load the fund: {loaded.error}
            </p>
          </Pane>
        </div>
      </div>
    );
  }

  const f = loaded.value;

  return (
    <div className="flex min-h-full flex-col @4xl/main:h-full">
      <Breadcrumbs crumbs={[{ label: "Onboarding" }]} />
      <h1 className="sr-only">Investor onboarding & KYC</h1>
      <div className={INGEST_GRID}>
        <KycRegistryPane fund={f} className={INGEST_NARROW} />
        <OnboardingPane className={INGEST_WIDE} />
        <ComplianceInfoPane fund={f} className={INGEST_WIDE} />
        <ComplianceLogPane fund={f} className={INGEST_NARROW} />
      </div>
    </div>
  );
}
