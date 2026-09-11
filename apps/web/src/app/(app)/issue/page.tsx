import type { Metadata } from "next";

import { Breadcrumbs } from "~/components/breadcrumbs";
import { IssueBond } from "~/components/issue/issue-bond";

export const metadata: Metadata = { title: "Tokenize · Carrentic" };

/**
 * Tokenize flow: the form on top, the on-chain status below. Deploy + mint run
 * server-side with the operator key — no wallet.
 */
export default function IssuePage() {
  return (
    <div className="flex min-h-full flex-col">
      <Breadcrumbs crumbs={[{ label: "Tokenize" }]} />
      <h1 className="sr-only">Tokenize a car</h1>
      <IssueBond />
    </div>
  );
}
