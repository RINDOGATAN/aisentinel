-- Hosted service: an organization's plan. PILOT (the free, capped pilot) or
-- EU_CLOUD (the paid EU cloud plan, which lifts the pilot caps and the
-- editing window). Additive only: one new enum type, five new nullable
-- columns and one index. "plan" has a constant default, which PostgreSQL 11
-- and later record in the catalogue without rewriting the table, so every
-- existing organization reads as PILOT and keeps exactly the behaviour it had
-- (a null plan also counts as the pilot). No data is updated or deleted.
--
-- To be applied only after review, by the conductor. Note that the
-- production build runs `prisma migrate deploy`, so merging this branch
-- applies it to the production database.

-- CreateEnum
CREATE TYPE "OrganizationPlan" AS ENUM ('PILOT', 'EU_CLOUD');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "plan" "OrganizationPlan" DEFAULT 'PILOT',
ADD COLUMN     "planNote" TEXT,
ADD COLUMN     "planRenewsAt" TIMESTAMP(3),
ADD COLUMN     "planStartedAt" TIMESTAMP(3),
ADD COLUMN     "planStripeSubscriptionId" TEXT;

-- CreateIndex
CREATE INDEX "organizations_planStripeSubscriptionId_idx" ON "organizations"("planStripeSubscriptionId");
