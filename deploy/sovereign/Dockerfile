# syntax=docker/dockerfile:1
# ============================================================================
# AI SENTINEL — sovereign image (deploy/sovereign/docker-compose.yml).
# Multi-stage: deps → builder (prisma generate + standalone next build) →
# runner (minimal app) + migrator (slim one-shot migrate/seed image with
# ONLY the prisma CLI, generated client, tsx, and the seed scripts —
# NOT the app's node_modules or build output).
# The app code is UNCHANGED from cloud — only env differs.
# ============================================================================

# ---- deps: full install (dev deps included — the builder needs them) -------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
# The lockfile is written by npm 11.6; node:22's bundled npm 10 rejects it.
# Pin the version that generated it (same fix as the DPO Central bundle).
RUN npm install -g npm@11.6.2
WORKDIR /app
COPY package.json package-lock.json ./
# --legacy-peer-deps: @swc/core@1.15.21 declares an OPTIONAL peer
# @swc/helpers>=0.5.17; on a clean install npm's ideal tree wants to hoist
# @swc/helpers@0.5.23 while the lockfile pins 0.5.15 (next's exact dep), so
# strict `npm ci` fails ("lock file's @swc/helpers@0.5.15 does not satisfy").
# Skipping auto-install of peers reproduces the tree the lockfile records —
# no lockfile churn, byte-identical installs.
# Retry on a clean tree: under QEMU emulation (arm64 built on an amd64 CI
# runner) npm 11.x intermittently races on parallel dir creation and dies with
# "ENOENT: mkdir .../node_modules/.../brace-expansion". The retry clears it;
# native builds pass first try.
RUN npm ci --legacy-peer-deps \
  || (echo "npm ci failed (emulation race?) — retrying clean" && rm -rf node_modules && npm ci --legacy-peer-deps) \
  || (rm -rf node_modules && npm ci --legacy-peer-deps)

# ---- builder: prisma client + standalone Next build (also the migrator) ----
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the bundles at BUILD time — thread
# them through as build args (compose passes them from .env). Changing any
# of these later requires: docker compose up -d --build app
ARG NEXT_PUBLIC_LOCAL_AUTH_ENABLED=true
ARG NEXT_PUBLIC_EMAIL_AUTH_ENABLED=false
ARG NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
ARG NEXT_PUBLIC_STRIPE_ENABLED=false
ARG NEXT_PUBLIC_ALL_SKILLS_FREE=true
ARG NEXT_PUBLIC_BRAND_NAME="AI SENTINEL"
ARG NEXT_PUBLIC_BRAND_ACCENT=""
ARG NEXT_PUBLIC_BRAND_LOGO_URL=""
ARG NEXT_PUBLIC_DPO_CENTRAL_URL=""
# The expert directory is a cloud/marketplace feature: it needs the live
# Dealroom API. On a sovereign box there is no such backend, so hide the
# directory and its CTA entirely (the flag gates both).
ARG NEXT_PUBLIC_EXPERT_DIRECTORY_ENABLED=false
ENV NEXT_PUBLIC_LOCAL_AUTH_ENABLED=$NEXT_PUBLIC_LOCAL_AUTH_ENABLED \
    NEXT_PUBLIC_EMAIL_AUTH_ENABLED=$NEXT_PUBLIC_EMAIL_AUTH_ENABLED \
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=$NEXT_PUBLIC_GOOGLE_AUTH_ENABLED \
    NEXT_PUBLIC_STRIPE_ENABLED=$NEXT_PUBLIC_STRIPE_ENABLED \
    NEXT_PUBLIC_ALL_SKILLS_FREE=$NEXT_PUBLIC_ALL_SKILLS_FREE \
    NEXT_PUBLIC_BRAND_NAME=$NEXT_PUBLIC_BRAND_NAME \
    NEXT_PUBLIC_BRAND_ACCENT=$NEXT_PUBLIC_BRAND_ACCENT \
    NEXT_PUBLIC_BRAND_LOGO_URL=$NEXT_PUBLIC_BRAND_LOGO_URL \
    NEXT_PUBLIC_DPO_CENTRAL_URL=$NEXT_PUBLIC_DPO_CENTRAL_URL \
    NEXT_PUBLIC_EXPERT_DIRECTORY_ENABLED=$NEXT_PUBLIC_EXPERT_DIRECTORY_ENABLED \
    NEXT_OUTPUT_STANDALONE=true \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
# prisma generate needs no live DB; give next build a placeholder so nothing
# accidentally dials out during static generation. NB: the Prisma datasource
# reads ais_DATABASE_URL (Vercel-scoped name), not DATABASE_URL.
ENV ais_DATABASE_URL=postgresql://build:build@localhost:5432/build
# The repo's `npm run build` also runs `prisma migrate deploy` (for the
# hosted/Vercel lane) — that belongs to the migrator service, not an image
# build with a placeholder DATABASE_URL. Invoke the buildable steps directly,
# as SEPARATE steps so nothing downstream of `prisma generate` ever waits on
# (or is invalidated by) the app build.
RUN npx prisma generate
RUN npx next build

# ---- runner: minimal standalone runtime -------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3003 \
    HOSTNAME=0.0.0.0
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3003
CMD ["node", "server.js"]

# ---- migrator: slim one-shot migrate + first-boot seed ----------------------
# Published as ghcr.io/rindogatan/aisentinel-migrator. Contains ONLY what
# deploy/sovereign/migrate.sh needs: the prisma CLI + generated client, tsx,
# the append-only migrations history, and the seed scripts + their data.
# Layers are ordered most-stable-first so a typical release republishes only
# the final few-MB code layer, not the dependency layers.
FROM node:22-alpine AS migrator
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
# Layer 1 — ONLY the three tools migrate.sh needs, at the LOCKFILE's exact
# versions (not floating). Deliberately installed WITHOUT the app package.json
# in place: `npm install <pkg>` next to a package.json reconciles the app's
# ENTIRE dependency tree (that is the 1.8 GB trap this stage exists to avoid).
COPY package-lock.json /tmp/app-package-lock.json
RUN node -e "const l=require('/tmp/app-package-lock.json').packages;const v=p=>l['node_modules/'+p].version;process.stdout.write(['prisma@'+v('prisma'),'@prisma/client@'+v('@prisma/client'),'tsx@'+v('tsx')].join(' '))" > /tmp/migrator-deps \
 && npm install --no-save --no-audit --no-fund $(cat /tmp/migrator-deps) \
 && npm cache clean --force \
 && rm -rf /root/.npm /tmp/migrator-deps /tmp/app-package-lock.json package.json
# Layer 2 — generated Prisma client (changes only when the schema changes).
# generate needs no live DB; placeholder guards against accidental dial-out.
ENV ais_DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npx prisma generate
# Layer 3 — seed data snapshot (a few MB, changes on catalog refreshes).
COPY vendors/catalog-snapshot.json ./vendors/catalog-snapshot.json
# Layer 4 — package.json (npm run script lookup only — its deps are NOT
# installed here), migrations + seed code + entrypoint script. Churns every
# release but is only a few hundred KB.
COPY package.json ./package.json
COPY prisma ./prisma
COPY scripts ./scripts
COPY src/lib ./src/lib
COPY deploy/sovereign/migrate.sh ./deploy/sovereign/migrate.sh
# Same invocation contract as the suite kit (working_dir /app); the local
# sovereign compose overrides this with its bind-mounted copy of migrate.sh.
ENTRYPOINT ["/bin/sh", "deploy/sovereign/migrate.sh"]
