import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, organizationProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { hasVendorCatalogAccess } from "@/server/services/licensing/entitlement";

export const vendorCatalogRouter = createTRPCRouter({
  checkAccess: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const hasAccess = await hasVendorCatalogAccess(ctx.organization.id);
      return { hasAccess };
    }),

  getStats: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const hasAccess = await hasVendorCatalogAccess(ctx.organization.id);
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "AI Vendor Catalog requires a premium subscription",
        });
      }

      const [total, categories, verified, euAiActCompliant, withAiModels, iso42001Certified] = await Promise.all([
        ctx.prisma.vendorCatalog.count(),
        ctx.prisma.vendorCatalog.findMany({
          select: { category: true },
          distinct: ["category"],
        }),
        ctx.prisma.vendorCatalog.count({ where: { isVerified: true } }),
        ctx.prisma.vendorCatalog.count({ where: { euAiActCompliant: true } }),
        ctx.prisma.vendorCatalog.count({ where: { aiModels: { not: Prisma.DbNull } } }),
        ctx.prisma.vendorCatalog.count({ where: { iso42001Certified: true } }),
      ]);

      return { total, categories: categories.length, verified, euAiActCompliant, withAiModels, iso42001Certified };
    }),

  search: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        query: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const hasAccess = await hasVendorCatalogAccess(ctx.organization.id);
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "AI Vendor Catalog requires a premium subscription",
        });
      }

      const where = {
        ...(input.query && {
          OR: [
            { name: { contains: input.query, mode: "insensitive" as const } },
            { slug: { contains: input.query, mode: "insensitive" as const } },
            { description: { contains: input.query, mode: "insensitive" as const } },
          ],
        }),
        ...(input.category && { category: input.category }),
      };

      const items = await ctx.prisma.vendorCatalog.findMany({
        where,
        take: input.limit,
        orderBy: [{ isVerified: "desc" }, { name: "asc" }],
      });

      return items;
    }),

  getBySlug: organizationProcedure
    .input(z.object({ organizationId: z.string(), slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const hasAccess = await hasVendorCatalogAccess(ctx.organization.id);
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "AI Vendor Catalog requires a premium subscription",
        });
      }

      const entry = await ctx.prisma.vendorCatalog.findUnique({
        where: { slug: input.slug },
        include: {
          _count: {
            select: {
              vendors: { where: { organizationId: ctx.organization.id } },
            },
          },
        },
      });

      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vendor catalog entry not found" });
      }

      return entry;
    }),

  listCategories: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const hasAccess = await hasVendorCatalogAccess(ctx.organization.id);
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "AI Vendor Catalog requires a premium subscription",
        });
      }

      const results = await ctx.prisma.vendorCatalog.findMany({
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      });

      return results.map((r) => r.category);
    }),
});
