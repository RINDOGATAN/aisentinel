-- CreateEnum
CREATE TYPE "ReportAudience" AS ENUM ('BOARD', 'AUDIT_COMMITTEE', 'RISK_COMMITTEE', 'EXECUTIVE', 'REGULATOR', 'OTHER');

-- CreateTable
CREATE TABLE "board_reports" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT,
    "audience" "ReportAudience" NOT NULL DEFAULT 'BOARD',
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "presenter" TEXT,
    "attendees" TEXT[],
    "summary" TEXT,
    "decisionsRequested" TEXT,
    "decisionsTaken" TEXT,
    "actionsAgreed" TEXT,
    "nextReportDue" TIMESTAMP(3),
    "snapshotId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_reports_organizationId_reportedAt_idx" ON "board_reports"("organizationId", "reportedAt");

-- AddForeignKey
ALTER TABLE "board_reports" ADD CONSTRAINT "board_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_reports" ADD CONSTRAINT "board_reports_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "program_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
