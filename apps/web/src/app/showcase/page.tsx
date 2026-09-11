"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { CarHero, CarRingHero, CARS, type CarKey } from "~/components/car/car-hero";

/**
 * Isolated, full-bleed 3D car — meant to be embedded via <iframe> from the
 * landing hero. Its own document/React root is the one place R3F reliably runs
 * (the composed streamed home page starves the Canvas of its render loop).
 * The parent picks the car with ?car=<key>.
 */
function ShowcaseInner() {
  const params = useSearchParams();
  const initial = (params.get("car") as CarKey) || "nissan";
  const transparent = params.get("transparent") === "1";
  const ring = params.get("ring") === "1";
  const paint = params.get("paint") === "1";
  const spin = params.get("spin") === "1";
  const speedParam = Number(params.get("speed"));
  const spinSpeed = Number.isFinite(speedParam) && speedParam > 0 ? speedParam : undefined;
  const [car, setCar] = useState<CarKey>(initial);

  // The parent swaps the car via postMessage (no iframe reload → no flash).
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; car?: CarKey };
      if (data?.type === "carrentic:setCar" && data.car && data.car in CARS) {
        setCar(data.car);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Transparent mode: make the iframe document see-through so the parent's
  // particle field shows around the car.
  useEffect(() => {
    if (!transparent) return;
    const prevHtml = document.documentElement.style.background;
    const prevBody = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = prevHtml;
      document.body.style.background = prevBody;
    };
  }, [transparent]);

  // Inside an iframe, R3F can measure its container before the frame has its
  // final size and latch onto 300×150. Kick a few resize events so R3F re-reads
  // the (now-correct) size and the canvas fills the frame.
  useEffect(() => {
    const kick = () => window.dispatchEvent(new Event("resize"));
    const timers = [50, 200, 500, 1000, 1800].map((t) => setTimeout(kick, t));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: transparent ? "transparent" : "#101010",
        overflow: "hidden",
      }}
    >
      {ring ? (
        <CarRingHero transparent={transparent} className="absolute inset-0" />
      ) : (
        <CarHero
          model={car}
          transparent={transparent}
          paint={paint}
          spin={spin}
          spinSpeed={spinSpeed}
          className="absolute inset-0"
        />
      )}
    </div>
  );
}

export default function ShowcasePage() {
  return (
    <Suspense
      fallback={<div style={{ height: "100vh", background: "transparent" }} />}
    >
      <ShowcaseInner />
    </Suspense>
  );
}
