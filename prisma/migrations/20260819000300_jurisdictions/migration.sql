-- Operating jurisdictions: the missing dimension for multi-regime scoping.
--
-- Until now the product reasoned as if every customer were EU-facing. Declaring
-- where an organization operates is what lets the obligations calendar and the
-- US regimes (California ADMT, Texas, Illinois, NYC…) say "this applies to you"
-- instead of guessing.
--
-- Semantics, enforced by every consumer:
--   * An EMPTY operatingJurisdictions array means UNDECLARED — never
--     "operates nowhere". Existing rows and fresh self-host installs all start
--     empty, so "we can't tell yet" must stay distinguishable from
--     "does not apply".
--   * ai_systems.jurisdictionOverride is narrowing-only: empty inherits the org
--     set, non-empty intersects with it, and an empty intersection is a
--     conflict for a human to resolve.
--
-- Additive only; no existing row is modified.

-- CreateEnum
CREATE TYPE "Jurisdiction" AS ENUM (
    'EU',
    'EEA',
    'UK',
    'US_FEDERAL',
    'US_CA',
    'US_CO',
    'US_CT',
    'US_IL',
    'US_NY',
    'US_TX',
    'US_UT',
    'US_VA',
    'US_WA',
    'CANADA',
    'BRAZIL',
    'CHINA',
    'JAPAN',
    'SOUTH_KOREA',
    'AUSTRALIA',
    'INDIA',
    'SWITZERLAND',
    'OTHER'
);

-- AlterTable
ALTER TABLE "organizations"
    ADD COLUMN "operatingJurisdictions" "Jurisdiction"[],
    ADD COLUMN "jurisdictionsReviewedBy" TEXT,
    ADD COLUMN "jurisdictionsReviewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ai_systems"
    ADD COLUMN "jurisdictionOverride" "Jurisdiction"[];

-- CreateIndex
-- GIN so `operatingJurisdictions has 'US_CA'` scoping queries stay indexed as
-- the number of organizations grows.
CREATE INDEX "organizations_operatingJurisdictions_idx" ON "organizations" USING GIN ("operatingJurisdictions");
