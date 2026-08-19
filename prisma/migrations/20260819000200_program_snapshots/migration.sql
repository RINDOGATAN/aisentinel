-- Program snapshots: immutable, reproducible captures of a governance program.
--
-- A snapshot freezes exactly what program-data.ts returned (graph + scorecard,
-- verbatim, no reshaping) plus the rule-pack versions in force at capture time.
-- That last part is what lets a diff separate "the program improved" from "the
-- law moved underneath you". Additive only; no existing row is touched.

-- CreateEnum
CREATE TYPE "SnapshotReason" AS ENUM ('QUICKSTART', 'MANUAL', 'EXPORT', 'SCHEDULED');

-- CreateTable
CREATE TABLE "program_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT,
    "reason" "SnapshotReason" NOT NULL,
    "locale" TEXT NOT NULL,
    "graph" JSONB NOT NULL,
    "scorecard" JSONB NOT NULL,
    "assurance" JSONB,
    "overall" INTEGER NOT NULL,
    "systemCount" INTEGER NOT NULL,
    "confirmedPct" INTEGER NOT NULL,
    "rulePacks" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_snapshots_organizationId_createdAt_idx" ON "program_snapshots"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "program_snapshots" ADD CONSTRAINT "program_snapshots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
