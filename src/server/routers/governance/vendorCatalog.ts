import { z } from "zod";
import { createTRPCRouter, organizationProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { hasVendorCatalogAccess } from "@/server/services/licensing/entitlement";

export const vendorCatalogRouter = createTRPCRouter({
  search: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        query: z.string().min(1),
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
        OR: [
          { name: { contains: input.query, mode: "insensitive" as const } },
          { slug: { contains: input.query, mode: "insensitive" as const } },
          { description: { contains: input.query, mode: "insensitive" as const } },
        ],
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
