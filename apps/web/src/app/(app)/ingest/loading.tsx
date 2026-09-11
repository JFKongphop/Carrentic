import { INGEST_GRID, INGEST_NARROW, INGEST_WIDE } from "~/app/(app)/ingest/grid";
import { Breadcrumbs } from "~/components/breadcrumbs";
import { PaneFrame } from "~/components/pane-frame";

/** Soft placeholder: the ingest grid holds every pane's height. */
export default function OnboardingLoading() {
  return (
    <div className="flex min-h-full flex-col @4xl/main:h-full">
      <Breadcrumbs crumbs={[{ label: "Onboarding" }]} />
      <h1 className="sr-only">Investor onboarding & KYC</h1>
      <div className={INGEST_GRID}>
        <PaneFrame title="KYC registry" className={INGEST_NARROW} />
        <PaneFrame title="Onboarding" className={INGEST_WIDE} />
        <PaneFrame title="Compliance" className={INGEST_WIDE} />
        <PaneFrame title="On-chain log" className={INGEST_NARROW} />
      </div>
    </div>
  );
}
