-- CreateEnum
CREATE TYPE "ThreatModelStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScenarioCategory" AS ENUM ('DISCLOSURE', 'ACCURACY', 'MANIPULATION', 'AUTHORITY', 'HARM', 'DETECTION', 'CHAINS');

-- CreateEnum
CREATE TYPE "ThreatLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "BlastRadius" AS ENUM ('LIMITED', 'SIGNIFICANT', 'SEVERE');

-- CreateEnum
CREATE TYPE "ThreatPriority" AS ENUM ('WATCH', 'PLAN', 'ACT_NOW');

-- CreateEnum
CREATE TYPE "ScenarioStatus" AS ENUM ('OPEN', 'MITIGATED', 'ACCEPTED', 'OUT_OF_SCOPE');

-- CreateEnum
CREATE TYPE "ControlLayer" AS ENUM ('PREVENT', 'CONSTRAIN', 'DETECT', 'RESPOND', 'ASSURE');

-- CreateEnum
CREATE TYPE "TestResult" AS ENUM ('PASS', 'PARTIAL', 'FAIL');

-- CreateTable
CREATE TABLE "threat_models" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aiSystemId" TEXT,
    "name" TEXT NOT NULL,
    "systemSummary" TEXT,
    "capabilities" TEXT[],
    "status" "ThreatModelStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewedAt" TIMESTAMP(3),
    "nextReviewDue" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threat_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threat_scenarios" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "threatModelId" TEXT NOT NULL,
    "libraryId" TEXT,
    "category" "ScenarioCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "impact" "ThreatLevel" NOT NULL DEFAULT 'MEDIUM',
    "likelihood" "ThreatLevel" NOT NULL DEFAULT 'MEDIUM',
    "blastRadius" "BlastRadius" NOT NULL DEFAULT 'LIMITED',
    "priority" "ThreatPriority" NOT NULL DEFAULT 'PLAN',
    "status" "ScenarioStatus" NOT NULL DEFAULT 'OPEN',
    "decisionNote" TEXT,
    "owner" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threat_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threat_controls" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "layer" "ControlLayer" NOT NULL,
    "description" TEXT NOT NULL,
    "owner" TEXT,
    "implemented" BOOLEAN NOT NULL DEFAULT false,
    "implementedAt" TIMESTAMP(3),
    "howToTest" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threat_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_tests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "result" "TestResult" NOT NULL,
    "notes" TEXT,
    "evidenceRef" TEXT,
    "testedBy" TEXT NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_tests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "threat_models_organizationId_idx" ON "threat_models"("organizationId");

-- CreateIndex
CREATE INDEX "threat_models_aiSystemId_idx" ON "threat_models"("aiSystemId");

-- CreateIndex
CREATE INDEX "threat_scenarios_organizationId_idx" ON "threat_scenarios"("organizationId");

-- CreateIndex
CREATE INDEX "threat_scenarios_threatModelId_priority_idx" ON "threat_scenarios"("threatModelId", "priority");

-- CreateIndex
CREATE INDEX "threat_controls_organizationId_idx" ON "threat_controls"("organizationId");

-- CreateIndex
CREATE INDEX "threat_controls_scenarioId_idx" ON "threat_controls"("scenarioId");

-- CreateIndex
CREATE INDEX "control_tests_organizationId_idx" ON "control_tests"("organizationId");

-- CreateIndex
CREATE INDEX "control_tests_controlId_testedAt_idx" ON "control_tests"("controlId", "testedAt");

-- AddForeignKey
ALTER TABLE "threat_models" ADD CONSTRAINT "threat_models_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threat_models" ADD CONSTRAINT "threat_models_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threat_scenarios" ADD CONSTRAINT "threat_scenarios_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threat_scenarios" ADD CONSTRAINT "threat_scenarios_threatModelId_fkey" FOREIGN KEY ("threatModelId") REFERENCES "threat_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threat_controls" ADD CONSTRAINT "threat_controls_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threat_controls" ADD CONSTRAINT "threat_controls_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "threat_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_tests" ADD CONSTRAINT "control_tests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_tests" ADD CONSTRAINT "control_tests_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "threat_controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
