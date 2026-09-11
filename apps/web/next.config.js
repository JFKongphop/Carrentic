// better-sqlite3 is externalized by Next's default server-externals list and
// must resolve from this app at runtime — that is why package.json declares
// it without importing it.

/** @type {import("next").NextConfig} */
const config = {
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    // Only the `/sanitize` subpath is client-reachable; the entry point is server-only.
    "@openledger-cfo/agent",
    "@openledger-cfo/api",
    "@openledger-cfo/db",
    // Root entry (config + Mirror reads) is client-safe; the `/ats` subpath is
    // browser-only and dynamically imported so the heavy ATS SDK never SSRs.
    "@openledger-cfo/hedera",
    "@openledger-cfo/fund",
    "@openledger-cfo/uniswap",
    "@openledger-cfo/ui",
  ],

  turbopack: {
    // The ATS SDK pulls `react-native` transitively (mobile wallet connectors we
    // do not use). Alias it to an empty shim so the web build never bundles
    // native code. (Next 16 builds with Turbopack; a `webpack` config errors.)
    resolveAlias: {
      // The ATS SDK's Node-only deps that a browser bundle can't/shouldn't pull:
      "react-native": "./shims/empty.ts",
      "@mattrglobal/node-bbs-signatures": "./shims/empty.ts", // native .node binary
      "thread-stream": "./shims/empty.ts", // pino worker; dynamic-requires its test dir
      pino: "pino/browser.js", // browser build: console-based, exports `levels`, no thread-stream
      // Browser-only: server code (ledger, sqlite) still gets the real `fs`.
      fs: { browser: "./shims/empty.ts" },
    },
  },

  /** Memoises components and hooks so hand-written memo hygiene is not the plan */
  reactCompiler: true,

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
};

export default config;
