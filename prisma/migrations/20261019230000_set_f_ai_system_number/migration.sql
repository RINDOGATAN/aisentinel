-- AI system reference numbers (AIS-001), like the policy numbers.
-- Additive only: a new nullable column, then a one-time numbering of the
-- systems that already exist, in creation order within each organization.
ALTER TABLE "ai_systems" ADD COLUMN "number" INTEGER;

UPDATE "ai_systems" AS s
SET "number" = n.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "organizationId" ORDER BY "createdAt", "id") AS rn
  FROM "ai_systems"
) AS n
WHERE s."id" = n."id" AND s."number" IS NULL;
