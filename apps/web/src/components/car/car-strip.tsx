"use client";

import { useCallback, useRef, useState } from "react";

import { CARS, type CarKey } from "./car-hero";

/**
 * A 3D car preview strip — the same iframe/postMessage approach as CarShowcase
 * (the only place R3F reliably renders), with a compact horizontal picker.
 * Used on the Tokenize page: "this is the car you're tokenizing."
 */
export function CarStrip({
  height = 260,
  className,
}: {
  height?: number;
  className?: string;
}) {
  const [model, setModel] = useState<CarKey>("porsche");
  const initialModel = useRef<CarKey>("porsche").current;
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
      className={`border-border bg-card relative overflow-hidden rounded-lg border ${className ?? ""}`}
      style={{ height }}
    >
      <iframe
        ref={iframeRef}
        title="Carrentic — 3D car"
        src={`/showcase?car=${initialModel}`}
        className="h-full w-full"
        style={{ display: "block", border: "none", background: "#0c1013" }}
      />
      {/* label */}
      <div className="pointer-events-none absolute top-3 left-4">
        <span className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
          The car you&apos;re tokenizing
        </span>
        <div className="text-[15px] font-semibold">{CARS[model].label}</div>
      </div>
      {/* picker */}
      <div className="absolute top-3 right-3 flex max-w-[62%] flex-wrap justify-end gap-1.5">
        {(Object.keys(CARS) as CarKey[]).map((k) => (
          <button
            key={k}
            onClick={() => pick(k)}
            className={`rounded border px-2 py-1 text-[10px] backdrop-blur transition ${
              model === k
                ? "border-accent bg-accent text-black"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {CARS[k].label}
          </button>
        ))}
      </div>
    </section>
  );
}
