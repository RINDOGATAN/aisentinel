// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Regime frameworks router: GDPR, Colorado SB 26-189, Texas TRAIGA and the
 * Washington domain instruments.
 *
 * Mirrors the California ADMT router: the organisation answers a few screening
 * facts, each system answers a few more, a pure rules module resolves scope,
 * and `syncMappings` attaches only the in-scope requirements as NOT_ASSESSED
 * compliance mappings. The gate is the same one California uses: no tags, no
 * rows — an undeclared jurisdiction or an unanswered screening question must
 * never populate a system's record with duties nobody has established apply.
 *
 * Organisation facts live under `Organization.settings.regimes`; system facts
 * under `AISystem.metadata.regimeFacts`. Both default to NOT_ASSESSED so an
 * unanswered question reads as undetermined, never as "does not apply".
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { attachRegimeMappings } from "@/server/services/scope/attach-regimes";
import type { JurisdictionId } from "@/config/jurisdictions";
import {
  DEFAULT_ORG_FACTS,
  DEFAULT_SYSTEM_SCREENING,
  REGIME_CODES,
  REGIME_PACKS,
  isRegimeCode,
  resolveAllRegimeScopes,
  type RegimeOrgFacts,
  type RegimeSystemFacts,
  type ScreeningAnswer,
} from "@/config/regimes";

/** Setting screening facts is a legal determination, not data entry. */
const SCREENING_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"];

const answer = z.enum(["YES", "NO", "NOT_ASSESSED"]);

const orgFactsInput = z.object({
  isPublicAgency: answer.optional(),
  isHealthCarrier: answer.optional(),
  isHealthcareProvider: answer.optional(),
  isCoveredGenAiProvider: answer.optional(),
  processesConsumerHealthData: answer.optional(),
});

const systemFactsInput = z.object({
  solelyAutomatedLegalEffect: answer.optional(),
  processesSpecialCategoryData: answer.optional(),
  materiallyInfluencesConsequentialDecision: answer.optional(),
  isCompanionChatbot: answer.optional(),
  usedInPriorAuthorization: answer.optional(),
  interactsWithConsumers: answer.optional(),
  handsOffToAutonomousAgent: answer.optional(),
});

type OrgRegimeSettings = Partial<Omit<RegimeOrgFacts, "operatingJurisdictions">>;
type SystemRegimeFacts = Partial<
  Pick<
    RegimeSystemFacts,
    | "solelyAutomatedLegalEffect"
    | "processesSpecialCategoryData"
    | "materiallyInfluencesConsequentialDecision"
    | "isCompanionChatbot"
    | "usedInPriorAuthorization"
    | "interactsWithConsumers"
    | "handsOffToAutonomousAgent"
  >
>;

function asAnswer(v: unknown): ScreeningAnswer {
  return v === "YES" || v === "NO" ? v : "NOT_ASSESSED";
}

function readOrgFacts(
  org: { operatingJurisdictions: string[]; settings: unknown } | null,
): RegimeOrgFacts {
  const settings = (org?.settings ?? null) as { regimes?: OrgRegimeSettings } | null;
  const r = settings?.regimes ?? {};
  return {
    operatingJurisdictions: (org?.operatingJurisdictions ?? []) as JurisdictionId[],
    isPublicAgency: asAnswer(r.isPublicAgency),
    isHealthCarrier: asAnswer(r.isHealthCarrier),
    isHealthcareProvider: asAnswer(r.isHealthcareProvider),
    isCoveredGenAiProvider: asAnswer(r.isCoveredGenAiProvider),
    processesConsumerHealthData: asAnswer(r.processesConsumerHealthData),
  };
}

interface SystemRow {
  technique: string;
  role: string;
  processesPersonalData: boolean;
  jurisdictionOverride: string[];
  metadata: unknown;
  riskClassification: { riskLevel: string; annexIIICategory: string | null } | null;
  admtProfile: {
    determination: string;
    significantDecisionDomains: string[];
    soleFactor: string;
  } | null;
}

