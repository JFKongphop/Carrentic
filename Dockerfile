# Carrentic — container image for Fly.io (a real process with a writable disk,
# so the local SQLite DB works exactly like it does in dev).
#
#   fly launch --no-deploy      # once, to create the app + fly.toml is here
#   fly secrets set HEDERA_OPERATOR_KEY=... OPENAI_API_KEY=... (etc — see below)
#   fly deploy

# ---- build stage: install (compiles better-sqlite3's native module) + build ----
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable \
 && apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Whole workspace (a pnpm monorepo install needs every package manifest).
COPY . .
RUN pnpm install --frozen-lockfile

# Build the web app directly (bypass the repo's `with-env` script, which expects
# a local .env; on Fly the env comes from `fly secrets`).
RUN pnpm -F web exec next build

# ---- runtime stage: slim image, no build tools ----
FROM node:22-bookworm-slim AS runner
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /app

# Bring the built app + installed deps (incl. the compiled better-sqlite3 binary).
COPY --from=build /app /app

ENV NODE_ENV=production
ENV PORT=3001
# The SQLite DB lives here. Mount a Fly volume at /data to persist it across
# deploys (see fly.toml); without a volume it's ephemeral, which is fine for a
# demo — the chat reads its key from OPENAI_API_KEY, and the fleet/tokenize data
# comes from Hedera + Uniswap, not this DB.
ENV DB_PATH=/data/cfo.db
RUN mkdir -p /data

EXPOSE 3001
CMD ["sh", "-c", "pnpm -F web exec next start --port ${PORT:-3001} --hostname 0.0.0.0"]
