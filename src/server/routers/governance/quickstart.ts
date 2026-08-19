// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { z } from "zod";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { VendorStatus } from "@prisma/client";
import {
  findAIMappingForCategory,
  type VendorAIMapping,
} from "../../../config/vendor-ai-mappings";
import {
  getTemplateById,
  AI_GOVERNANCE_TEMPLATES,
  type AIGovernanceTemplate,
} from "../../../config/ai-governance-templates";
import {
  LAWFIRM_POLICY_PACK,
  getLawFirmToolsById,
  getLawFirmCategory,
  getToolGovernance,
  resolveContentLocale,
} from "../../../config/lawfirm-ai-toolkit";
import { hasVendorCatalogAccess } from "../../services/licensing/entitlement";
import {
  QUICKSTART_COMPLIANCE_BASELINE,
  baselineRuleKey,
  TRANSPARENCY_PROFILE_NOTES,
} from "../../../config/quickstart-compliance-baseline";

// ============================================================
// HELPERS
// ============================================================

interface VendorPreviewItem {
  vendorName: string;
  vendorSlug: string;
  category: string;
  systemName: string;
  technique: string;
  riskLevel: string;
  riskRationale: string;
  requiresOversightGate: boolean;
  gateType?: string;
}

function buildVendorPreview(
  catalogVendor: {
    slug: string;
    name: string;
    category: string;
    subcategory?: string | null;
  },
  mapping: VendorAIMapping,
): VendorPreviewItem {
  return {
    vendorName: catalogVendor.name,
    vendorSlug: catalogVendor.slug,
    category: catalogVendor.subcategory
      ? `${catalogVendor.category} > ${catalogVendor.subcategory}`
      : catalogVendor.category,
    systemName: `${catalogVendor.name} ${mapping.system.nameSuffix}`,
    technique: mapping.system.technique,
    riskLevel: mapping.riskLevel,
    riskRationale: mapping.riskRationale,
    requiresOversightGate: mapping.requiresOversightGate,
    gateType: mapping.gateType,
  };
}

// ============================================================
// ROUTER
// ============================================================

