import type { Metadata } from "next";

import { fontClassNames } from "@openledger-cfo/ui/fonts";

import { TRPCReactProvider } from "~/trpc/react";

import "~/app/styles.css";

export const metadata: Metadata = {
  title: "Carrentic",
  description: "Fractionally own a real car, earn its rent — tokenized on Hedera",
};

/**
 * The root shell is deliberately bare: just <html>/<body> and the tRPC provider.
 * The app chrome (rail, chat, status bar) lives in the (app) route group's
 * layout, so the splash route ("/") — which sits outside that group — renders
 * with no chrome at all. This is structural: there is no pathname check that
 * could ever let the chrome leak onto the landing page.
 */
export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassNames}>
      <body className="bg-background text-foreground h-screen overflow-hidden font-sans antialiased">
        <TRPCReactProvider>{props.children}</TRPCReactProvider>
      </body>
    </html>
  );
}
