import type { Metadata } from "next";

import { Pane } from "@openledger-cfo/ui/pane";

import { Breadcrumbs } from "~/components/breadcrumbs";
import { loadFund } from "~/server/fund";

export const dynamic = "force-dynamic";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const shortAddr = (a: string) =>
  a.startsWith("0x") && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
const hashscanAccount = (a: string) =>
  `https://hashscan.io/testnet/account/${a}`;

const idOf = async (params: Promise<{ id: string }>) =>
  decodeURIComponent((await params).id);

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = await idOf(props.params);
  return { title: `${shortAddr(id)} · Assetic` };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label">{label}</span>
      <span className="text-[20px] leading-6 font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default async function HolderPage(props: {
  params: Promise<{ id: string }>;
}) {
  const id = await idOf(props.params);
  const loaded = await loadFund();

  const holder = loaded.ok
    ? loaded.value.holders.find(
        (h) => h.accountId.toLowerCase() === id.toLowerCase(),
      )
    : undefined;

  return (
    <div className="flex min-h-full flex-col">
      <Breadcrumbs
        crumbs={[
          { label: "Cap table", href: "/accounts" },
          { label: shortAddr(id) },
        ]}
      />
      <div className="grid grid-cols-12 gap-3 p-3">
        {!loaded.ok || holder === undefined ? (
          <Pane title="Holder" className="col-span-12">
            <p className="text-muted-foreground text-xs">
              {loaded.ok
                ? `${shortAddr(id)} is not a holder of this security.`
                : `Could not load the fund: ${loaded.error}`}
            </p>
          </Pane>
        ) : (
          <>
            <Pane
              title={shortAddr(holder.accountId)}
              meta="ERC-3643 · KYC ✓"
              className="col-span-12"
            >
              <div className="grid grid-cols-2 gap-6 @2xl/main:grid-cols-4">
                <Stat label="Units held" value={String(holder.balance)} />
                <Stat
                  label="Ownership"
                  value={`${((holder.balance / (loaded.value.unitsOutstanding || 1)) * 100).toFixed(1)}%`}
                />
                <Stat
                  label="Face value"
                  value={usd(holder.balance * loaded.value.faceValuePerUnit)}
                />
                <Stat
                  label="NAV value"
                  value={usd(holder.balance * loaded.value.nav.navPerShare)}
                />
              </div>
            </Pane>

            <Pane title="Identity & compliance" className="col-span-12 @3xl/main:col-span-6">
              <dl className="flex flex-col gap-2 text-xs">
                <div className="flex flex-col gap-0.5">
                  <dt className="label">Account</dt>
                  <dd className="font-mono">{holder.accountId}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="label">KYC</dt>
                  <dd>Granted · on-chain identity registered</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="label">Transfer eligibility</dt>
                  <dd>Cleared — passes compliance checks</dd>
                </div>
              </dl>
            </Pane>

            <Pane title="On-chain" className="col-span-12 @3xl/main:col-span-6">
              <div className="flex flex-col gap-2 text-xs">
                <a
                  href={hashscanAccount(holder.accountId)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline"
                >
                  Account on HashScan ↗
                </a>
                <a
                  href={`https://hashscan.io/testnet/token/${loaded.value.bondTokenId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline"
                >
                  Security {loaded.value.bondTokenId} ↗
                </a>
              </div>
            </Pane>
          </>
        )}
      </div>
    </div>
  );
}
