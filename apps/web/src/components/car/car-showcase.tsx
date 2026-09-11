"use client";

import { useCallback, useRef, useState } from "react";

import { CARS, type CarKey } from "./car-hero";

const usd = (n: number, min = 0) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: min,
    maximumFractionDigits: min,
  });

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
        {label}
      </span>
      <span
        className={`text-[19px] leading-none font-semibold tabular-nums ${
          accent ? "text-accent" : ""
        }`}
      >
        {value}
      </span>
      {sub ? (
        <span className="text-muted-foreground text-[10px]">{sub}</span>
      ) : null}
    </div>
  );
}

export function CarShowcase({
  tokenId,
  totalValue,
  shares,
  coOwners,
  rentPerYear,
  className,
}: {
  tokenId: string;
  totalValue: number;
  shares: number;
  coOwners: number;
  rentPerYear: number;
  className?: string;
}) {
  const [model, setModel] = useState<CarKey>("nissan");
  const valuePerShare = totalValue / shares;

  // The iframe loads ONCE (fixed initial src). Changing the car afterwards is a
  // postMessage to the live scene — no reload, so no blank/bordered flash.
  const initialModel = useRef<CarKey>("nissan").current;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const pick = useCallback((k: CarKey) => {
    setModel(k);
    iframeRef.current?.contentWindow?.postMessage(
      { type: "carrentic:setCar", car: k },
      window.location.origin,
    );
  }, []);

  return (
    <section
      className={`border-border bg-card overflow-hidden rounded-lg border ${className ?? ""}`}
    >
      {/* The live 3D car runs in its own document via an iframe — the only place
          R3F reliably renders (the composed streamed page starves its loop). */}
      <div className="relative" style={{ height: 420 }}>
        <iframe
          ref={iframeRef}
          title="Carrentic — 3D car"
          src={`/showcase?car=${initialModel}`}
          className="h-full w-full"
          style={{ display: "block", border: "none", background: "#0c1013" }}
        />
        {/* wordmark */}
        <div className="pointer-events-none absolute top-4 left-4">
          <div className="text-[11px] tracking-[0.2em] uppercase">
            <span className="text-accent">Carrentic</span>
          </div>
          <p className="text-muted-foreground mt-0.5 max-w-[22ch] text-[11px] leading-snug">
            Fractionally own a real car. Earn its rent. Tokenized on Hedera.
          </p>
        </div>
        {/* car selector — vertical column on the right */}
        <div className="absolute top-1/2 right-4 flex w-36 -translate-y-1/2 flex-col gap-1.5">
          {(Object.keys(CARS) as CarKey[]).map((k) => (
            <button
              key={k}
              onClick={() => pick(k)}
              className={`rounded border px-3 py-1.5 text-left text-[11px] backdrop-blur transition ${
                model === k
                  ? "border-accent bg-accent text-black"
                  : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {CARS[k].label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat bar below the stage. */}
      <div className="border-border border-t p-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-[24px] leading-none font-semibold">
            {CARS[model].label}
          </h2>
          <a
            href={`https://hashscan.io/testnet/contract/${tokenId}`}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-accent font-mono text-[11px] underline underline-offset-2"
          >
            {tokenId} · ERC-3643 ↗
          </a>
        </div>
        <div className="grid grid-cols-2 gap-4 @xl/main:grid-cols-4">
          <Stat
            label="Asset value"
            value={usd(totalValue)}
            sub="marked via Uniswap"
            accent
          />
          <Stat
            label="Share price"
            value={usd(valuePerShare, 0)}
            sub={`${shares.toLocaleString()} shares`}
          />
          <Stat label="Co-owners" value={String(coOwners)} sub="KYC-gated" />
          <Stat
            label="Rent yield"
            value={`${(rentPerYear * 100).toFixed(1)}%`}
            sub="paid to owners"
          />
        </div>
      </div>
    </section>
  );
}
