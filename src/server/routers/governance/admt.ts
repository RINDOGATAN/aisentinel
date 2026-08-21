// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * California ADMT router: per-system determination profile (§ 7001(e)), scope
 * resolution, and creation of the compliance mappings the resolved scope
 * selects. The rules layer (src/config/admt-rules.ts) owns every applicability
 * decision — this router only orchestrates and persists.
 *
 * Two invariants worth stating out loud:
 *
 *   * `syncMappings` creates NOTHING unless the resolver returns a positive
 *     scope state with tags. An undeclared jurisdiction, an unanswered business
 *     screen or a missing profile all yield zero rows rather than a guess.
 *
 *   * It never deletes. A system that leaves scope keeps the rows already
 *     assessed against it — those are evidence of what was concluded and when.
 *     The resolver reports the new state instead, and the UI banners the rows
 *     as historical.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  organizationProcedure,
  orgWriteProcedure,
} from "../../trpc";
import {
  RISK_ASSESSMENT_TRIGGERS,
  SIGNIFICANT_DECISION_DOMAINS,
  resolveAdmtOrgScope,
  resolveAdmtScope,
  type AdmtOrgFacts,
  type AdmtProngStatusValue,
  type AdmtSystemFacts,
  type CoveredBusinessAnswer,
  type RevenueBand,
} from "@/config/admt-rules";
import { computeAdmtDeadlines } from "@/config/admt-deadlines";
import type { JurisdictionId } from "@/config/jurisdictions";
import { buildScopeFilter } from "@/lib/applicability-scope";

// Every enum input is a z.enum over the shared vocabulary rather than
// z.nativeEnum over the generated client: a stale client would otherwise make
// the enum undefined at module load and take the whole router down.
const DETERMINATION = z.enum([
  "NOT_ASSESSED",
  "NOT_ADMT",
  "ADMT",
  "ADMT_EXCLUDED_7001_E_3",
]);
const PRONG = z.enum(["NOT_ASSESSED", "SATISFIED", "NOT_SATISFIED"]);
const SOLE_FACTOR = z.enum([
  "NOT_ASSESSED",
  "SOLE_FACTOR",
  "ONE_OF_SEVERAL",
  "NOT_USED",
]);
const OPT_OUT_BASIS = z.enum([
  "NOT_ASSESSED",
  "NONE_OPT_OUT_OFFERED",
  "HUMAN_APPEAL_7221_B_1",
  "ADMISSION_ACCEPTANCE_HIRING_7221_B_2",
  "ALLOCATION_COMPENSATION_7221_B_3",
]);

/** Screening answers live in Organization.settings, not in a queried column. */
interface AdmtOrgSettings {
  coveredBusiness?: CoveredBusinessAnswer;
  revenueBand?: RevenueBand;
}

function readOrgFacts(org: {
  operatingJurisdictions: string[];
  settings: unknown;
}): AdmtOrgFacts {
  const settings = org.settings as { admt?: AdmtOrgSettings } | null;
  return {
    operatingJurisdictions: org.operatingJurisdictions as JurisdictionId[],
    coveredBusiness: settings?.admt?.coveredBusiness ?? "NOT_ASSESSED",
    revenueBand: settings?.admt?.revenueBand ?? "NOT_ASSESSED",
  };
}

interface ProfileRow {
  determination: string;
  prongInterpretOutput: string;
  prongReviewsOutputAndOtherInfo: string;
  prongAuthorityToChange: string;
  significantDecisionDomains: string[];
  riskAssessmentTriggers: string[];
  soleFactor: string;
  optOutBasis: string;
  processingInitiatedAt: Date | null;
}

/**
 * Build the resolver's system facts.
 *
 * A missing profile row becomes `determination: null`, which the resolver reads
 * as PROFILE_NOT_ASSESSED — deliberately distinct from a profile that exists but
 * whose determination is still NOT_ASSESSED.
 */
function readSystemFacts(
  jurisdictionOverride: string[],
  profile: ProfileRow | null,
): AdmtSystemFacts {
  if (!profile) {
    return {
      jurisdictionOverride: jurisdictionOverride as JurisdictionId[],
      determination: null,
      prongs: null,
      significantDecisionDomains: [],
      riskAssessmentTriggers: [],
      soleFactor: "NOT_ASSESSED",
      optOutBasis: "NOT_ASSESSED",
    };
  }
  return {
    jurisdictionOverride: jurisdictionOverride as JurisdictionId[],
    determination: profile.determination as AdmtSystemFacts["determination"],
    prongs: {
      interpretOutput: profile.prongInterpretOutput as AdmtProngStatusValue,
      reviewsOutputAndOtherInfo:
        profile.prongReviewsOutputAndOtherInfo as AdmtProngStatusValue,
      authorityToChange: profile.prongAuthorityToChange as AdmtProngStatusValue,
    },
    significantDecisionDomains: profile.significantDecisionDomains,
    riskAssessmentTriggers: profile.riskAssessmentTriggers,
    soleFactor: profile.soleFactor as AdmtSystemFacts["soleFactor"],
    optOutBasis: profile.optOutBasis as AdmtSystemFacts["optOutBasis"],
  };
}

