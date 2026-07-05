#!/bin/sh
# One-shot migrator for the sovereign bundle. Runs inside the builder image
# (prisma CLI + tsx + seed scripts present). Safe to re-run any time:
#
#   docker compose run --rm migrator
#
# Schema: applied with `prisma migrate deploy` from the committed
# prisma/migrations history. Installs created before 1.0.0 were deployed via
# `prisma db push` (no _prisma_migrations bookkeeping); for those we mark the
# 0_init baseline as already applied (a metadata-only step that changes no
# data) before deploying. See prisma/migrations/README.md.
#
# Seed: CONTENT ONLY. Baseline catalogs (skill packages, compliance
# frameworks, assessment templates, Shadow-AI tools, vendor catalog,
# cross-framework mappings). No demo org, no demo/operator users:
# prisma/seed.ts only creates those when DEMO_SEED=true, which the sovereign
# bundle never sets. FIRST boot only; an instance that already has users is
# never re-seeded (the seeds' upserts could otherwise clobber live edits to
# seeded rows).
set -eu
cd /app

# Pre-1.0.0 install detection: tables exist (db push era) but the migrations
# ledger does not. Baseline once, then migrate deploy takes over forever.
cat > /tmp/baseline-check.js <<'EOF'
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const [row] = await p.$queryRawUnsafe(
    "SELECT to_regclass('public.\"User\"')::text AS users, to_regclass('public._prisma_migrations')::text AS ledger"
  );
  await p.$disconnect();
  // exit 0 = needs baseline (tables exist, no migrations ledger)
  process.exit(row.users !== null && row.ledger === null ? 0 : 1);
})().catch(() => process.exit(1));
EOF
if node /tmp/baseline-check.js; then
  echo "[migrate] pre-migrations install detected; baselining 0_init (metadata only)..."
  npx prisma migrate resolve --applied 0_init
fi

echo "[migrate] applying migrations (prisma migrate deploy)…"
npx prisma migrate deploy

if node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.count().then(c=>process.exit(c>0?0:1)).catch(()=>process.exit(1))"; then
  echo "[migrate] existing users found — skipping seed."
else
  echo "[migrate] first boot — seeding baseline content (no demo data)…"
  npm run db:seed
  npm run db:seed-frameworks
  npm run db:seed-templates
  npm run db:seed-shadow-ai-tools
  npm run db:seed-vendor-catalog
  npm run db:seed-cross-mappings
fi

echo "[migrate] done."
