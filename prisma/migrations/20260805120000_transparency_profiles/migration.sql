-- EU AI Act Art. 50 transparency profiles: one satellite row per AI system
-- recording which Art. 50 obligations apply (50(1) interaction, 50(2) marking,
-- 50(3) emotion recognition, 50(4) deepfakes) and their implementation status,
-- plus the marking methods and the Reg. (EU) 2026/1744 grace-period fact.
-- Additive only — one new enum and one new table; no existing table, column,
-- or row is touched.

-- CreateEnum
CREATE TYPE "TransparencyObligationStatus" AS ENUM ('NOT_APPLICABLE', 'REQUIRED', 'IMPLEMENTED');

-- CreateTable
CREATE TABLE "transparency_profiles" (
    "id" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "art50InteractionStatus" "TransparencyObligationStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "art50MarkingStatus" "TransparencyObligationStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "art50EmotionStatus" "TransparencyObligationStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "art50DeepfakeStatus" "TransparencyObligationStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "markingMethods" TEXT[],
    "placedOnMarketBefore2Aug2026" BOOLEAN,
    "notes" TEXT,
    "reviewedBy" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transparency_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transparency_profiles_aiSystemId_key" ON "transparency_profiles"("aiSystemId");

-- CreateIndex
CREATE INDEX "transparency_profiles_organizationId_idx" ON "transparency_profiles"("organizationId");

-- AddForeignKey
ALTER TABLE "transparency_profiles" ADD CONSTRAINT "transparency_profiles_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transparency_profiles" ADD CONSTRAINT "transparency_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
