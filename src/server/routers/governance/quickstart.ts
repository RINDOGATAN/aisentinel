import { z } from "zod";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { VendorStatus } from "@prisma/client";
import {
  findAIMappingForCategory,
  GENERIC_AI_MAPPING,
  type VendorAIMapping,
} from "../../../config/vendor-ai-mappings";
import {
  getTemplateById,
  AI_GOVERNANCE_TEMPLATES,
  type AIGovernanceTemplate,
} from "../../../config/ai-governance-templates";
import { hasVendorCatalogAccess } from "../../services/licensing/entitlement";

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
  // Execute quickstart — create all records in a transaction
  // ──────────────────────────────────────────────────
  execute: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        vendorSlugs: z.array(z.string()).max(20).default([]),
        industryId: z.string().optional(),
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
      if (input.vendorSlugs.length === 0 && !input.industryId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select at least one vendor to import or an industry template",
        });
      }

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

      // Fetch catalog vendors if needed
      const catalogVendors =
        input.vendorSlugs.length > 0
          ? await ctx.prisma.vendorCatalog.findMany({
              where: { slug: { in: input.vendorSlugs } },
            })
          : [];

      // Fetch existing names for deduplication (parallel)
      const [existingVendorNames, existingSystemNames, existingPolicyTitles] =
        await Promise.all([
          ctx.prisma.aIVendor
            .findMany({ where: { organizationId: orgId }, select: { name: true } })
            .then((v) => new Set(v.map((x) => x.name))),
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
          };

          const auditEntries: {
            entityType: string;
            entityId: string;
            action: string;
            changes?: object;
          }[] = [];

          // ─── VENDOR PATH ──────────────────────────────
          for (const catalogVendor of catalogVendors) {
            if (existingVendorNames.has(catalogVendor.name)) continue;

            const mapping = findAIMappingForCategory(
              catalogVendor.category,
              catalogVendor.subcategory,
            );

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
            existingVendorNames.add(catalogVendor.name);
            auditEntries.push({
              entityType: "AIVendor",
              entityId: vendor.id,
              action: "CREATE",
              changes: { source: "quickstart", catalogSlug: catalogVendor.slug },
            });

            // Create AISystem
            const systemName = `${catalogVendor.name} ${mapping.system.nameSuffix}`;
            if (existingSystemNames.has(systemName) || skipSystems.has(systemName)) continue;

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
                })),
                skipDuplicates: true,
              });
              counts.complianceMappings += created.count;
            }

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
                  })),
                  skipDuplicates: true,
                });
                counts.complianceMappings += created.count;
              }

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
