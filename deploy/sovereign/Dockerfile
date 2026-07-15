# syntax=docker/dockerfile:1
# ============================================================================
# AI SENTINEL — sovereign image (deploy/sovereign/docker-compose.yml).
# Multi-stage: deps → builder (prisma generate + standalone next build) →
# runner (minimal). The `builder` stage doubles as the one-shot migrator
# (it has the prisma CLI, tsx and the seed scripts).
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
ENV NEXT_PUBLIC_LOCAL_AUTH_ENABLED=$NEXT_PUBLIC_LOCAL_AUTH_ENABLED \
    NEXT_PUBLIC_EMAIL_AUTH_ENABLED=$NEXT_PUBLIC_EMAIL_AUTH_ENABLED \
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=$NEXT_PUBLIC_GOOGLE_AUTH_ENABLED \
    NEXT_PUBLIC_STRIPE_ENABLED=$NEXT_PUBLIC_STRIPE_ENABLED \
    NEXT_PUBLIC_ALL_SKILLS_FREE=$NEXT_PUBLIC_ALL_SKILLS_FREE \
    NEXT_PUBLIC_BRAND_NAME=$NEXT_PUBLIC_BRAND_NAME \
    NEXT_PUBLIC_BRAND_ACCENT=$NEXT_PUBLIC_BRAND_ACCENT \
    NEXT_PUBLIC_BRAND_LOGO_URL=$NEXT_PUBLIC_BRAND_LOGO_URL \
    NEXT_PUBLIC_DPO_CENTRAL_URL=$NEXT_PUBLIC_DPO_CENTRAL_URL \
    NEXT_OUTPUT_STANDALONE=true \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
# prisma generate needs no live DB; give next build a placeholder so nothing
# accidentally dials out during static generation. NB: the Prisma datasource
# reads ais_DATABASE_URL (Vercel-scoped name), not DATABASE_URL.
ENV ais_DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npm run build

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
