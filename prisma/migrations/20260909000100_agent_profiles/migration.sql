-- Agent governance: one satellite row per AI system recording how much it does
-- on its own, what it may reach, who is accountable, and who can stop it.
--
-- Every regime this product carries assumes a system that produces an output a
-- person then uses. An agent that acts on that output breaks that assumption,
-- and the agentic stress test already reasons about where. Until now the whole
-- agentic layer turned on a single yes-or-no screening answer, which cannot
-- answer "who can stop it" or "what can it call".
--
-- Additive only: one new enum and one new table. No existing table, column or
-- row is touched. Creating a new enum and using it in the same migration is
-- safe; only ALTER TYPE ... ADD VALUE on an existing enum has to stand alone.

-- CreateEnum
CREATE TYPE "AgentAutonomy" AS ENUM ('NOT_ASSESSED', 'NONE', 'SUGGESTS', 'ACTS_WITH_APPROVAL', 'ACTS_AUTONOMOUSLY');

-- CreateTable
CREATE TABLE "agent_profiles" (
    "id" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "autonomy" "AgentAutonomy" NOT NULL DEFAULT 'NOT_ASSESSED',
    "actionScope" TEXT,
    "downstreamAgents" TEXT,
    "tools" TEXT[],
    "humanSponsor" TEXT,
    "killSwitch" TEXT,
    "killSwitchTestedAt" TIMESTAMP(3),
    "reversalWindow" TEXT,
    "traceability" TEXT,
    "notes" TEXT,
    "reviewedBy" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provenance" "Provenance" NOT NULL DEFAULT 'USER_ENTERED',
    "sourceRef" TEXT,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_profiles_aiSystemId_key" ON "agent_profiles"("aiSystemId");

-- CreateIndex
CREATE INDEX "agent_profiles_organizationId_idx" ON "agent_profiles"("organizationId");

-- AddForeignKey
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
