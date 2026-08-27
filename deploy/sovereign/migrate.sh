#!/bin/sh
# One-shot migrator for the sovereign bundle. Runs inside the slim `migrator`
# image (prisma CLI + tsx + seed scripts present). Safe to re-run any time:
#
#   docker compose run --rm migrator
#
# Schema: applied with `prisma migrate deploy` from the committed
# prisma/migrations history. Installs created before the 0_init baseline were
# deployed via `prisma db push` (no _prisma_migrations bookkeeping); for those
# we mark the 0_init baseline as already applied (a metadata-only step that
# changes no data) before deploying. See prisma/migrations/README.md.
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

# Pre-baseline install detection: tables exist (db push era) but the migrations
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
  echo "[migrate] existing users found — skipping first-boot bootstrap."
else
  echo "[migrate] first boot — bootstrapping (no demo data)…"
  # Creates the base organization/user rows. First boot ONLY: re-running this
  # on a live instance is the one seed that could disturb real accounts.
  npm run db:seed
fi

# ── Regulatory content refresh — EVERY run, including upgrades ──────────
# Law does not stand still, and neither do our corrections to it. These seeds
# define frameworks, requirements, cross-framework mappings, system assessment
# templates and the tool/vendor catalogs. They are idempotent upserts keyed on
# stable ids, and they write only to catalog tables — an organization's own
# compliance mappings, assessments, policies and evidence live in different
# tables and are never touched.
#
# Skipping these on upgrade (as this script used to) meant a self-hoster could
# update to a release whose CODE knew about a framework its DATABASE had never
# been told about: the California ADMT tab would appear with nothing behind it,
# and corrections to the EU AI Act text would never arrive.
echo "[migrate] refreshing regulatory content…"
npm run db:seed-frameworks
npm run db:seed-admt
npm run db:seed-cross-mappings
npm run db:seed-templates
npm run db:seed-shadow-ai-tools
npm run db:seed-vendor-catalog

echo "[migrate] done."
