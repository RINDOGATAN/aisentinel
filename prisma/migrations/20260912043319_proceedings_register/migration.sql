-- CreateEnum
CREATE TYPE "ProceedingType" AS ENUM ('INQUIRY', 'INVESTIGATION', 'ENFORCEMENT', 'CONSENT_ORDER', 'MARKET_SURVEILLANCE', 'CIVIL_LITIGATION', 'CLASS_ACTION', 'REPRESENTATIVE_ACTION', 'SECURITIES_CLAIM', 'DERIVATIVE_CLAIM', 'OTHER');

-- CreateEnum
CREATE TYPE "ProceedingStatus" AS ENUM ('MONITORING', 'OPEN', 'RESPONDING', 'DECIDED', 'APPEALED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ProceedingEventKind" AS ENUM ('RECEIVED', 'SENT', 'FILING', 'DEADLINE', 'DECISION', 'MEETING', 'NOTE');

-- AlterTable
ALTER TABLE "ai_incidents" ADD COLUMN     "aiOfficeCompetent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "awareAt" TIMESTAMP(3),
ADD COLUMN     "deathOccurred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "highRiskToIndividuals" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "personalDataBreach" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "widespreadOrCriticalInfrastructure" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "regulatory_proceedings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "jurisdiction" "Jurisdiction",
    "type" "ProceedingType" NOT NULL DEFAULT 'INQUIRY',
    "status" "ProceedingStatus" NOT NULL DEFAULT 'MONITORING',
    "reference" TEXT,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "summary" TEXT,
    "positionSummary" TEXT,
    "originNote" TEXT,
    "externalCounsel" TEXT,
    "incidentId" TEXT,
    "aiSystemId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulatory_proceedings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proceeding_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "proceedingId" TEXT NOT NULL,
    "kind" "ProceedingEventKind" NOT NULL DEFAULT 'NOTE',
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "occurredAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reference" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proceeding_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "regulatory_proceedings_organizationId_status_idx" ON "regulatory_proceedings"("organizationId", "status");

-- CreateIndex
CREATE INDEX "regulatory_proceedings_incidentId_idx" ON "regulatory_proceedings"("incidentId");

-- CreateIndex
CREATE INDEX "proceeding_events_organizationId_idx" ON "proceeding_events"("organizationId");

-- CreateIndex
CREATE INDEX "proceeding_events_proceedingId_dueAt_idx" ON "proceeding_events"("proceedingId", "dueAt");

-- AddForeignKey
ALTER TABLE "regulatory_proceedings" ADD CONSTRAINT "regulatory_proceedings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_proceedings" ADD CONSTRAINT "regulatory_proceedings_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "ai_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_proceedings" ADD CONSTRAINT "regulatory_proceedings_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proceeding_events" ADD CONSTRAINT "proceeding_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proceeding_events" ADD CONSTRAINT "proceeding_events_proceedingId_fkey" FOREIGN KEY ("proceedingId") REFERENCES "regulatory_proceedings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
