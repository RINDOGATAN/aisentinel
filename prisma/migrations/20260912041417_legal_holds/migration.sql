-- CreateTable
CREATE TABLE "legal_holds" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "matter" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "aiSystemId" TEXT,
    "issuedBy" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedBy" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,

    CONSTRAINT "legal_holds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "legal_holds_organizationId_releasedAt_idx" ON "legal_holds"("organizationId", "releasedAt");

-- CreateIndex
CREATE INDEX "legal_holds_aiSystemId_idx" ON "legal_holds"("aiSystemId");

-- AddForeignKey
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;
