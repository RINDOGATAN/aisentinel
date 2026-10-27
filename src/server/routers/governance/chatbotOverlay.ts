// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The customer-facing chatbot overlay (src/config/chatbot-overlay.ts).
 *
 * Four questions per system switch on eight controls. The answers live with
 * the other screening facts under `AISystem.metadata.regimeFacts` (the first
 * two are the existing `interactsWithConsumers` and `isCompanionChatbot`
 * facts), so the regime screening and the overlay never disagree. Saving them
 * brings the system's requirement rows in line through the shared sync.
 *
 * Everything here is behind CHATBOT_OVERLAY_ENABLED: while it is off the
 * queries report `enabled: false` and the mutations refuse.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure, publicProcedure } from "../../trpc";
import { syncRequirementsSafely } from "@/server/services/scope/sync-requirements";
import { chatbotOverlayEnabled } from "@/server/services/chatbot-overlay/switch";
import { DEFAULT_SYSTEM_SCREENING } from "@/config/regimes";
import {
  CHATBOT_OVERLAY_FRAMEWORK_CODE,
  CHATBOT_OVERLAY_LAW_REVIEWED_AS_OF,
  CHATBOT_OVERLAY_REVIEW_MARKER,
  CHATBOT_OVERLAY_VERSION,
  CHATBOT_REQUIREMENTS,
  COUNSEL_ITEM_IDS,
  chatbotControlViews,
  chatbotOverlaySignedOff,
  chatbotOverlayState,
  chatbotWatchList,
  isoToday,
  readChatbotFacts,
} from "@/config/chatbot-overlay";

/** Setting screening facts is a legal determination, as in the regimes router. */
const SCREENING_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"];

const answer = z.enum(["YES", "NO", "NOT_ASSESSED"]);

function assertEnabled() {
  if (!chatbotOverlayEnabled()) {
    throw new TRPCError({ code: "FORBIDDEN", message: "The chatbot rules are not switched on" });
  }
}

interface CounselRecord {
  items: string[];
  seenAt: string | null;
  seenBy: string | null;
}

function readCounsel(metadata: unknown): CounselRecord {
  const meta = (metadata ?? {}) as { chatbotOverlay?: { counsel?: Partial<CounselRecord> } };
  const c = meta.chatbotOverlay?.counsel ?? {};
  return {
    items: Array.isArray(c.items) ? c.items.filter((i): i is string => COUNSEL_ITEM_IDS.includes(i)) : [],
    seenAt: typeof c.seenAt === "string" ? c.seenAt : null,
    seenBy: typeof c.seenBy === "string" ? c.seenBy : null,
  };
}