const PROFILE_SELECT = {
  id: true,
  aiSystemId: true,
  determination: true,
  prongInterpretOutput: true,
  prongReviewsOutputAndOtherInfo: true,
  prongAuthorityToChange: true,
  significantDecisionDomains: true,
  riskAssessmentTriggers: true,
  soleFactor: true,
  nonQualifyingHumanRole: true,
  optOutBasis: true,
  designatedReviewer: true,
  appealRouteDescription: true,
  worksForPurposeEvidence: true,
  nonDiscriminationEvidence: true,
  processingInitiatedAt: true,
  notes: true,
  reviewedBy: true,
  reviewedAt: true,
  provenance: true,
  confirmedBy: true,
  confirmedAt: true,
} as const;

export const admtRouter = createTRPCRouter({
  /** Scope for one system, with its profile and statutory clocks. */
  getScope: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true, name: true, jurisdictionOverride: true },
      });
      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }

      const [org, profile] = await Promise.all([
        ctx.prisma.organization.findUnique({
          where: { id: ctx.organization.id },
          select: { operatingJurisdictions: true, settings: true },
        }),
        ctx.prisma.admtProfile.findFirst({
          where: {
            aiSystemId: input.aiSystemId,
            organizationId: ctx.organization.id,
          },
          select: PROFILE_SELECT,
        }),
      ]);

      const orgFacts = readOrgFacts({
        operatingJurisdictions: org?.operatingJurisdictions ?? [],
        settings: org?.settings ?? null,
      });
      const scope = resolveAdmtScope(
        orgFacts,
        readSystemFacts(system.jurisdictionOverride, profile),
      );

      return {
        system: { id: system.id, name: system.name },
        profile,
        scope,
        deadlines: computeAdmtDeadlines({
          processingInitiatedAt: profile?.processingInitiatedAt ?? null,
          triggers: profile?.riskAssessmentTriggers ?? [],
          articleElevenApplies: scope.state === "ARTICLE_10_AND_11",
          revenueBand: orgFacts.revenueBand,
        }),
      };
    }),

  /** Organization-level scope: the duties that attach to the business itself. */
  getOrgScope: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [org, systems] = await Promise.all([
        ctx.prisma.organization.findUnique({
          where: { id: ctx.organization.id },
          select: { operatingJurisdictions: true, settings: true },
        }),
        ctx.prisma.aISystem.findMany({
          where: {
            organizationId: ctx.organization.id,
            status: { not: "RETIRED" },
          },
          select: {
            id: true,
            name: true,
            jurisdictionOverride: true,
            admtProfile: { select: PROFILE_SELECT },
          },
        }),
      ]);

      const orgFacts = readOrgFacts({
        operatingJurisdictions: org?.operatingJurisdictions ?? [],
        settings: org?.settings ?? null,
      });

      const perSystem = systems.map((s) => ({
        id: s.id,
        name: s.name,
        scope: resolveAdmtScope(
          orgFacts,
          readSystemFacts(s.jurisdictionOverride, s.admtProfile),
        ),
      }));

      return {
        orgScope: resolveAdmtOrgScope(
          orgFacts,
          systems.map((s) =>
            readSystemFacts(s.jurisdictionOverride, s.admtProfile),
          ),
        ),
        systems: perSystem,
        coveredBusiness: orgFacts.coveredBusiness,
        revenueBand: orgFacts.revenueBand,
      };
    }),

  upsertProfile: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        determination: DETERMINATION,
        prongInterpretOutput: PRONG,
        prongReviewsOutputAndOtherInfo: PRONG,
        prongAuthorityToChange: PRONG,
        significantDecisionDomains: z
          .array(z.enum(SIGNIFICANT_DECISION_DOMAINS))
          .default([]),
        riskAssessmentTriggers: z
          .array(z.enum(RISK_ASSESSMENT_TRIGGERS))
          .default([]),
        soleFactor: SOLE_FACTOR,
        nonQualifyingHumanRole: z.string().max(2000).optional(),
        optOutBasis: OPT_OUT_BASIS,
        designatedReviewer: z.string().max(500).optional(),
        appealRouteDescription: z.string().max(5000).optional(),
        worksForPurposeEvidence: z.string().max(5000).optional(),
        nonDiscriminationEvidence: z.string().max(5000).optional(),
        processingInitiatedAt: z.date().nullable().optional(),
        notes: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }

      const now = new Date();
      const data = {
        determination: input.determination,
        prongInterpretOutput: input.prongInterpretOutput,
        prongReviewsOutputAndOtherInfo: input.prongReviewsOutputAndOtherInfo,
        prongAuthorityToChange: input.prongAuthorityToChange,
        significantDecisionDomains: input.significantDecisionDomains,
        riskAssessmentTriggers: input.riskAssessmentTriggers,
        soleFactor: input.soleFactor,
        nonQualifyingHumanRole: input.nonQualifyingHumanRole ?? null,
        optOutBasis: input.optOutBasis,
        designatedReviewer: input.designatedReviewer ?? null,
        appealRouteDescription: input.appealRouteDescription ?? null,
        worksForPurposeEvidence: input.worksForPurposeEvidence ?? null,
        nonDiscriminationEvidence: input.nonDiscriminationEvidence ?? null,
        processingInitiatedAt: input.processingInitiatedAt ?? null,
        notes: input.notes ?? null,
        reviewedBy: ctx.session.user.id,
        reviewedAt: now,
        // A human is answering the § 7001(e) questions directly, so this row is
        // user-entered and confirmed in the same act.
        provenance: "USER_ENTERED" as const,
        confirmedBy: ctx.session.user.id,
        confirmedAt: now,
      };

      const profile = await ctx.prisma.admtProfile.upsert({
        where: { aiSystemId: input.aiSystemId },
        create: {
          aiSystemId: input.aiSystemId,
          organizationId: ctx.organization.id,
          ...data,
        },
        update: data,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AdmtProfile",
          entityId: profile.id,
          action: "UPDATE",
          changes: {
            determination: input.determination,
            significantDecisionDomains: input.significantDecisionDomains,
            riskAssessmentTriggers: input.riskAssessmentTriggers,
            optOutBasis: input.optOutBasis,
          },
        },
      });

      return profile;
    }),

  /**
   * Create the compliance mappings the resolved scope selects.
   *
   * Idempotent (`skipDuplicates`), additive only, and a no-op whenever the
   * resolver declines to produce tags.
   */
  syncMappings: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true, jurisdictionOverride: true },
      });
      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }

      const [org, profile] = await Promise.all([
        ctx.prisma.organization.findUnique({
          where: { id: ctx.organization.id },
          select: { operatingJurisdictions: true, settings: true },
        }),
        ctx.prisma.admtProfile.findFirst({
          where: {
            aiSystemId: input.aiSystemId,
            organizationId: ctx.organization.id,
          },
          select: PROFILE_SELECT,
        }),
      ]);

      const scope = resolveAdmtScope(
        readOrgFacts({
          operatingJurisdictions: org?.operatingJurisdictions ?? [],
          settings: org?.settings ?? null,
        }),
        readSystemFacts(system.jurisdictionOverride, profile),
      );

      // The gate: no tags, no rows. An undeclared jurisdiction or an unanswered
      // determination must not quietly populate ~50 requirements.
      if (scope.tags.length === 0) {
        return { created: 0, state: scope.state };
      }

      // Scope resolution runs in memory through the shared predicate rather
      // than as a `hasSome` on the tag column. `hasSome` would match any row
      // sharing ANY tag, and every California row carries `jurisdiction:US_CA`
      // — which every positive scope also emits — so it selected all 92 rows
      // for everyone, writing the 59 Article 11 duties into the record of
      // systems expressly determined NOT to be ADMT. Jurisdiction tags decide
      // whether the framework reaches you; they never pick out rows.
      const candidates = await ctx.prisma.complianceRequirement.findMany({
        where: { framework: { code: "CA_CCPA_ADMT" } },
        select: { id: true, applicabilityTags: true },
      });

      const inScope = buildScopeFilter(scope.tags);
      const requirements = candidates.filter(inScope);
      if (requirements.length === 0) {
        return { created: 0, state: scope.state };
      }

      const { count } = await ctx.prisma.complianceMapping.createMany({
        data: requirements.map((r) => ({
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId,
          requirementId: r.id,
          status: "NOT_ASSESSED" as const,
          // Derived by a deterministic rule module, not typed by a person.
          provenance: "AUTO_RULE" as const,
          sourceRef: "admt-rules",
        })),
        skipDuplicates: true,
      });

      if (count > 0) {
        await ctx.prisma.auditLog.create({
          data: {
            organizationId: ctx.organization.id,
            userId: ctx.session.user.id,
            entityType: "ComplianceMapping",
            entityId: input.aiSystemId,
            action: "CREATE",
            changes: {
              source: "admt-rules",
              state: scope.state,
              tags: scope.tags,
              created: count,
            },
          },
        });
      }

      return { created: count, state: scope.state };
    }),
});
