-- AI vendors: the provider's own published documents about its models
-- (safety framework, transparency report, model card), whether it has signed
-- the EU General-Purpose AI Code of Practice, whether it describes itself as a
-- frontier developer, and when a person last checked them.
-- Additive only: one new enum type and six nullable columns. No data change.

-- CreateEnum
CREATE TYPE "DisclosureAnswer" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- AlterTable
ALTER TABLE "ai_vendors" ADD COLUMN     "disclosuresCheckedAt" TIMESTAMP(3),
ADD COLUMN     "frontierDeveloper" "DisclosureAnswer",
ADD COLUMN     "modelCardUrl" TEXT,
ADD COLUMN     "safetyFrameworkUrl" TEXT,
ADD COLUMN     "signedGpaiCode" "DisclosureAnswer",
ADD COLUMN     "transparencyReportUrl" TEXT;
