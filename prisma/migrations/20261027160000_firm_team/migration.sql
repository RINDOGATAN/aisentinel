-- Firm team from DPO Central (src/server/services/suite/firm-team.ts).
--
-- Additive and idempotent: two new tables (the copy of each DPO Central
-- account's firm team, and the last push applied per account), two nullable
-- columns (which membership came from a firm team; who created an
-- organisation), indexes and foreign keys. No existing row changes; no table
-- rewrite. Organisations created before this migration keep createdById NULL.

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- AlterTable
ALTER TABLE "organization_members" ADD COLUMN IF NOT EXISTS "firmTeamMemberId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "firm_team_members" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firm_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "firm_team_syncs" (
    "ownerEmail" TEXT NOT NULL,
    "lastAppliedAt" TIMESTAMP(3) NOT NULL,
    "dpcOrganizationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firm_team_syncs_pkey" PRIMARY KEY ("ownerEmail")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "organizations_createdById_idx" ON "organizations"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "organization_members_firmTeamMemberId_idx" ON "organization_members"("firmTeamMemberId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "firm_team_members_ownerEmail_email_key" ON "firm_team_members"("ownerEmail", "email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "firm_team_members_email_idx" ON "firm_team_members"("email");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_createdById_fkey') THEN
    ALTER TABLE "organizations" ADD CONSTRAINT "organizations_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_members_firmTeamMemberId_fkey') THEN
    ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_firmTeamMemberId_fkey"
      FOREIGN KEY ("firmTeamMemberId") REFERENCES "firm_team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
