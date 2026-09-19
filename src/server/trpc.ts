// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { initTRPC, TRPCError } from "@trpc/server";
import { type Session, getServerSession } from "next-auth";
import { cookies } from "next/headers";
import superjson from "superjson";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { assertPilotWritable, pilotLocale } from "@/server/services/pilot/caps";
import { ensurePilotFirstSignIn } from "@/server/services/pilot/first-sign-in";

/**
 * Procedure metadata. `pilotReadOnlyExempt` marks a write procedure a
 * read-only pilot organisation may still call: deleting the organisation is
 * the owner's way out of "one organisation per account" once the editing
 * days are over. Nothing else should carry it.
 */
export interface ProcedureMeta {
  pilotReadOnlyExempt?: boolean;
}

interface CreateContextOptions {
  session: Session | null;
  getCookie: (name: string) => string | undefined;
}

export const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    prisma,
    getCookie: opts.getCookie,
  };
};

export const createTRPCContext = async (_opts: { req: Request }) => {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();

  return createInnerTRPCContext({
    session,
    getCookie: (name: string) => cookieStore.get(name)?.value,
  });
};

const t = initTRPC.context<typeof createTRPCContext>().meta<ProcedureMeta>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// Organization context middleware
export const withOrganization = t.middleware(async ({ ctx, next, getRawInput }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const rawInput = await getRawInput();
  const input = rawInput as { organizationId?: string } | undefined;
  const organizationId = input?.organizationId;

  if (!organizationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organization ID is required",
    });
  }

  // Check if user is a member of this organization
  const membership = await ctx.prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: ctx.session.user.id,
      },
    },
    include: {
      organization: true,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this organization",
    });
  }

  const organization = await withPilotFirstSignIn(ctx.prisma, membership.organization);

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
      organization,
      membership,
    },
  });
});

/**
 * On the hosted pilot, the organisation as the procedure should see it: with
 * its first sign-in recorded if this is the first time it is opened since the
 * pilot went live (see src/server/services/pilot/first-sign-in.ts).
 */
async function withPilotFirstSignIn<O extends { id: string; pilotFirstSignInAt: Date | null }>(
  db: typeof prisma,
  organization: O,
): Promise<O> {
  const pilotFirstSignInAt = await ensurePilotFirstSignIn(db, organization);
  return pilotFirstSignInAt === organization.pilotFirstSignInAt
    ? organization
    : { ...organization, pilotFirstSignInAt };
}

export const organizationProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(withOrganization);

// Write-protected organization procedure: blocks VIEWER from mutations, and
// on the hosted pilot blocks every edit once the organisation's editing days
// are over (reads and exports stay open; see src/config/pilot.ts).
const enforceWriteAccess = t.middleware(async ({ ctx, next, meta, getRawInput }) => {
  const rawInput = await getRawInput();
  const input = rawInput as { organizationId?: string } | undefined;
  const organizationId = input?.organizationId;

  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (!organizationId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Organization ID is required" });
  }

  const membership = await ctx.prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: ctx.session.user.id,
      },
    },
    include: { organization: true },
  });

  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this organization" });
  }

  if (membership.role === "VIEWER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Viewers have read-only access. Contact your organization admin for write permissions.",
    });
  }

  const organization = await withPilotFirstSignIn(ctx.prisma, membership.organization);

  if (!meta?.pilotReadOnlyExempt) {
    assertPilotWritable(organization, pilotLocale(ctx.getCookie));
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
      organization,
      membership,
    },
  });
});

export const orgWriteProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(enforceWriteAccess);

// Admin emails from environment variable (comma-separated)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Platform admin middleware
const enforcePlatformAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user?.email) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (!ADMIN_EMAILS.includes(ctx.session.user.email.toLowerCase())) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Platform admin access required",
    });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const adminProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(enforcePlatformAdmin);