function readSystemFacts(system: SystemRow): RegimeSystemFacts {
  const meta = (system.metadata ?? null) as { regimeFacts?: SystemRegimeFacts } | null;
  const f = meta?.regimeFacts ?? {};
  return {
    jurisdictionOverride: system.jurisdictionOverride as JurisdictionId[],
    technique: system.technique,
    role: system.role,
    processesPersonalData: system.processesPersonalData,
    riskLevel: system.riskClassification?.riskLevel ?? null,
    annexIiiCategory: system.riskClassification?.annexIIICategory ?? null,
    admtDetermination: system.admtProfile?.determination ?? null,
    significantDecisionDomains: system.admtProfile?.significantDecisionDomains ?? [],
    admtSoleFactor: system.admtProfile?.soleFactor ?? null,
    solelyAutomatedLegalEffect: asAnswer(f.solelyAutomatedLegalEffect),
    processesSpecialCategoryData: asAnswer(f.processesSpecialCategoryData),
    materiallyInfluencesConsequentialDecision: asAnswer(f.materiallyInfluencesConsequentialDecision),
    isCompanionChatbot: asAnswer(f.isCompanionChatbot),
    usedInPriorAuthorization: asAnswer(f.usedInPriorAuthorization),
    interactsWithConsumers: asAnswer(f.interactsWithConsumers),
    handsOffToAutonomousAgent: asAnswer(f.handsOffToAutonomousAgent),
  };
}

const SYSTEM_SELECT = {
  id: true,
  name: true,
  technique: true,
  role: true,
  processesPersonalData: true,
  jurisdictionOverride: true,
  metadata: true,
  riskClassification: { select: { riskLevel: true, annexIIICategory: true } },
  admtProfile: {
    select: { determination: true, significantDecisionDomains: true, soleFactor: true },
  },
} as const;

