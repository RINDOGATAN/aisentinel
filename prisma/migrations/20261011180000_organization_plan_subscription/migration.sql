-- Automatic upgrade (behind AUTO_UPGRADE_ENABLED): the payment subscription
-- behind an organization's paid plan, so its end returns the organization to
-- the pilot. Additive only: one nullable column and one index. No data is
-- updated or deleted. Builds on 20261011120000_organization_plan.
--
-- To be applied only after review, by the conductor. Note that the
-- production build runs `prisma migrate deploy`, so merging this branch
-- applies it to the production database.

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "planStripeSubscriptionId" TEXT;

-- CreateIndex
CREATE INDEX "organizations_planStripeSubscriptionId_idx" ON "organizations"("planStripeSubscriptionId");
