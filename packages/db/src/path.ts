import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, parse } from "node:path";

const WORKSPACE_MARKER = "pnpm-workspace.yaml";

export const resolveDbPath = (): string => {
  // Explicit override wins (e.g. a hosted path in production).
  if (process.env.DB_PATH) return process.env.DB_PATH;

  const { root } = parse(process.cwd());
  let dir = process.cwd();
  while (!existsSync(join(dir, WORKSPACE_MARKER))) {
    if (dir === root) {
      // No workspace on disk — a serverless runtime like Vercel, where the
      // filesystem is read-only except for the OS temp dir. Fall back there so
      // opening the DB never throws at import; the control-plane reads that
      // depend on it degrade gracefully (see the callers' try/catch).
      return join(tmpdir(), "cfo.db");
    }
    dir = dirname(dir);
  }
  return join(dir, "cfo.db");
};