export const regimesRouter = createTRPCRouter({
  /** Static pack metadata for the UI: names, abbreviations, review markers. */
  listPacks: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(() =>
      REGIME_PACKS.map((p) => ({
        code: p.framework.code,
        name: p.framework.name,
        abbreviation: p.framework.abbreviation,
        version: p.framework.version,
        contentVersion: p.framework.contentVersion,
        lawReviewedAsOf: p.framework.lawReviewedAsOf,
        reviewMarker: p.framework.reviewMarker,
      })),
    ),

  /** Scope of every regime for one system, with the facts that produced it. */
  getScope: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: SYSTEM_SELECT,
      });
      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }
      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.organization.id },
        select: { operatingJurisdictions: true, settings: true },
      });
      const orgFacts = readOrgFacts(
        org
          ? {
              operatingJurisdictions: org.operatingJurisdictions as unknown as string[],
              settings: org.settings,
            }
          : null,
      );
      const systemFacts = readSystemFacts(system as unknown as SystemRow);
      const scopes = resolveAllRegimeScopes(orgFacts, systemFacts);

      const attached = await ctx.prisma.complianceMapping.groupBy({
        by: ["requirementId"],
        where: {
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId,
          requirement: { framework: { code: { in: [...REGIME_CODES] } } },
        },
      });

      return {
        system: { id: system.id, name: system.name },
        orgFacts: {
          isPublicAgency: orgFacts.isPublicAgency,
          isHealthCarrier: orgFacts.isHealthCarrier,
          isHealthcareProvider: orgFacts.isHealthcareProvider,
          isCoveredGenAiProvider: orgFacts.isCoveredGenAiProvider,
          processesConsumerHealthData: orgFacts.processesConsumerHealthData,
        },
        systemFacts: {
          solelyAutomatedLegalEffect: systemFacts.solelyAutomatedLegalEffect,
          processesSpecialCategoryData: systemFacts.processesSpecialCategoryData,
          materiallyInfluencesConsequentialDecision:
            systemFacts.materiallyInfluencesConsequentialDecision,
          isCompanionChatbot: systemFacts.isCompanionChatbot,
          usedInPriorAuthorization: systemFacts.usedInPriorAuthorization,
          interactsWithConsumers: systemFacts.interactsWithConsumers,
          handsOffToAutonomousAgent: systemFacts.handsOffToAutonomousAgent,
        },
        jurisdictionsDeclared: orgFacts.operatingJurisdictions.length > 0,
        scopes,
        attachedRequirementCount: attached.length,
      };
    }),

  /** Organisation-wide screening facts. */
  setOrgFacts: orgWriteProcedure
    .input(z.object({ organizationId: z.string() }).merge(orgFactsInput))
    .mutation(async ({ ctx, input }) => {
      if (!SCREENING_ROLES.includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners, admins and AI officers can set organisation screening facts",
        });
      }
      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.organization.id },
        select: { settings: true },
      });
      const settings = (org?.settings ?? {}) as Record<string, unknown>;
      const current = (settings.regimes ?? {}) as OrgRegimeSettings;
      const { organizationId: _orgId, ...facts } = input;
      const next: OrgRegimeSettings = { ...DEFAULT_ORG_FACTS, ...current };
      for (const [key, value] of Object.entries(facts)) {
        if (value !== undefined) {
          (next as Record<string, ScreeningAnswer>)[key] = value as ScreeningAnswer;
        }
      }
      await ctx.prisma.organization.update({
        where: { id: ctx.organization.id },
        data: { settings: { ...settings, regimes: next } },
      });
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          action: "UPDATE",
          entityType: "Organization",
          entityId: ctx.organization.id,
          changes: { regimeOrgFacts: facts },
        },
      });
      return next;
    }),

  /** Per-system screening facts. */
  setSystemFacts: orgWriteProcedure
    .input(
      z.object({ organizationId: z.string(), aiSystemId: z.string() }).merge(systemFactsInput),
    )
    .mutation(async ({ ctx, input }) => {
      if (!SCREENING_ROLES.includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners, admins and AI officers can set system screening facts",
        });
      }
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true, metadata: true },
      });
      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }
      const metadata = (system.metadata ?? {}) as Record<string, unknown>;
      const current = (metadata.regimeFacts ?? {}) as SystemRegimeFacts;
      const { organizationId: _orgId, aiSystemId: _sysId, ...facts } = input;
      const next: SystemRegimeFacts = { ...DEFAULT_SYSTEM_SCREENING, ...current };
      for (const [key, value] of Object.entries(facts)) {
        if (value !== undefined) {
          (next as Record<string, ScreeningAnswer>)[key] = value as ScreeningAnswer;
        }
      }
      await ctx.prisma.aISystem.update({
        where: { id: system.id },
        data: { metadata: { ...metadata, regimeFacts: next } },
      });
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          action: "UPDATE",
          entityType: "AISystem",
          entityId: system.id,
          changes: { regimeSystemFacts: facts },
        },
      });
      return next;
    }),

  /**
   * Attach the in-scope requirements of one regime (or all four) to a system
   * as NOT_ASSESSED mappings. Scope resolution runs in memory through the
   * shared predicate, for the same reason California does: a `hasSome` on the
   * tag column would match any row sharing the jurisdiction tag and attach
   * every requirement of the regime regardless of scope.
   */
  syncMappings: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        frameworkCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.frameworkCode !== undefined && !isRegimeCode(input.frameworkCode)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not a regime framework" });
      }
      const { created, results } = await attachRegimeMappings(
        ctx.prisma,
        ctx.organization.id,
        input.aiSystemId,
        input.frameworkCode,
      );
      if (created > 0) {
        await ctx.prisma.auditLog.create({
          data: {
            organizationId: ctx.organization.id,
            userId: ctx.session.user.id,
            action: "CREATE",
            entityType: "ComplianceMapping",
            entityId: input.aiSystemId,
            changes: { source: "regime-rules", results: results as unknown as object[] },
          },
        });
      }
      return { created, results };
    }),
});
