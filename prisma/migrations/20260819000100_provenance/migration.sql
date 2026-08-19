-- Provenance and human confirmation for generated governance artifacts.
--
-- Auto-generated compliance artifacts get dismissed when a reviewer cannot
-- tell what a human stood behind. These columns make the origin of every
-- artifact legible and let a human take explicit ownership of it.
--
-- provenance  = where the row came from (defaults to USER_ENTERED, so every
--               pre-existing row is already correct and needs no backfill;
--               auto-generators opt in explicitly).
-- sourceRef   = which rule pack / catalog revision produced it.
-- confirmedBy/confirmedAt = a human took ownership. Orthogonal to provenance:
--               editing a row through a normal mutation counts as confirming.
--
-- Additive only — one new enum, four new nullable/defaulted columns on five
-- existing tables, and one composite index. No existing table, column, or row
-- is altered or dropped.

-- CreateEnum
CREATE TYPE "Provenance" AS ENUM ('USER_ENTERED', 'AUTO_CATALOG', 'AUTO_TEMPLATE', 'AUTO_RULE', 'IMPORTED');

-- AlterTable
ALTER TABLE "risk_classifications"
    ADD COLUMN "provenance" "Provenance" NOT NULL DEFAULT 'USER_ENTERED',
    ADD COLUMN "sourceRef" TEXT,
    ADD COLUMN "confirmedBy" TEXT,
    ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "compliance_mappings"
    ADD COLUMN "provenance" "Provenance" NOT NULL DEFAULT 'USER_ENTERED',
    ADD COLUMN "sourceRef" TEXT,
    ADD COLUMN "confirmedBy" TEXT,
    ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "oversight_gates"
    ADD COLUMN "provenance" "Provenance" NOT NULL DEFAULT 'USER_ENTERED',
    ADD COLUMN "sourceRef" TEXT,
    ADD COLUMN "confirmedBy" TEXT,
    ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ai_policies"
    ADD COLUMN "provenance" "Provenance" NOT NULL DEFAULT 'USER_ENTERED',
    ADD COLUMN "sourceRef" TEXT,
    ADD COLUMN "confirmedBy" TEXT,
    ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transparency_profiles"
    ADD COLUMN "provenance" "Provenance" NOT NULL DEFAULT 'USER_ENTERED',
    ADD COLUMN "sourceRef" TEXT,
    ADD COLUMN "confirmedBy" TEXT,
    ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- CreateIndex
-- compliance_mappings is the only high-cardinality provenance table: the
-- assurance summary counts confirmed vs unconfirmed rows per org off this.
CREATE INDEX "compliance_mappings_organizationId_provenance_confirmedAt_idx" ON "compliance_mappings"("organizationId", "provenance", "confirmedAt");