export const chatbotOverlayRouter = createTRPCRouter({
  /** Whether the overlay is switched on. A boolean only, so public. */
  status: publicProcedure.query(() => ({ enabled: chatbotOverlayEnabled() })),

  /** The four answers, the state they produce and the eight controls for the declared places. */
  getForSystem: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!chatbotOverlayEnabled()) return { enabled: false as const };
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true, metadata: true, jurisdictionOverride: true },
      });
      if (!system) throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      const org = await ctx.prisma.organization.findFirst({
        where: { id: ctx.organization.id },
        select: { operatingJurisdictions: true },
      });
      const orgPlaces = (org?.operatingJurisdictions ?? []) as string[];
      const override = (system.jurisdictionOverride ?? []) as string[];
      // A per-system override narrows the organisation's places, never widens them.
      const narrowed = override.length > 0 ? orgPlaces.filter((p) => override.includes(p)) : orgPlaces;
      const places = override.length > 0 && narrowed.length === 0 ? [] : narrowed;

      const meta = (system.metadata ?? null) as { regimeFacts?: unknown } | null;
      const facts = readChatbotFacts(meta?.regimeFacts);
      const state = chatbotOverlayState(facts);
      const today = isoToday();

      const mappings = await ctx.prisma.complianceMapping.findMany({
        where: {
          organizationId: ctx.organization.id,
          aiSystemId: system.id,
          requirement: { framework: { code: CHATBOT_OVERLAY_FRAMEWORK_CODE } },
        },
        select: { requirementId: true, status: true, _count: { select: { evidenceItems: true } } },
      });
      const byRequirement = new Map(mappings.map((m) => [m.requirementId, m]));

      const views = chatbotControlViews(places, today);
      return {
        enabled: true as const,
        facts,
        state,
        places,
        placesDeclared: orgPlaces.length > 0,
        today,
        controls: views.map((v) => {
          const row = CHATBOT_REQUIREMENTS.find((r) => r.id === `chatbot-${v.control.id}`);
          const mapping = row ? byRequirement.get(row.id) : undefined;
          return {
            id: v.control.id,
            number: v.control.number,
            title: v.control.title,
            duty: v.control.duty,
            keeps: v.control.keeps,
            requirementId: row?.id ?? null,
            status: mapping?.status ?? null,
            evidenceCount: mapping?._count.evidenceItems ?? 0,
            inForce: v.inForce,
            upcoming: v.upcoming,
            laws: v.laws.map((l) => ({
              lawId: l.law.id,
              name: l.law.name,
              reaches: l.law.reaches,
              source: l.law.source,
              citation: l.entry.citation,
              appliesFrom: l.entry.appliesFrom,
              adds: l.entry.adds,
              timing: l.timing,
              places: l.places,
            })),
          };
        }),
        watchList: chatbotWatchList(places),
        counsel: readCounsel(system.metadata),
        version: CHATBOT_OVERLAY_VERSION,
        lawReviewedAsOf: CHATBOT_OVERLAY_LAW_REVIEWED_AS_OF,
        reviewMarker: CHATBOT_OVERLAY_REVIEW_MARKER,
        signedOff: chatbotOverlaySignedOff(),
      };
    }),

  /** Save any of the four answers. */
  setFacts: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        interactsWithConsumers: answer.optional(),
        isCompanionChatbot: answer.optional(),
        minorsMayUse: answer.optional(),
        handlesSensitiveTopics: answer.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertEnabled();
      if (!SCREENING_ROLES.includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners, admins and AI officers can answer these questions",
        });
      }
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true, metadata: true },
      });
      if (!system) throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      const metadata = (system.metadata ?? {}) as Record<string, unknown>;
      const current = (metadata.regimeFacts ?? {}) as Record<string, unknown>;
      const { organizationId: _orgId, aiSystemId: _sysId, ...facts } = input;
      const next: Record<string, unknown> = { ...DEFAULT_SYSTEM_SCREENING, ...current };
      for (const [key, value] of Object.entries(facts)) {
        if (value !== undefined) next[key] = value;
      }
      await ctx.prisma.aISystem.update({
        where: { id: system.id },
        data: { metadata: { ...metadata, regimeFacts: next } as Prisma.InputJsonValue },
      });
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          action: "UPDATE",
          entityType: "AISystem",
          entityId: system.id,
          changes: { chatbotOverlayFacts: facts } as Prisma.InputJsonValue,
        },
      });
      await syncRequirementsSafely(ctx.prisma, ctx.organization.id, {
        aiSystemId: system.id,
        userId: ctx.session.user.id,
        reason: "chatbot-overlay-facts",
      });
      return { facts: readChatbotFacts(next), state: chatbotOverlayState(readChatbotFacts(next)) };
    }),

  /**
   * Record which features the customer marked as needing review by counsel.
   * Saving is the record that the flags were seen.
   */
  setCounsel: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        items: z.array(z.enum(COUNSEL_ITEM_IDS)).max(COUNSEL_ITEM_IDS.length),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertEnabled();
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true, metadata: true },
      });
      if (!system) throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      const metadata = (system.metadata ?? {}) as Record<string, unknown>;
      const overlay = (metadata.chatbotOverlay ?? {}) as Record<string, unknown>;
      const items = COUNSEL_ITEM_IDS.filter((id) => input.items.includes(id));
      const counsel: CounselRecord = {
        items,
        seenAt: new Date().toISOString(),
        seenBy: ctx.session.user.id,
      };
      await ctx.prisma.aISystem.update({
        where: { id: system.id },
        data: {
          metadata: { ...metadata, chatbotOverlay: { ...overlay, counsel } } as unknown as Prisma.InputJsonValue,
        },
      });
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          action: "UPDATE",
          entityType: "AISystem",
          entityId: system.id,
          changes: { chatbotOverlayCounselFlags: items } as Prisma.InputJsonValue,
        },
      });
      return counsel;
    }),
});