export const quickstartRouter = createTRPCRouter({
  // ──────────────────────────────────────────────────
  // Check for imported vendors from Vendor.Watch
  // ──────────────────────────────────────────────────
  getImportedVendors: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const importedVendors = await ctx.prisma.aIVendor.findMany({
        where: {
          organizationId: ctx.organization.id,
          metadata: { path: ["importedFrom"], equals: "vendorwatch" },
        },
        select: { name: true, catalogSlug: true },
      });

      return {
        hasImportedVendors: importedVendors.length > 0,
        importedCount: importedVendors.length,
        vendors: importedVendors.map((v) => ({
          name: v.name,
          slug: v.catalogSlug,
        })),
      };
    }),

  // ──────────────────────────────────────────────────
  // Preview what importing selected vendors would create
  // ──────────────────────────────────────────────────
  previewVendorImport: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        vendorSlugs: z.array(z.string()).min(1).max(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Free tier: 5 vendors free, require license after
      const hasAccess = await hasVendorCatalogAccess(ctx.organization.id);
      if (!hasAccess) {
        const usedFreeSlots = await ctx.prisma.aIVendor.count({
          where: {
            organizationId: ctx.organization.id,
            metadata: { path: ["source"], equals: "quickstart" },
          },
        });
        const remainingFree = Math.max(0, 5 - usedFreeSlots);
        if (input.vendorSlugs.length > remainingFree) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You can import up to 5 vendors for free during quickstart. You have ${remainingFree} free slot${remainingFree !== 1 ? "s" : ""} remaining. Subscribe to the Vendor Catalog add-on to import more.`,
          });
        }
      }

      // Fetch selected catalog vendors
      const catalogVendors = await ctx.prisma.vendorCatalog.findMany({
        where: { slug: { in: input.vendorSlugs } },
        select: {
          slug: true,
          name: true,
          category: true,
          subcategory: true,
          description: true,
        },
      });

      // Check which vendors already exist
      const existingVendors = await ctx.prisma.aIVendor.findMany({
        where: {
          organizationId: ctx.organization.id,
          name: { in: catalogVendors.map((v) => v.name) },
        },
        select: { name: true },
      });
      const existingVendorNames = existingVendors.map((v) => v.name);

      const previews: VendorPreviewItem[] = [];
      for (const vendor of catalogVendors) {
        const mapping = findAIMappingForCategory(vendor.category, vendor.subcategory);
        previews.push(buildVendorPreview(vendor, mapping));
      }

      const newPreviews = previews.filter(
        (p) => !existingVendorNames.includes(p.vendorName),
      );

      return {
        previews,
        existingVendorNames,
        totals: {
          vendors: newPreviews.length,
          systems: newPreviews.length,
          riskClassifications: newPreviews.length,
          oversightGates: newPreviews.filter((p) => p.requiresOversightGate).length,
        },
      };
    }),

  // ──────────────────────────────────────────────────
  // List available industry templates (lightweight)
  // ──────────────────────────────────────────────────
  listTemplates: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(() => {
      return AI_GOVERNANCE_TEMPLATES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        systemCount: t.systems.length,
        policyCount: t.policies.length,
      }));
    }),

  // ──────────────────────────────────────────────────
  // Preview what an industry template would create
  // ──────────────────────────────────────────────────
  previewIndustryTemplate: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        industryId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const template = getTemplateById(input.industryId);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Industry template not found",
        });
      }

      // Check which systems already exist
      const existingSystemNames = await ctx.prisma.aISystem
        .findMany({
          where: {
            organizationId: ctx.organization.id,
            name: { in: template.systems.map((s) => s.name) },
          },
          select: { name: true },
        })
        .then((s) => s.map((x) => x.name));

      // Check which policies already exist
      const existingPolicyTitles = await ctx.prisma.aIPolicy
        .findMany({
          where: {
            organizationId: ctx.organization.id,
            title: { in: template.policies.map((p) => p.title) },
          },
          select: { title: true },
        })
        .then((p) => p.map((x) => x.title));

      return {
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          icon: template.icon,
        },
        systems: template.systems.map((s) => ({
          name: s.name,
          description: s.description,
          technique: s.technique,
          riskLevel: s.riskLevel,
          riskRationale: s.riskRationale,
          gateType: s.gateType,
          alreadyExists: existingSystemNames.includes(s.name),
        })),
        policies: template.policies.map((p) => ({
          title: p.title,
          type: p.type,
          description: p.description,
          alreadyExists: existingPolicyTitles.includes(p.title),
        })),
        totals: {
          systems: template.systems.filter((s) => !existingSystemNames.includes(s.name)).length,
          riskClassifications: template.systems.filter(
            (s) => !existingSystemNames.includes(s.name),
          ).length,
          oversightGates: template.systems.filter(
            (s) => !existingSystemNames.includes(s.name) && s.gateType,
          ).length,
          policies: template.policies.filter(
            (p) => !existingPolicyTitles.includes(p.title),
          ).length,
        },
      };
    }),

  // ──────────────────────────────────────────────────
  // Preview what the law-firm toolkit selection would create
  // (free path — no entitlement gate, like industry templates)
  // ──────────────────────────────────────────────────
  previewLawFirmToolkit: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        toolIds: z.array(z.string()).min(1).max(40),
      }),
    )
    .query(async ({ ctx, input }) => {
      const locale = resolveContentLocale(ctx.getCookie);
      const tools = getLawFirmToolsById(input.toolIds);
      if (tools.length !== new Set(input.toolIds).size) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown law-firm tool selection",
        });
      }

      const policyTitles = LAWFIRM_POLICY_PACK.map((p) => p.title[locale]);
      const [existingSystemNames, existingVendorNames, existingPolicyTitles] =
        await Promise.all([
          ctx.prisma.aISystem
            .findMany({
              where: {
                organizationId: ctx.organization.id,
                name: { in: tools.map((t) => t.name) },
              },
              select: { name: true },
            })
            .then((s) => new Set(s.map((x) => x.name))),
          ctx.prisma.aIVendor
            .findMany({
              where: {
                organizationId: ctx.organization.id,
                name: { in: tools.map((t) => t.vendor) },
              },
              select: { name: true },
            })
            .then((v) => new Set(v.map((x) => x.name))),
          ctx.prisma.aIPolicy
            .findMany({
              where: {
                organizationId: ctx.organization.id,
                title: { in: policyTitles },
              },
              select: { title: true },
            })
            .then((p) => new Set(p.map((x) => x.title))),
        ]);

      const toolPreviews = tools.map((tool) => {
        const governance = getToolGovernance(tool);
        const category = getLawFirmCategory(tool.categoryId)!;
        return {
          toolId: tool.id,
          name: tool.name,
          vendorName: tool.vendor,
          categoryId: category.id,
          categoryLabel: category.label[locale],
          description: tool.description[locale],
          riskLevel: governance.riskLevel,
          riskRationale: governance.riskRationale[locale],
          gateType: governance.gateType,
          alreadyExists: existingSystemNames.has(tool.name),
        };
      });

      const policyPreviews = LAWFIRM_POLICY_PACK.map((policy) => ({
        id: policy.id,
        title: policy.title[locale],
        type: policy.type,
        description: policy.description[locale],
        alreadyExists: existingPolicyTitles.has(policy.title[locale]),
      }));

      const newTools = toolPreviews.filter((t) => !t.alreadyExists);
      const newVendorNames = new Set(
        newTools
          .map((t) => t.vendorName)
          .filter((name) => !existingVendorNames.has(name)),
      );

      return {
        locale,
        tools: toolPreviews,
        policies: policyPreviews,
        totals: {
          vendors: newVendorNames.size,
          systems: newTools.length,
          riskClassifications: newTools.length,
          oversightGates: newTools.filter((t) => t.gateType).length,
          policies: policyPreviews.filter((p) => !p.alreadyExists).length,
        },
      };
    }),

  // ──────────────────────────────────────────────────
  // Execute quickstart — create all records in a transaction
  // ──────────────────────────────────────────────────
  execute: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        vendorSlugs: z.array(z.string()).max(20).default([]),
        industryId: z.string().optional(),
        lawFirmToolIds: z.array(z.string()).max(40).default([]),
        skipSystemNames: z.array(z.string()).default([]),
        skipPolicyTitles: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.organization.id;
      const userId = ctx.session.user.id;
      const skipSystems = new Set(input.skipSystemNames);
      const skipPolicies = new Set(input.skipPolicyTitles);

      // Validate at least one path is selected
      if (
        input.vendorSlugs.length === 0 &&
        !input.industryId &&
        input.lawFirmToolIds.length === 0
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Select at least one vendor to import, an industry template, or a law-firm toolkit",
        });
      }

      // Validate law-firm tool selection (free path — no entitlement gate)
      const lawFirmTools = getLawFirmToolsById(input.lawFirmToolIds);
      if (lawFirmTools.length !== new Set(input.lawFirmToolIds).size) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown law-firm tool selection",
        });
      }
      const contentLocale = resolveContentLocale(ctx.getCookie);

      // Validate vendor catalog access if vendor path selected
      if (input.vendorSlugs.length > 0) {
        const hasAccess = await hasVendorCatalogAccess(orgId);
        if (!hasAccess) {
          const usedFreeSlots = await ctx.prisma.aIVendor.count({
            where: {
              organizationId: orgId,
              metadata: { path: ["source"], equals: "quickstart" },
            },
          });
          const remainingFree = Math.max(0, 5 - usedFreeSlots);
          if (input.vendorSlugs.length > remainingFree) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `You can import up to 5 vendors for free during quickstart. You have ${remainingFree} free slot${remainingFree !== 1 ? "s" : ""} remaining. Subscribe to the Vendor Catalog add-on to import more.`,
            });
          }
        }
      }

      // Validate industry template if selected
      let template: AIGovernanceTemplate | undefined;
      if (input.industryId) {
        template = getTemplateById(input.industryId);
        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Industry template not found",
          });
        }
      }

      // Program enrichment (policy links, transparency profiles, compliance
      // baseline) applies when a policy-deriving path runs.
      const enrichmentActive = lawFirmTools.length > 0 || !!input.industryId;
      const requirementIdsByRule = new Map<string, string[]>();
      if (enrichmentActive) {
        const allRequirements = await ctx.prisma.complianceRequirement.findMany({
          select: { id: true, code: true, framework: { select: { code: true } } },
        });
        for (const rule of QUICKSTART_COMPLIANCE_BASELINE) {
          requirementIdsByRule.set(
            baselineRuleKey(rule),
            allRequirements
              .filter(
                (r) =>
                  r.framework.code === rule.framework && r.code === rule.code,
              )
              .map((r) => r.id),
          );
        }
      }

      // Fetch catalog vendors if needed
      const catalogVendors =
        input.vendorSlugs.length > 0
          ? await ctx.prisma.vendorCatalog.findMany({
              where: { slug: { in: input.vendorSlugs } },
            })
          : [];

      // Fetch existing names for deduplication (parallel).
      // Vendors also carry their id so the law-firm path can link an existing
      // vendor (e.g. OpenAI imported from the catalog) instead of duplicating it.
      const [existingVendors, existingSystemNames, existingPolicyTitles] =
        await Promise.all([
          ctx.prisma.aIVendor
            .findMany({ where: { organizationId: orgId }, select: { id: true, name: true } })
            .then((v) => new Map(v.map((x) => [x.name, x.id]))),
          ctx.prisma.aISystem
            .findMany({ where: { organizationId: orgId }, select: { name: true } })
            .then((s) => new Set(s.map((x) => x.name))),
          ctx.prisma.aIPolicy
            .findMany({ where: { organizationId: orgId }, select: { title: true } })
            .then((p) => new Set(p.map((x) => x.title))),
        ]);

      // Execute everything in a transaction
      const result = await ctx.prisma.$transaction(
        async (tx) => {
          const counts = {
            vendors: 0,
            systems: 0,
            riskClassifications: 0,
            complianceMappings: 0,
            oversightGates: 0,
            policies: 0,
            policyLinks: 0,
            transparencyProfiles: 0,
            complianceBaselined: 0,
          };

          // Systems created in this run, tracked for program enrichment
          const createdSystems: {
            id: string;
            hasGate: boolean;
            generative: boolean;
            path: "vendor" | "industry" | "lawfirm";
          }[] = [];

          const auditEntries: {
            entityType: string;
            entityId: string;
            action: string;
            changes?: object;
          }[] = [];

          // ─── VENDOR PATH ──────────────────────────────
          for (const catalogVendor of catalogVendors) {
            if (existingVendors.has(catalogVendor.name)) continue;

            const mapping = findAIMappingForCategory(
              catalogVendor.category,
              catalogVendor.subcategory,
            );

            // Skip check runs BEFORE the vendor create: unchecking a system in
            // the review step skips the whole import, never leaving an orphan vendor.
            const systemName = `${catalogVendor.name} ${mapping.system.nameSuffix}`;
            if (existingSystemNames.has(systemName) || skipSystems.has(systemName)) continue;

            // Create AIVendor
            const vendor = await tx.aIVendor.create({
              data: {
                organizationId: orgId,
                name: catalogVendor.name,
                description: catalogVendor.description,
                website: catalogVendor.website,
                status: VendorStatus.UNDER_REVIEW,
                riskLevel: mapping.riskLevel === "HIGH" || mapping.riskLevel === "UNACCEPTABLE"
                  ? "HIGH"
                  : mapping.riskLevel === "LIMITED"
                  ? "MEDIUM"
                  : "LOW",
                catalogSlug: catalogVendor.slug,
                metadata: { source: "quickstart" },
              },
            });
            counts.vendors++;
            existingVendors.set(catalogVendor.name, vendor.id);
            auditEntries.push({
              entityType: "AIVendor",
              entityId: vendor.id,
              action: "CREATE",
              changes: { source: "quickstart", catalogSlug: catalogVendor.slug },
            });

            // Create AISystem
            const system = await tx.aISystem.create({
              data: {
                organizationId: orgId,
                name: systemName,
                description: `AI system deployed from ${catalogVendor.name}. ${mapping.system.purpose}`,
                technique: mapping.system.technique,
                role: mapping.system.role,
                status: "DRAFT",
                purpose: mapping.system.purpose,
                processesPersonalData: mapping.system.processesPersonalData,
                vendorId: vendor.id,
                metadata: { source: "quickstart" },
              },
            });
            counts.systems++;
            existingSystemNames.add(systemName);
            auditEntries.push({
              entityType: "AISystem",
              entityId: system.id,
              action: "CREATE",
              changes: { source: "quickstart" },
            });

            // Create RiskClassification
            await tx.riskClassification.create({
              data: {
                organizationId: orgId,
                aiSystemId: system.id,
                riskLevel: mapping.riskLevel,
                rationale: mapping.riskRationale,
                annexIIICategory: mapping.annexIIICategory,
                classifiedBy: userId,
              },
            });
            counts.riskClassifications++;
            auditEntries.push({
              entityType: "RiskClassification",
              entityId: system.id,
              action: "CREATE",
              changes: { source: "quickstart", riskLevel: mapping.riskLevel },
            });

            // Auto-create compliance mappings for applicable requirements
            const applicableReqs = await tx.complianceRequirement.findMany({
              where: { applicableTo: { has: mapping.riskLevel } },
              select: { id: true },
            });
            if (applicableReqs.length > 0) {
              const created = await tx.complianceMapping.createMany({
                data: applicableReqs.map((req) => ({
                  organizationId: orgId,
                  aiSystemId: system.id,
                  requirementId: req.id,
                  status: "NOT_ASSESSED" as const,
                  // Machine-created placeholder slots. Recording the
                  // origin keeps the assurance number honest: these were
                  // never reviewed by a person.
                  provenance: "AUTO_TEMPLATE" as const,
                  sourceRef: "quickstart:compliance-mappings",
                })),
                skipDuplicates: true,
              });
              counts.complianceMappings += created.count;
            }

            createdSystems.push({
              id: system.id,
              hasGate: Boolean(mapping.requiresOversightGate && mapping.gateType),
              generative: mapping.system.technique === "GENERATIVE_AI",
              path: "vendor",
            });

            // Create OversightGate if HIGH risk
            if (mapping.requiresOversightGate && mapping.gateType) {
              await tx.oversightGate.create({
                data: {
                  organizationId: orgId,
                  aiSystemId: system.id,
                  gateType: mapping.gateType,
                  description: `Pre-deployment oversight gate for ${systemName}. Required due to ${mapping.riskLevel} risk classification.`,
                  status: "PENDING",
                },
              });
              counts.oversightGates++;
              auditEntries.push({
                entityType: "OversightGate",
                entityId: system.id,
                action: "CREATE",
                changes: { source: "quickstart", gateType: mapping.gateType },
              });
            }
          }

          // ─── INDUSTRY TEMPLATE PATH ──────────────────
          if (template) {
            // Create AI Systems
            for (const templateSystem of template.systems) {
              if (
                existingSystemNames.has(templateSystem.name) ||
                skipSystems.has(templateSystem.name)
              ) {
                continue;
              }

              const system = await tx.aISystem.create({
                data: {
                  organizationId: orgId,
                  name: templateSystem.name,
                  description: templateSystem.description,
                  technique: templateSystem.technique,
                  role: templateSystem.role,
                  status: "DRAFT",
                  purpose: templateSystem.purpose,
                  processesPersonalData: templateSystem.processesPersonalData,
                  metadata: { source: "quickstart", template: template.id },
                },
              });
              counts.systems++;
              existingSystemNames.add(templateSystem.name);
              auditEntries.push({
                entityType: "AISystem",
                entityId: system.id,
                action: "CREATE",
                changes: { source: "quickstart", template: template.id },
              });

              // Create RiskClassification
              await tx.riskClassification.create({
                data: {
                  organizationId: orgId,
                  aiSystemId: system.id,
                  riskLevel: templateSystem.riskLevel,
                  rationale: templateSystem.riskRationale,
                  annexIIICategory: templateSystem.annexIIICategory,
                  classifiedBy: userId,
                },
              });
              counts.riskClassifications++;

              // Auto-create compliance mappings for applicable requirements
              const applicableReqs = await tx.complianceRequirement.findMany({
                where: { applicableTo: { has: templateSystem.riskLevel } },
                select: { id: true },
              });
              if (applicableReqs.length > 0) {
                const created = await tx.complianceMapping.createMany({
                  data: applicableReqs.map((req) => ({
                    organizationId: orgId,
                    aiSystemId: system.id,
                    requirementId: req.id,
                    status: "NOT_ASSESSED" as const,
                  // Machine-created placeholder slots. Recording the
                  // origin keeps the assurance number honest: these were
                  // never reviewed by a person.
                  provenance: "AUTO_TEMPLATE" as const,
                  sourceRef: "quickstart:compliance-mappings",
                  })),
                  skipDuplicates: true,
                });
                counts.complianceMappings += created.count;
              }

              createdSystems.push({
                id: system.id,
                hasGate: Boolean(templateSystem.gateType),
                generative: templateSystem.technique === "GENERATIVE_AI",
                path: "industry",
              });

              // Create OversightGate for HIGH-risk systems
              if (templateSystem.gateType) {
                await tx.oversightGate.create({
                  data: {
                    organizationId: orgId,
                    aiSystemId: system.id,
                    gateType: templateSystem.gateType,
                    description: `Pre-deployment oversight gate for ${templateSystem.name}. Required due to ${templateSystem.riskLevel} risk classification.`,
                    status: "PENDING",
                  },
                });
                counts.oversightGates++;
              }
            }

            // Create Policies
            for (const templatePolicy of template.policies) {
              if (
                existingPolicyTitles.has(templatePolicy.title) ||
                skipPolicies.has(templatePolicy.title)
              ) {
                continue;
              }

              const policy = await tx.aIPolicy.create({
                data: {
                  organizationId: orgId,
                  title: templatePolicy.title,
                  type: templatePolicy.type,
                  description: templatePolicy.description,
                  content: templatePolicy.content,
                  status: "DRAFT",
                  createdBy: userId,
                },
              });
              counts.policies++;
              existingPolicyTitles.add(templatePolicy.title);
              auditEntries.push({
                entityType: "AIPolicy",
                entityId: policy.id,
                action: "CREATE",
                changes: { source: "quickstart", template: template.id },
              });
            }
          }

          // ─── LAW-FIRM TOOLKIT PATH ──────────────────
          for (const tool of lawFirmTools) {
            // System name is the brand name (locale-invariant dedupe key)
            if (existingSystemNames.has(tool.name) || skipSystems.has(tool.name)) {
              continue;
            }

            const governance = getToolGovernance(tool);

            // Create the vendor, or link the existing one (name collision with
            // e.g. a catalog import means link, not duplicate)
            let vendorId = existingVendors.get(tool.vendor);
            if (!vendorId) {
              const vendor = await tx.aIVendor.create({
                data: {
                  organizationId: orgId,
                  name: tool.vendor,
                  website: tool.website,
                  status: VendorStatus.UNDER_REVIEW,
                  riskLevel: governance.riskLevel === "HIGH" || governance.riskLevel === "UNACCEPTABLE"
                    ? "HIGH"
                    : governance.riskLevel === "LIMITED"
                    ? "MEDIUM"
                    : "LOW",
                  metadata: { source: "quickstart", profile: "lawfirm" },
                },
              });
              vendorId = vendor.id;
              counts.vendors++;
              existingVendors.set(tool.vendor, vendor.id);
              auditEntries.push({
                entityType: "AIVendor",
                entityId: vendor.id,
                action: "CREATE",
                changes: { source: "quickstart", profile: "lawfirm", toolId: tool.id },
              });
            }

            const system = await tx.aISystem.create({
              data: {
                organizationId: orgId,
                name: tool.name,
                description: tool.description[contentLocale],
                technique: governance.technique,
                role: governance.role,
                status: "DRAFT",
                purpose: governance.purpose[contentLocale],
                processesPersonalData: governance.processesPersonalData,
                vendorId,
                metadata: {
                  source: "quickstart",
                  profile: "lawfirm",
                  toolId: tool.id,
                  locale: contentLocale,
                },
              },
            });
            counts.systems++;
            existingSystemNames.add(tool.name);
            auditEntries.push({
              entityType: "AISystem",
              entityId: system.id,
              action: "CREATE",
              changes: { source: "quickstart", profile: "lawfirm", toolId: tool.id },
            });

            await tx.riskClassification.create({
              data: {
                organizationId: orgId,
                aiSystemId: system.id,
                riskLevel: governance.riskLevel,
                rationale: governance.riskRationale[contentLocale],
                annexIIICategory: governance.annexIIICategory,
                classifiedBy: userId,
              },
            });
            counts.riskClassifications++;
            auditEntries.push({
              entityType: "RiskClassification",
              entityId: system.id,
              action: "CREATE",
              changes: { source: "quickstart", profile: "lawfirm", riskLevel: governance.riskLevel },
            });

            const applicableReqs = await tx.complianceRequirement.findMany({
              where: { applicableTo: { has: governance.riskLevel } },
              select: { id: true },
            });
            if (applicableReqs.length > 0) {
              const created = await tx.complianceMapping.createMany({
                data: applicableReqs.map((req) => ({
                  organizationId: orgId,
                  aiSystemId: system.id,
                  requirementId: req.id,
                  status: "NOT_ASSESSED" as const,
                  // Machine-created placeholder slots. Recording the
                  // origin keeps the assurance number honest: these were
                  // never reviewed by a person.
                  provenance: "AUTO_TEMPLATE" as const,
                  sourceRef: "quickstart:compliance-mappings",
                })),
                skipDuplicates: true,
              });
              counts.complianceMappings += created.count;
            }

            createdSystems.push({
              id: system.id,
              hasGate: Boolean(governance.gateType),
              generative: governance.technique === "GENERATIVE_AI",
              path: "lawfirm",
            });

            if (governance.gateType) {
              await tx.oversightGate.create({
                data: {
                  organizationId: orgId,
                  aiSystemId: system.id,
                  gateType: governance.gateType,
                  description:
                    contentLocale === "es"
                      ? `Punto de control previo al despliegue de ${tool.name}. Control interno del programa de gobernanza de IA del despacho.`
                      : `Pre-deployment oversight gate for ${tool.name}. Internal control of the firm's AI governance program.`,
                  status: "PENDING",
                },
              });
              counts.oversightGates++;
              auditEntries.push({
                entityType: "OversightGate",
                entityId: system.id,
                action: "CREATE",
                changes: { source: "quickstart", profile: "lawfirm", gateType: governance.gateType },
              });
            }
          }

          // Law-firm policy pack (locale-resolved titles are the dedupe key)
          if (lawFirmTools.length > 0) {
            for (const packPolicy of LAWFIRM_POLICY_PACK) {
              const title = packPolicy.title[contentLocale];
              if (existingPolicyTitles.has(title) || skipPolicies.has(title)) {
                continue;
              }

              const policy = await tx.aIPolicy.create({
                data: {
                  organizationId: orgId,
                  title,
                  type: packPolicy.type,
                  description: packPolicy.description[contentLocale],
                  content: packPolicy.content[contentLocale],
                  status: "DRAFT",
                  createdBy: userId,
                },
              });
              counts.policies++;
              existingPolicyTitles.add(title);
              auditEntries.push({
                entityType: "AIPolicy",
                entityId: policy.id,
                action: "CREATE",
                changes: { source: "quickstart", profile: "lawfirm", policyId: packPolicy.id },
              });
            }

            // Persist the program profile on the organization (first writer of
            // settings — merge non-destructively)
            const org = await tx.organization.findUnique({
              where: { id: orgId },
              select: { settings: true },
            });
            const settings =
              org?.settings && typeof org.settings === "object" && !Array.isArray(org.settings)
                ? (org.settings as Record<string, unknown>)
                : {};
            await tx.organization.update({
              where: { id: orgId },
              data: {
                settings: {
                  ...settings,
                  quickstart: {
                    profile: "lawfirm",
                    completedAt: new Date().toISOString(),
                    locale: contentLocale,
                    toolIds: lawFirmTools.map((t) => t.id),
                    version: 1,
                  },
                },
              },
            });
            auditEntries.push({
              entityType: "Organization",
              entityId: orgId,
              action: "UPDATE",
              changes: { source: "quickstart", profile: "lawfirm" },
            });
          }

          // ─── PROGRAM ENRICHMENT ─────────────────────────
          // Turn the skeleton into a living program: link the drafted
          // policies to the systems they govern, document the Art. 50
          // deployer posture for generative systems, and pre-assess the
          // framework requirements the generated artifacts genuinely
          // evidence (never above PARTIALLY_COMPLIANT; never overwriting
          // anything a human has assessed).
          if (enrichmentActive && createdSystems.length > 0) {
            // 1 · Policy ↔ system links, per policy-deriving path
            for (const path of ["industry", "lawfirm"] as const) {
              const pathSystems = createdSystems.filter((s) => s.path === path);
              if (pathSystems.length === 0) continue;
              const titles =
                path === "lawfirm"
                  ? LAWFIRM_POLICY_PACK.flatMap((p) => [p.title.en, p.title.es])
                  : template
                    ? template.policies.map((p) => p.title)
                    : [];
              if (titles.length === 0) continue;
              const policyRows = await tx.aIPolicy.findMany({
                where: { organizationId: orgId, title: { in: titles } },
                select: { id: true },
              });
              if (policyRows.length === 0) continue;
              const links = await tx.aIPolicySystemLink.createMany({
                data: policyRows.flatMap((policy) =>
                  pathSystems.map((sys) => ({
                    policyId: policy.id,
                    aiSystemId: sys.id,
                  })),
                ),
                skipDuplicates: true,
              });
              counts.policyLinks += links.count;
            }

            // 2 · Art. 50 transparency profiles for generative systems
            // (documented deployer-posture review; statuses N/A with reasons)
            for (const sys of createdSystems.filter((s) => s.generative)) {
              await tx.transparencyProfile.create({
                data: {
                  organizationId: orgId,
                  aiSystemId: sys.id,
                  art50InteractionStatus: "NOT_APPLICABLE",
                  art50MarkingStatus: "NOT_APPLICABLE",
                  art50EmotionStatus: "NOT_APPLICABLE",
                  art50DeepfakeStatus: "NOT_APPLICABLE",
                  notes: TRANSPARENCY_PROFILE_NOTES[contentLocale],
                  reviewedBy: userId,
                },
              });
              counts.transparencyProfiles++;
            }

            // 3 · Compliance baseline from generated artifacts
            const assessedAt = new Date();
            for (const rule of QUICKSTART_COMPLIANCE_BASELINE) {
              const reqIds = requirementIdsByRule.get(baselineRuleKey(rule)) ?? [];
              if (reqIds.length === 0) continue;
              const targets = createdSystems
                .filter(
                  (s) =>
                    (!rule.requiresGate || s.hasGate) &&
                    (!rule.requiresPolicies || s.path !== "vendor") &&
                    (!rule.requiresTransparencyProfile || s.generative),
                )
                .map((s) => s.id);
              if (targets.length === 0) continue;
              const updated = await tx.complianceMapping.updateMany({
                where: {
                  organizationId: orgId,
                  aiSystemId: { in: targets },
                  requirementId: { in: reqIds },
                  status: "NOT_ASSESSED",
                },
                data: {
                  status: rule.status,
                  evidence: rule.evidence[contentLocale],
                  assessedBy: userId,
                  assessedAt,
                },
              });
              counts.complianceBaselined += updated.count;
            }

            auditEntries.push({
              entityType: "Organization",
              entityId: orgId,
              action: "UPDATE",
              changes: {
                source: "quickstart",
                enrichment: {
                  policyLinks: counts.policyLinks,
                  transparencyProfiles: counts.transparencyProfiles,
                  complianceBaselined: counts.complianceBaselined,
                },
              },
            });
          }

          // ─── AUDIT LOG ENTRIES (batch) ──────────────────
          if (auditEntries.length > 0) {
            await tx.auditLog.createMany({
              data: auditEntries.map((entry) => ({
                organizationId: orgId,
                userId,
                entityType: entry.entityType,
                entityId: entry.entityId,
                action: entry.action,
                changes: entry.changes,
                metadata: { source: "quickstart" },
              })),
            });
          }

          return counts;
        },
        { timeout: 30000 },
      );

      return result;
    }),
});
