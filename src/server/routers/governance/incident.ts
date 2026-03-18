import { z } from "zod";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const incidentRouter = createTRPCRouter({
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        type: z.enum(["HALLUCINATION", "BIAS_DISCRIMINATION", "MODEL_DRIFT", "ADVERSARIAL_ATTACK", "PROMPT_INJECTION", "UNAUTHORIZED_ACCESS", "SAFETY_FAILURE", "PERFORMANCE_DEGRADATION", "DATA_POISONING", "PRIVACY_VIOLATION", "OTHER"]).optional(),
        severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
        status: z.enum(["REPORTED", "INVESTIGATING", "MITIGATING", "RESOLVED", "CLOSED"]).optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        organizationId: ctx.organization.id,
        ...(input.search && {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
            { description: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
        ...(input.type && { type: input.type }),
        ...(input.severity && { severity: input.severity }),
        ...(input.status && { status: input.status }),
      };

      const items = await ctx.prisma.aIIncident.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { reportedAt: "desc" },
        include: {
          aiSystem: { select: { id: true, name: true } },
          _count: { select: { tasks: true, timeline: true, notifications: true } },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  getById: organizationProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      const incident = await ctx.prisma.aIIncident.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: {
          aiSystem: { select: { id: true, name: true, status: true } },
          timeline: { orderBy: { performedAt: "desc" } },
          tasks: { orderBy: { createdAt: "desc" } },
          notifications: { orderBy: { dueBy: "asc" } },
        },
      });

      if (!incident) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found" });
      }

      return incident;
    }),

  create: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string().optional(),
        title: z.string().min(1).max(300),
        description: z.string().min(1),
        type: z.enum(["HALLUCINATION", "BIAS_DISCRIMINATION", "MODEL_DRIFT", "ADVERSARIAL_ATTACK", "PROMPT_INJECTION", "UNAUTHORIZED_ACCESS", "SAFETY_FAILURE", "PERFORMANCE_DEGRADATION", "DATA_POISONING", "PRIVACY_VIOLATION", "OTHER"]),
        severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
        notificationRequired: z.boolean().default(false),
        dpoCentralIncidentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const incident = await ctx.prisma.aIIncident.create({
        data: {
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId || undefined,
          title: input.title,
          description: input.description,
          type: input.type,
          severity: input.severity,
          notificationRequired: input.notificationRequired,
          dpoCentralIncidentId: input.dpoCentralIncidentId,
          reportedBy: ctx.session.user.id,
        },
      });

      // Auto-create initial timeline entry
      await ctx.prisma.aIIncidentTimeline.create({
        data: {
          incidentId: incident.id,
          organizationId: ctx.organization.id,
          action: "Incident reported",
          description: `${input.severity} ${input.type.replace(/_/g, " ").toLowerCase()} incident reported`,
          performedBy: ctx.session.user.id,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIIncident",
          entityId: incident.id,
          action: "CREATE",
          changes: { title: input.title, type: input.type, severity: input.severity },
        },
      });

      return incident;
    }),

  update: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        status: z.enum(["REPORTED", "INVESTIGATING", "MITIGATING", "RESOLVED", "CLOSED"]).optional(),
        rootCauseCategory: z.string().nullable().optional(),
        rootCauseDescription: z.string().nullable().optional(),
        impactDescription: z.string().nullable().optional(),
        severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
        notificationRequired: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.aIIncident.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found" });
      }

      const { id, organizationId, ...data } = input;
      const updateData: Record<string, unknown> = {};
      if (data.status !== undefined) updateData.status = data.status;
      if (data.rootCauseCategory !== undefined) updateData.rootCauseCategory = data.rootCauseCategory;
      if (data.rootCauseDescription !== undefined) updateData.rootCauseDescription = data.rootCauseDescription;
      if (data.impactDescription !== undefined) updateData.impactDescription = data.impactDescription;
      if (data.severity !== undefined) updateData.severity = data.severity;
      if (data.notificationRequired !== undefined) updateData.notificationRequired = data.notificationRequired;

      // On RESOLVED → set resolvedAt
      if (data.status === "RESOLVED" && existing.status !== "RESOLVED") {
        updateData.resolvedAt = new Date();
      }

      await ctx.prisma.aIIncident.update({
        where: { id: input.id },
        data: updateData as never,
      });

      // On status change → auto timeline entry
      if (data.status && data.status !== existing.status) {
        await ctx.prisma.aIIncidentTimeline.create({
          data: {
            incidentId: input.id,
            organizationId: ctx.organization.id,
            action: `Status changed to ${data.status}`,
            description: `Status updated from ${existing.status} to ${data.status}`,
            performedBy: ctx.session.user.id,
          },
        });
      }

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIIncident",
          entityId: input.id,
          action: "UPDATE",
          changes: updateData as Record<string, string | number | boolean | null>,
        },
      });

      return ctx.prisma.aIIncident.findUnique({ where: { id: input.id } });
    }),

  addTimelineEntry: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        incidentId: z.string(),
        action: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const incident = await ctx.prisma.aIIncident.findFirst({
        where: { id: input.incidentId, organizationId: ctx.organization.id },
      });

      if (!incident) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found" });
      }

      return ctx.prisma.aIIncidentTimeline.create({
        data: {
          incidentId: input.incidentId,
          organizationId: ctx.organization.id,
          action: input.action,
          description: input.description,
          performedBy: ctx.session.user.id,
        },
      });
    }),

  addTask: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        incidentId: z.string(),
        title: z.string().min(1),
        assignedTo: z.string().optional(),
        dueDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const incident = await ctx.prisma.aIIncident.findFirst({
        where: { id: input.incidentId, organizationId: ctx.organization.id },
      });

      if (!incident) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found" });
      }

      return ctx.prisma.aIIncidentTask.create({
        data: {
          incidentId: input.incidentId,
          organizationId: ctx.organization.id,
          title: input.title,
          assignedTo: input.assignedTo,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        },
      });
    }),

  updateTask: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        taskId: z.string(),
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
        title: z.string().optional(),
        assignedTo: z.string().nullable().optional(),
        dueDate: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.aIIncidentTask.findFirst({
        where: { id: input.taskId, organizationId: ctx.organization.id },
      });

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      const updateData: Record<string, unknown> = {};
      if (input.status !== undefined) updateData.status = input.status;
      if (input.title !== undefined) updateData.title = input.title;
      if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo;
      if (input.dueDate !== undefined) {
        updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
      }

      // On COMPLETED → set completedAt
      if (input.status === "COMPLETED" && task.status !== "COMPLETED") {
        updateData.completedAt = new Date();
      }

      return ctx.prisma.aIIncidentTask.update({
        where: { id: input.taskId },
        data: updateData as never,
      });
    }),

  addNotification: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        incidentId: z.string(),
        authority: z.string().min(1),
        notificationType: z.string().min(1),
        dueBy: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const incident = await ctx.prisma.aIIncident.findFirst({
        where: { id: input.incidentId, organizationId: ctx.organization.id },
      });

      if (!incident) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found" });
      }

      return ctx.prisma.aIIncidentNotification.create({
        data: {
          incidentId: input.incidentId,
          organizationId: ctx.organization.id,
          authority: input.authority,
          notificationType: input.notificationType,
          dueBy: input.dueBy ? new Date(input.dueBy) : undefined,
        },
      });
    }),

  updateNotification: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        notificationId: z.string(),
        status: z.enum(["PENDING", "SENT", "ACKNOWLEDGED"]).optional(),
        sentAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.prisma.aIIncidentNotification.findFirst({
        where: { id: input.notificationId, organizationId: ctx.organization.id },
      });

      if (!notification) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found" });
      }

      const updateData: Record<string, unknown> = {};
      if (input.status !== undefined) updateData.status = input.status;
      if (input.sentAt !== undefined) updateData.sentAt = new Date(input.sentAt);

      return ctx.prisma.aIIncidentNotification.update({
        where: { id: input.notificationId },
        data: updateData as never,
      });
    }),

  getStats: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [total, critical, open, resolved] = await Promise.all([
        ctx.prisma.aIIncident.count({
          where: { organizationId: ctx.organization.id },
        }),
        ctx.prisma.aIIncident.count({
          where: { organizationId: ctx.organization.id, severity: "CRITICAL" },
        }),
        ctx.prisma.aIIncident.count({
          where: {
            organizationId: ctx.organization.id,
            status: { in: ["REPORTED", "INVESTIGATING", "MITIGATING"] },
          },
        }),
        ctx.prisma.aIIncident.count({
          where: {
            organizationId: ctx.organization.id,
            status: { in: ["RESOLVED", "CLOSED"] },
          },
        }),
      ]);

      return { total, critical, open, resolved };
    }),
});
