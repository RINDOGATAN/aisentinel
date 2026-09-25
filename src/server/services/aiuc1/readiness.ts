// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Loads what the AIUC-1 rules read (src/config/aiuc1-evidence.ts): the
 * organisation's agents, and each agent's AIUC-1 mappings with their evidence.
 * Every query is scoped to the organisation. The rules themselves are pure and
 * live in the config module; nothing here decides a state.
 */

import type { PrismaClient } from "@prisma/client";
import {
  agentReadiness,
  isAgentSystem,
  type AgentReadiness,
  type RequirementInput,
} from "@/config/aiuc1-evidence";

export const AIUC1_FRAMEWORK_CODE = "AIUC_1" as const;

export interface AgentRow {
  id: string;
  name: string;
  technique: string;
  status: string;
  autonomy: string | null;
}

/** The organisation's systems that are agents, by name. */
export async function loadAgents(prisma: PrismaClient, organizationId: string): Promise<AgentRow[]> {
  const systems = await prisma.aISystem.findMany({
    where: {
      organizationId,
      OR: [
        { technique: "AGENTIC_AI" },
        { agentProfile: { is: { autonomy: { in: ["ACTS_WITH_APPROVAL", "ACTS_AUTONOMOUSLY"] } } } },
      ],
    },
    select: {
      id: true,
      name: true,
      technique: true,
      status: true,
      agentProfile: { select: { autonomy: true } },
    },
    orderBy: { name: "asc" },
  });
  return systems
    .map((s) => ({
      id: s.id,
      name: s.name,
      technique: s.technique,
      status: s.status,
      autonomy: s.agentProfile?.autonomy ?? null,
    }))
    .filter(isAgentSystem);
}

type Rows = Map<string, Omit<RequirementInput, "code">>;

/** Each agent's AIUC-1 mappings and their evidence, keyed by system then requirement code. */
export async function loadAgentRows(
  prisma: PrismaClient,
  organizationId: string,
  systemIds: string[],
): Promise<Map<string, Rows>> {
  const out = new Map<string, Rows>(systemIds.map((id) => [id, new Map()]));
  if (systemIds.length === 0) return out;
  const mappings = await prisma.complianceMapping.findMany({
    where: {
      organizationId,
      aiSystemId: { in: systemIds },
      requirement: { framework: { code: AIUC1_FRAMEWORK_CODE } },
    },
    select: {
      aiSystemId: true,
      status: true,
      notes: true,
      requirement: { select: { code: true } },
      evidenceItems: {
        where: { organizationId },
        select: {
          id: true,
          type: true,
          title: true,
          url: true,
          description: true,
          addedBy: true,
          addedAt: true,
        },
        orderBy: { addedAt: "asc" },
      },
    },
  });
  for (const m of mappings) {
    out.get(m.aiSystemId)?.set(m.requirement.code, {
      mappingStatus: m.status,
      mappingNotes: m.notes,
      evidence: m.evidenceItems,
    });
  }
  return out;
}

/** Whether this instance holds the AIUC-1 requirements (seeded by db:seed-frameworks). */
export async function aiuc1Seeded(prisma: PrismaClient): Promise<boolean> {
  const count = await prisma.complianceRequirement.count({
    where: { framework: { code: AIUC1_FRAMEWORK_CODE }, parentId: { not: null } },
  });
  return count > 0;
}

export interface AgentWithReadiness extends AgentRow {
  readiness: AgentReadiness;
}

export async function loadAgentsWithReadiness(
  prisma: PrismaClient,
  organizationId: string,
  now: Date = new Date(),
): Promise<AgentWithReadiness[]> {
  const agents = await loadAgents(prisma, organizationId);
  const rows = await loadAgentRows(
    prisma,
    organizationId,
    agents.map((a) => a.id),
  );
  return agents.map((a) => ({ ...a, readiness: agentReadiness(rows.get(a.id) ?? new Map(), now) }));
}

/** What the program path reads: counts only. */
export async function loadAgentTestingCounts(
  prisma: PrismaClient,
  organizationId: string,
): Promise<{ agents: number; agentsReadyForAudit: number; agentsStartedTesting: number }> {
  const agents = await loadAgentsWithReadiness(prisma, organizationId);
  return {
    agents: agents.length,
    agentsReadyForAudit: agents.filter((a) => a.readiness.overall.readyForAudit).length,
    agentsStartedTesting: agents.filter((a) => a.readiness.started).length,
  };
}
