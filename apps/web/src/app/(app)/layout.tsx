import { readGateway } from "@openledger-cfo/api";

import { ChatPane } from "~/components/chat/chat-pane";
import { ChatDock } from "~/components/chat/dock";
import { pickSuggestions } from "~/components/chat/suggestions";
import { CliLogProvider } from "~/components/cli-log-provider";
import { ConfigDialogProvider } from "~/components/config/config-dialog-provider";
import { IngestRunProvider } from "~/components/ingest-run-provider";
import { Rail } from "~/components/rail";
import { StatusBar } from "~/components/status-bar";
import { loadChrome, loadRailBadges, NO_BADGES } from "~/server/chrome";

// The chrome quotes the ledger, so it is read per request like everything else.
export const dynamic = "force-dynamic";

/**
 * The app shell: rail + chat + status bar around every dashboard page. It lives
 * in the (app) route group, so the splash route ("/") — which is outside the
 * group — structurally never renders any of this. There is no runtime pathname
 * check: the chrome cannot leak onto the landing page.
 */
export default async function AppLayout(props: { children: React.ReactNode }) {
  const [chrome, badges, gateway] = await Promise.all([
    loadChrome(),
    loadRailBadges(),
    readGateway(),
  ]);

  return (
    <CliLogProvider>
      <IngestRunProvider>
        <ChatDock>
          <ConfigDialogProvider>
            {/* The chat column is sized so the data column clears the wide
            tier (896px) at a 1280 viewport. */}
            <div className="grid h-full grid-rows-[minmax(0,1fr)_1.5rem]">
              <div className="grid min-h-0 grid-cols-[3.5rem_minmax(0,1fr)] lg:grid-cols-[3.5rem_minmax(0,1fr)_clamp(320px,25vw,480px)]">
                <Rail
                  badges={badges.ok ? badges.value : NO_BADGES}
                  ledgerBad={!chrome.ok || chrome.value.stale}
                />
                <main
                  id="main"
                  tabIndex={-1}
                  className="@container/main min-h-0 min-w-0 overflow-y-auto"
                >
                  {props.children}
                </main>
                <ChatPane
                  ledgerOk={chrome.ok}
                  ai={gateway && { model: gateway.model }}
                  openers={pickSuggestions()}
                />
              </div>
              <StatusBar chrome={chrome} aiConfigured={gateway !== undefined} />
            </div>
          </ConfigDialogProvider>
        </ChatDock>
      </IngestRunProvider>
    </CliLogProvider>
  );
}
