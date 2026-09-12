-- CreateEnum
CREATE TYPE "SensitiveDataCategory" AS ENUM ('HEALTH', 'BIOMETRIC', 'PRECISE_LOCATION', 'FINANCIAL', 'OTHER');

-- CreateTable
CREATE TABLE "sensitive_data_assessments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aiSystemId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "category" "SensitiveDataCategory" NOT NULL DEFAULT 'HEALTH',
    "dataRole" TEXT,
    "factors" JSONB NOT NULL,
    "suggestedBand" TEXT,
    "band" TEXT,
    "bandRationale" TEXT,
    "decision" TEXT,
    "owner" TEXT,
    "frameworkRef" TEXT NOT NULL DEFAULT 'five-factor',
    "rulesVersion" TEXT NOT NULL,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sensitive_data_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sensitive_data_assessments_organizationId_idx" ON "sensitive_data_assessments"("organizationId");

-- CreateIndex
CREATE INDEX "sensitive_data_assessments_aiSystemId_idx" ON "sensitive_data_assessments"("aiSystemId");

-- AddForeignKey
ALTER TABLE "sensitive_data_assessments" ADD CONSTRAINT "sensitive_data_assessments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensitive_data_assessments" ADD CONSTRAINT "sensitive_data_assessments_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;
