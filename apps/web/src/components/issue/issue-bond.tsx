"use client";

import { useCallback, useState } from "react";

import type { BondIssuanceParams, IssueResult } from "@openledger-cfo/hedera";
import { hashscan } from "@openledger-cfo/hedera";
import { Button } from "@openledger-cfo/ui/button";
import { Input, Select } from "@openledger-cfo/ui/input";
import { Pane } from "@openledger-cfo/ui/pane";

/** A demo bond, pre-filled so issuance is one click after connecting. */
const today = new Date();
const inOneYear = new Date(today);
inOneYear.setFullYear(today.getFullYear() + 1);
const iso = (d: Date) => d.toISOString().slice(0, 10);

const DEFAULTS: BondIssuanceParams = {
  name: "Carrentic Vehicle",
  symbol: "CARV",
  // A checksum-valid ISIN — the ATS factory rejects a bad check digit.
  isin: "US0378331005",
  decimals: 0,
  currency: "USD",
  numberOfUnits: "1000",
  nominalValue: "1000",
  startingDate: iso(today),
  maturityDate: iso(inOneYear),
  couponRate: 5,
  couponFrequency: 2,
  requireKyc: true,
};

type Phase = "idle" | "issuing" | "done" | "error";

/** Shorten a 0x hash for display: 0x1234…abcd. */
const shortHash = (h: string) =>
  h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h;

/** A labelled field row. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function IssueBond() {
  const [form, setForm] = useState<BondIssuanceParams>(DEFAULTS);
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<IssueResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const say = useCallback(
    (msg: string) => setLog((prev) => [...prev, msg]),
    [],
  );

  const set = <K extends keyof BondIssuanceParams>(
    key: K,
    value: BondIssuanceParams[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const issue = useCallback(async () => {
    setError(null);
    setResult(null);
    setLog([]);
    setPhase("issuing");
    say(`Deploying "${form.name}" (${form.symbol}) on Hedera via ATS…`);
    say(`Minting ${form.numberOfUnits} ownership shares…`);
    try {
      // Server-side: the operator key deploys + mints the ERC-3643 bond via the
      // ATS factory (no wallet). See app/api/issue + packages/hedera/ats-deploy.
      const res = await fetch("/api/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await res.json()) as IssueResult & { error?: string };
      if (!res.ok || body.error) {
        throw new Error(body.error ?? `Issue failed (${res.status})`);
      }
      say(`Tokenized. Car ${body.tokenId} · tx ${shortHash(body.txId)}`);
      setResult(body);
      setPhase("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setPhase("error");
    }
  }, [form, say]);

  const busy = phase === "issuing";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <Pane title="Tokenize a car" className="w-full">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field label="Symbol">
            <Input
              value={form.symbol}
              onChange={(e) => set("symbol", e.target.value)}
            />
          </Field>
          <Field label="ISIN">
            <Input
              value={form.isin}
              onChange={(e) => set("isin", e.target.value)}
            />
          </Field>
          <Field label="Currency">
            <Input
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
            />
          </Field>
          <Field label="Ownership shares">
            <Input
              type="number"
              value={form.numberOfUnits}
              onChange={(e) => set("numberOfUnits", e.target.value)}
            />
          </Field>
          <Field label="Price per share">
            <Input
              type="number"
              value={form.nominalValue}
              onChange={(e) => set("nominalValue", e.target.value)}
            />
          </Field>
          <Field label="Start date">
            <Input
              type="date"
              value={form.startingDate}
              onChange={(e) => set("startingDate", e.target.value)}
            />
          </Field>
          <Field label="Buy-out date">
            <Input
              type="date"
              value={form.maturityDate}
              onChange={(e) => set("maturityDate", e.target.value)}
            />
          </Field>
          <Field label="Rent yield %">
            <Input
              type="number"
              value={form.couponRate ?? 0}
              onChange={(e) => set("couponRate", Number(e.target.value))}
            />
          </Field>
          <Field label="Rent payouts / year">
            <Select
              value={form.couponFrequency ?? 2}
              onChange={(e) =>
                set("couponFrequency", Number(e.target.value))
              }
            >
              <option value={1}>1 — annual</option>
              <option value={2}>2 — semi-annual</option>
              <option value={4}>4 — quarterly</option>
            </Select>
          </Field>
          <label className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.requireKyc}
              onChange={(e) => set("requireKyc", e.target.checked)}
            />
            <span className="text-xs">Gate transfers on KYC (ERC-3643 style)</span>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button onClick={issue} disabled={busy}>
            {phase === "issuing" ? "Tokenizing…" : "Tokenize car"}
          </Button>
        </div>
      </Pane>

      <Pane title="Status" className="min-h-0 w-full flex-1" scroll>
        {log.length === 0 ? (
          <p className="text-muted-foreground max-w-prose text-xs leading-relaxed text-balance">
            Tokenize a real car as an ERC-3643 security on Hedera Testnet via
            the Asset Tokenization Studio. It deploys and mints the ownership
            shares server-side with the operator key — no wallet needed. Every
            step is logged here.
          </p>
        ) : (
          <ol className="flex min-w-0 flex-col gap-1.5 text-xs">
            {log.map((line, i) => {
              const pending = busy && i === log.length - 1;
              return (
                <li
                  key={i}
                  className="text-muted-foreground flex min-w-0 items-start gap-2 break-words"
                >
                  <span
                    className={`mt-1 size-1.5 shrink-0 rounded-full ${
                      pending
                        ? "bg-accent animate-pulse"
                        : "bg-muted-foreground/40"
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 break-words">{line}</span>
                </li>
              );
            })}
          </ol>
        )}

        {result && (
          <div className="border-border mt-4 flex flex-col gap-2 border-t pt-4">
            <span className="label text-accent">✓ Tokenized on Hedera</span>
            <div className="bg-muted/40 border-border flex flex-col gap-2 rounded-md border p-3">
              <div className="flex flex-col gap-0.5">
                <span className="label">Car token</span>
                <a
                  href={hashscan.contract(result.tokenId)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent font-mono text-sm break-all underline underline-offset-2"
                >
                  {result.tokenId}
                </a>
              </div>
              <p className="text-muted-foreground text-[11px]">
                ERC-3643 · {form.numberOfUnits} shares · minted to treasury
              </p>
              <div className="flex flex-col gap-0.5">
                <span className="label">Deploy tx</span>
                <a
                  href={hashscan.tx(result.txId)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-accent font-mono text-[11px] break-all underline underline-offset-2"
                >
                  {shortHash(result.txId)} — HashScan ↗
                </a>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="border-border mt-4 flex flex-col gap-1 border-t pt-4">
            <span className="label text-red-500">Failed</span>
            <p className="text-xs break-words text-red-500/90">{error}</p>
          </div>
        )}
      </Pane>
    </div>
  );
}
