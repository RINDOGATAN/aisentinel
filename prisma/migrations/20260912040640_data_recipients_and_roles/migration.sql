-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('PROCESSOR', 'SERVICE_PROVIDER', 'CONTROLLER', 'JOINT_CONTROLLER', 'THIRD_PARTY', 'ADVERTISING_PLATFORM', 'DATA_BROKER', 'AFFILIATE', 'PUBLIC_AUTHORITY', 'OTHER');

-- CreateEnum
CREATE TYPE "DataProtectionRole" AS ENUM ('UNDETERMINED', 'CONTROLLER', 'JOINT_CONTROLLER', 'PROCESSOR', 'SUB_PROCESSOR', 'THIRD_PARTY');

-- AlterTable
ALTER TABLE "ai_system_data_sources" ADD COLUMN     "origin" TEXT,
ADD COLUMN     "retentionPeriod" TEXT,
ADD COLUMN     "sensitiveCategories" TEXT[];

-- AlterTable
ALTER TABLE "ai_systems" ADD COLUMN     "dataRole" "DataProtectionRole" NOT NULL DEFAULT 'UNDETERMINED',
ADD COLUMN     "retentionPeriod" TEXT,
ADD COLUMN     "transactionRole" TEXT;

-- CreateTable
CREATE TABLE "data_recipients" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RecipientType" NOT NULL DEFAULT 'OTHER',
    "purpose" TEXT,
    "dataCategories" TEXT[],
    "sensitiveCategories" TEXT[],
    "contractRef" TEXT,
    "transferMechanism" TEXT,
    "retentionPeriod" TEXT,
    "vendorId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_recipients_organizationId_idx" ON "data_recipients"("organizationId");

-- CreateIndex
CREATE INDEX "data_recipients_aiSystemId_idx" ON "data_recipients"("aiSystemId");

-- AddForeignKey
ALTER TABLE "data_recipients" ADD CONSTRAINT "data_recipients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_recipients" ADD CONSTRAINT "data_recipients_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_recipients" ADD CONSTRAINT "data_recipients_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ai_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
