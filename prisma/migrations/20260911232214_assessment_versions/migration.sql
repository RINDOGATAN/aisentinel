-- CreateTable
CREATE TABLE "ai_assessment_versions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL,
    "title" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION,
    "responses" JSONB,
    "mitigations" JSONB,
    "contentHash" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_assessment_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_assessment_versions_organizationId_idx" ON "ai_assessment_versions"("organizationId");

-- CreateIndex
CREATE INDEX "ai_assessment_versions_assessmentId_createdAt_idx" ON "ai_assessment_versions"("assessmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_assessment_versions_assessmentId_version_key" ON "ai_assessment_versions"("assessmentId", "version");

-- AddForeignKey
ALTER TABLE "ai_assessment_versions" ADD CONSTRAINT "ai_assessment_versions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_assessment_versions" ADD CONSTRAINT "ai_assessment_versions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "ai_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
