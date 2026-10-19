-- Invitations by e-mail, and deputy department owners.
--
--   * organization_invitations — a pending invitation with its role and
--     departments; only a SHA-256 hash of the link's secret is stored.
--   * business_units.ownerInvitationId / deputyInvitationId — a pending invitee
--     named as owner or deputy owner, moved to the member columns on joining.
--   * business_units.deputyOwnerId — a second, deputy owner who is a member.
--
-- ADDITIVE ONLY: one new table, three new nullable columns, new indexes and
-- foreign keys (SET NULL / CASCADE). Nothing is dropped, renamed or retyped.

-- AlterTable
ALTER TABLE "business_units" ADD COLUMN     "deputyInvitationId" TEXT,
ADD COLUMN     "deputyOwnerId" TEXT,
ADD COLUMN     "ownerInvitationId" TEXT;

-- CreateTable
CREATE TABLE "organization_invitations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "businessUnitIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedMemberId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_invitations_tokenHash_key" ON "organization_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "organization_invitations_organizationId_idx" ON "organization_invitations"("organizationId");

-- CreateIndex
CREATE INDEX "organization_invitations_email_idx" ON "organization_invitations"("email");

-- AddForeignKey
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_ownerInvitationId_fkey" FOREIGN KEY ("ownerInvitationId") REFERENCES "organization_invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_deputyOwnerId_fkey" FOREIGN KEY ("deputyOwnerId") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_deputyInvitationId_fkey" FOREIGN KEY ("deputyInvitationId") REFERENCES "organization_invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

