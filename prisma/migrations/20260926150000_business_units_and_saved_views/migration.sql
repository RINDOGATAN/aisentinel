-- Business units (departments) + saved list views.
--
-- The consultant asked to separate the registry by department ("Can I separate
-- by dept. because I'm the IT manager or in-house counsel?") and to keep named
-- filtered views. This adds:
--   * business_units          — a department per organization, one level of
--                               nesting, with an optional owning member.
--   * business_unit_members   — limits a member to one or more departments;
--                               no rows means the whole organization, as today.
--   * saved_views             — a named filter set kept per user per org.
--   * ai_systems.businessUnitId — the department that owns a system (nullable).
--
-- ADDITIVE ONLY. New tables, one new nullable column, new indexes and foreign
-- keys. Nothing is dropped, renamed or retyped. Every pre-existing system keeps
-- businessUnitId NULL (belongs to no department), and an organization that never
-- creates a department behaves exactly as before.

-- AlterTable
ALTER TABLE "ai_systems" ADD COLUMN     "businessUnitId" TEXT;

-- CreateTable
CREATE TABLE "business_units" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_unit_members" (
    "id" TEXT NOT NULL,
    "businessUnitId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_unit_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_views" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_units_organizationId_idx" ON "business_units"("organizationId");

-- CreateIndex
CREATE INDEX "business_units_parentId_idx" ON "business_units"("parentId");

-- CreateIndex
CREATE INDEX "business_unit_members_memberId_idx" ON "business_unit_members"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "business_unit_members_businessUnitId_memberId_key" ON "business_unit_members"("businessUnitId", "memberId");

-- CreateIndex
CREATE INDEX "saved_views_organizationId_userId_idx" ON "saved_views"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "ai_systems_businessUnitId_idx" ON "ai_systems"("businessUnitId");

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_unit_members" ADD CONSTRAINT "business_unit_members_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_unit_members" ADD CONSTRAINT "business_unit_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "organization_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_systems" ADD CONSTRAINT "ai_systems_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
