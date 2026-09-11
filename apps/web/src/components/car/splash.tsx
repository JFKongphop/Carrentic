"use client";

import type { CarKey } from "./car-hero";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { OlLogo } from "~/components/logo";
import { AetherNetwork } from "./aether-network";

/**
 * The landing split: the story on the left, the fleet on the right. The right
 * panel runs a single transparent 3D car over the cursor-reactive network, and
 * every few seconds slides up to the next car (swapped in place via postMessage,
 * so the canvas never reloads). The whole thing is portalled to <body> to escape
 * the app's CSS containment.
 */

const FLEET: readonly { car: CarKey; name: string; spec: string }[] = [
  { car: "porsche", name: "Porsche 911", spec: "$180k asset · ~$140/day rent" },
  { car: "mclaren720", name: "McLaren 720S", spec: "$300k asset · ~$260/day rent" },
  { car: "bmwM8", name: "BMW M8", spec: "$130k asset · ~$110/day rent" },
  { car: "mustang", name: "Ford Mustang GT", spec: "$55k asset · ~$75/day rent" },
];

const HOLD_MS = 5000;

function Fleet() {
  const [idx, setIdx] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Advance to the next car on a timer.
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % FLEET.length), HOLD_MS);
    return () => clearInterval(id);
  }, []);

  // On each change: swap the model in the live canvas, then slide the card up.
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "carrentic:setCar", car: FLEET[idx].car },
      window.location.origin,
    );
    cardRef.current?.animate(
      [
        { transform: "translateY(36%)", opacity: 0 },
        { transform: "translateY(0)", opacity: 1 },
      ],
      { duration: 1000, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  }, [idx]);

  const current = FLEET[idx];
  return (
    <div className="bg-card/40 relative min-h-[46vh] overflow-hidden md:min-h-0">
      <AetherNetwork className="absolute inset-0 h-full w-full" />

      {/* the sliding card: car + caption move together */}
      <div ref={cardRef} className="absolute inset-0">
        <iframe
          ref={iframeRef}
          title="Carrentic fleet — 3D"
          src={`/showcase?car=${FLEET[0].car}&transparent=1&paint=1&spin=1`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ border: "none", background: "transparent" }}
        />
        <div className="absolute bottom-8 left-8 space-y-1">
          <p className="text-muted-foreground text-[11px] tracking-[0.22em] uppercase">
            Now showing
          </p>
          <p className="text-2xl font-semibold tracking-tight">{current.name}</p>
          <p className="text-muted-foreground text-sm">{current.spec}</p>
        </div>
      </div>

      {/* which car of four */}
      <div className="absolute top-1/2 right-6 flex -translate-y-1/2 flex-col gap-2">
        {FLEET.map((f, i) => (
          <span
            key={f.car}
            aria-hidden
            className={`h-6 w-0.5 rounded-full transition-colors ${
              i === idx ? "bg-accent" : "bg-muted-foreground/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function Splash() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="bg-background text-foreground fixed inset-0 z-[9999] flex flex-col overflow-hidden md:grid md:grid-cols-[0.92fr_1.08fr]">
      {/* LEFT — the story (same cyberpunk ground as the right, but static) */}
      <div className="bg-card/40 flex flex-col justify-center gap-7 px-8 py-12 md:px-14">
        <span className="text-accent flex items-center gap-2 text-[15px] font-semibold lowercase">
          <span className="border-border grid size-8 place-items-center rounded-md border">
            <OlLogo size={16} />
          </span>
          <span>carrentic.</span>
        </span>

        <div className="space-y-5">
          <p className="text-accent text-[11px] font-medium tracking-[0.2em] uppercase">
            Fractional car ownership · tokenized on Hedera
          </p>
          <h1 className="text-5xl leading-[1.05] font-semibold tracking-tight md:text-6xl">
            Own the car.
            <br />
            Earn its rent.
          </h1>
          <p className="text-muted-foreground max-w-md text-[15px] leading-relaxed">
            Buy a share of a real car as a token on Hedera. It gets rented out,
            and every payout flows back to owners on-chain — run by an AI fleet
            manager.
          </p>
        </div>

        <div className="flex flex-col items-start gap-4">
          <Link
            href="/fleet"
            className="bg-accent hover:bg-accent/90 flex items-center rounded-md px-6 py-3 text-[15px] font-semibold tracking-wide text-black transition"
          >
            Enter the fleet
          </Link>
          <span className="text-muted-foreground flex items-center gap-2 text-[13px]">
            <span className="bg-accent size-1.5 rounded-full" />
            Live on Hedera testnet
          </span>
        </div>
      </div>

      {/* RIGHT — the fleet */}
      <Fleet />
    </div>,
    document.body,
  );
}
