// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Attach the in-scope regime requirements to a system.
 *
 * Shared by the regimes router and the quickstart wizard, so a system set up
 * through the wizard carries the same cross-border coverage as one wired up by
 * hand. Without this the wizard produced EU AI Act, NIST and ISO mappings only:
 * those three seed with a risk tier and are picked up by the wizard's tier
 * query, while every regime pack seeds with an empty tier by design and is
 * structurally invisible to it.
 *
 * The gate is the one the whole product relies on: no tags, no rows. A system
 * whose organisation has not declared its jurisdictions, or whose screening
 * questions are unanswered, gets nothing rather than a speculative record.
 */

import { buildScopeFilter } from "@/lib/applicability-scope";
import { loadSystemScope, type ScopePrisma } from "./system-scope";

export interface AttachResult {
  framework: string;
  state: string;
  created: number;
}

interface AttachPrisma extends ScopePrisma {
  complianceRequirement: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany: (args: any) => Promise<any>;
  };
  complianceMapping: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createMany: (args: any) => Promise<{ count: number }>;
  };
}

/**
 * @param frameworkCode limit to one regime; omitted means all four.
 */
export async function attachRegimeMappings(
  prisma: AttachPrisma,
  organizationId: string,
  aiSystemId: string,
  frameworkCode?: string,
): Promise<{ created: number; results: AttachResult[] }> {
  const scope = await loadSystemScope(prisma, organizationId, aiSystemId);
  const results: AttachResult[] = [];

  for (const regime of scope.regimes) {
    if (frameworkCode && regime.framework !== frameworkCode) continue;
    if (regime.tags.length === 0) {
      results.push({ framework: regime.framework, state: regime.state, created: 0 });
      continue;
    }
    // Scope resolution runs in memory through the shared predicate rather than
    // as a `hasSome` on the tag column: every row of a regime carries its
    // jurisdiction tag, which every positive scope also emits, so `hasSome`
    // would select the whole pack regardless of scope.
    const candidates = (await prisma.complianceRequirement.findMany({
      where: { framework: { code: regime.framework } },
      select: { id: true, applicabilityTags: true },
    })) as { id: string; applicabilityTags: string[] }[];

    const requirements = candidates.filter(buildScopeFilter(regime.tags));
    if (requirements.length === 0) {
      results.push({ framework: regime.framework, state: regime.state, created: 0 });
      continue;
    }
    const { count } = await prisma.complianceMapping.createMany({
      data: requirements.map((r) => ({
        organizationId,
        aiSystemId,
        requirementId: r.id,
        status: "NOT_ASSESSED" as const,
        // Derived by a deterministic rule module, not typed by a person.
        provenance: "AUTO_RULE" as const,
        sourceRef: "regime-rules",
      })),
      skipDuplicates: true,
    });
    results.push({ framework: regime.framework, state: regime.state, created: count });
  }

  return { created: results.reduce((total, r) => total + r.created, 0), results };
}
