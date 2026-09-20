-- The worked example's own inventory: one row per record it created, so
-- removing the example removes exactly what it made and nothing the person has
-- since created themselves. `restore` holds what to put back rather than
-- delete. See src/server/services/sample/worked-example.ts.

-- CreateTable
CREATE TABLE "sample_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "restore" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sample_records_organizationId_entityType_entityId_key" ON "sample_records"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "sample_records_organizationId_idx" ON "sample_records"("organizationId");

-- AddForeignKey
ALTER TABLE "sample_records" ADD CONSTRAINT "sample_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
