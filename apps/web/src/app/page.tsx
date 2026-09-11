import type { Metadata } from "next";

import { Splash } from "~/components/car/splash";

export const metadata: Metadata = { title: "Carrentic" };

/**
 * The splash: a cursor-reactive particle network with the Porsche 911 at the
 * center. "Enter the fleet" leads to the dashboard at /fleet.
 */
export default function HomePage() {
  return <Splash />;
}
