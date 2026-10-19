-- Policy owner, department, number, review interval and first-edit stamp.
-- Additive only: new nullable columns, then a one-time numbering of the
-- policies that already exist, in creation order within each organization.
ALTER TABLE "ai_policies" ADD COLUMN "number" INTEGER;
ALTER TABLE "ai_policies" ADD COLUMN "ownerMemberId" TEXT;
ALTER TABLE "ai_policies" ADD COLUMN "ownerName" TEXT;
ALTER TABLE "ai_policies" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "ai_policies" ADD COLUMN "reviewIntervalMonths" INTEGER;
ALTER TABLE "ai_policies" ADD COLUMN "editedAt" TIMESTAMP(3);

UPDATE "ai_policies" AS p
SET "number" = n.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "organizationId" ORDER BY "createdAt", "id") AS rn
  FROM "ai_policies"
) AS n
WHERE p."id" = n."id" AND p."number" IS NULL;
