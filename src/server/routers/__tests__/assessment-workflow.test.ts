// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Assessment workflow integrity tests.
 *
 * An assessment is evidence that an analysis actually took place — an EU AI Act
 * Art. 27 FRIA is exactly that. Before these guards, the workflow let an
 * assessment with every required question blank be submitted for review and
 * then approved by its own author, landing as APPROVED and counting towards the
 * organisation's "approved" totals. The record looked identical to one somebody
 * had genuinely completed.
 *
 * These tests pin the four rules that stop it:
 *   1. submit refuses while required questions are unanswered;
 *   2. status only moves through submit/processApproval, never through update;
 *   3. an assessment that has left drafting can no longer be edited;
 *   4. reviewing your own submission requires an explicit, audited acknowledgement.
 *
 * No real database is touched: `@/lib/prisma` is replaced with a small
 * in-memory fake that honours `where` equality and resolves the `template`
 * include, so the completeness gate is exercised against real template JSON
 * rather than a stub.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  function matches(row: Row, where: Record<string, unknown> = {}): boolean {
    for (const [key, value] of Object.entries(where)) {
      if (value && typeof value === "object" && !Array.isArray(value)) continue;
      if (row[key] !== value) return false;
    }
    return true;
  }

  function makeTable() {
    let rows: Row[] = [];
    return {
      __set(next: Row[]) {
        rows = next.map((r) => ({ ...r }));
      },
      __rows: () => rows,
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        rows.find((r) => matches(r, where)) ?? null,
      findMany: async ({ where }: { where?: Record<string, unknown> } = {}) =>
        rows.filter((r) => matches(r, where)),
      count: async ({ where }: { where?: Record<string, unknown> } = {}) =>
        rows.filter((r) => matches(r, where)).length,
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Row }) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
      create: async ({ data }: { data: Row }) => {
        const row = { id: data.id ?? `gen-${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      },
    };
  }

  const templates = makeTable();
  const assessments = makeTable();
  const auditLog = makeTable();

  // aIAssessment.findFirst additionally resolves `include: { template: true }`,
  // which the completeness gate depends on to read the question definitions.
  const aIAssessment = {
    ...assessments,
    findFirst: async ({
      where,
      include,
    }: {
      where: Record<string, unknown>;
      include?: { template?: boolean };
    }) => {
      const row = assessments.__rows().find((r) => matches(r, where));
      if (!row) return null;
      if (!include?.template) return { ...row };
      return {
        ...row,
        template: templates.__rows().find((t) => t.id === row.templateId) ?? null,
      };
    },
  };

  const memberRows: Row[] = [];
  const organizationMember = {
    findUnique: async ({
      where,
    }: {
      where: { organizationId_userId: { organizationId: string; userId: string } };
    }) => {
      const key = where.organizationId_userId;
      const m = memberRows.find(
        (r) => r.organizationId === key.organizationId && r.userId === key.userId
      );
      if (!m) return null;
      return { ...m, organization: { id: "org-a", name: "Org A" } };
    },
  };

  const db = {
    organizationMember,
    aIAssessment,
    aIAssessmentTemplate: templates,
    auditLog,
  };

  // Two required questions and one explicitly optional one.
  const SECTIONS = [
    {
      id: "s1",
      title: "AI System Description",
      questions: [
        { id: "q1", text: "Describe the system", required: true },
        { id: "q2", text: "Describe the deployer's processes", required: true },
        { id: "q3", text: "Anything else?", required: false },
      ],
    },
  ];

  function reset() {
    memberRows.length = 0;
    memberRows.push({ organizationId: "org-a", userId: "author", role: "OWNER" });
    memberRows.push({ organizationId: "org-a", userId: "reviewer", role: "AI_OFFICER" });
    templates.__set([{ id: "tpl-fria", organizationId: "org-a", name: "FRIA", sections: SECTIONS }]);
    auditLog.__set([]);
    assessments.__set([
      {
        id: "asmt-empty",
        organizationId: "org-a",
        aiSystemId: "sys-a",
        templateId: "tpl-fria",
        title: "Empty FRIA",
        type: "FRIA",
        status: "DRAFT",
        responses: {},
        createdBy: "author",
        submittedBy: null,
      },
      {
        id: "asmt-full",
        organizationId: "org-a",
        aiSystemId: "sys-a",
        templateId: "tpl-fria",
        title: "Complete FRIA",
        type: "FRIA",
        status: "IN_PROGRESS",
        responses: { q1: "A description", q2: "The processes" },
        createdBy: "author",
        submittedBy: null,
      },
      {
        id: "asmt-approved",
        organizationId: "org-a",
        aiSystemId: "sys-a",
        templateId: "tpl-fria",
        title: "Already approved",
        type: "FRIA",
        status: "APPROVED",
        responses: { q1: "A description", q2: "The processes" },
        createdBy: "author",
        submittedBy: "author",
      },
    ]);
  }

  return { db, reset, assessments, auditLog };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/server/services/licensing/entitlement", () => ({
  checkAssessmentEntitlement: async () => ({ entitled: true }),
  getEntitledAssessmentTypes: async () => ["FRIA", "CONFORMITY", "AI_RISK", "BIAS_FAIRNESS", "CUSTOM"],
}));

import { createInnerTRPCContext } from "@/server/trpc";
import { assessmentRouter } from "@/server/routers/governance/assessment";

function sessionFor(userId: string): Session {
  return {
    user: { id: userId, email: `${userId}@example.test`, name: userId },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
}

function callerFor(userId: string) {
  return assessmentRouter.createCaller(
    createInnerTRPCContext({ session: sessionFor(userId), getCookie: () => undefined })
  );
}

const ORG = "org-a";
const row = (id: string) => H.assessments.__rows().find((r) => r.id === id)!;

beforeEach(() => {
  H.reset();
});

describe("submit — completeness gate", () => {
  it("refuses an assessment whose required questions are blank", async () => {
    await expect(
      callerFor("author").submit({ organizationId: ORG, id: "asmt-empty" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(row("asmt-empty").status).toBe("DRAFT");
  });

  it("counts a whitespace-only answer as unanswered", async () => {
    Object.assign(row("asmt-empty"), { responses: { q1: "   ", q2: "\n" } });

    await expect(
      callerFor("author").submit({ organizationId: ORG, id: "asmt-empty" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts once every required question is answered, and stamps the submitter", async () => {
    await callerFor("author").submit({ organizationId: ORG, id: "asmt-full" });

    const updated = row("asmt-full");
    expect(updated.status).toBe("UNDER_REVIEW");
    expect(updated.submittedBy).toBe("author");
    expect(updated.submittedAt).toBeInstanceOf(Date);
    expect(
      H.auditLog.__rows().some((a) => a.entityId === "asmt-full" && a.action === "SUBMIT")
    ).toBe(true);
  });

  it("does not require the optional question", async () => {
    expect(row("asmt-full").responses).not.toHaveProperty("q3");
    await expect(
      callerFor("author").submit({ organizationId: ORG, id: "asmt-full" })
    ).resolves.toBeTruthy();
  });

  it("refuses to re-submit an assessment that is already approved", async () => {
    await expect(
      callerFor("author").submit({ organizationId: ORG, id: "asmt-approved" })
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(row("asmt-approved").status).toBe("APPROVED");
  });
});

describe("update — status is not client-writable", () => {
  it("ignores a status passed through update", async () => {
    await callerFor("author").update({
      organizationId: ORG,
      id: "asmt-empty",
      // Not part of the input schema any more; zod strips it.
      status: "APPROVED",
      title: "Renamed",
    } as never);

    const updated = row("asmt-empty");
    expect(updated.status).toBe("DRAFT");
    expect(updated.title).toBe("Renamed");
  });

  it("promotes a draft to in-progress when answers are saved", async () => {
    await callerFor("author").update({
      organizationId: ORG,
      id: "asmt-empty",
      responses: { q1: "Something" },
    });

    expect(row("asmt-empty").status).toBe("IN_PROGRESS");
  });

  it("refuses to edit an assessment that has already been approved", async () => {
    await expect(
      callerFor("author").update({
        organizationId: ORG,
        id: "asmt-approved",
        responses: { q1: "rewritten after the fact" },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect((row("asmt-approved").responses as Record<string, string>).q1).toBe("A description");
  });
});

describe("processApproval — separation of duties", () => {
  beforeEach(async () => {
    await callerFor("author").submit({ organizationId: ORG, id: "asmt-full" });
  });

  it("blocks the submitter from approving their own work unacknowledged", async () => {
    await expect(
      callerFor("author").processApproval({
        organizationId: ORG,
        id: "asmt-full",
        decision: "APPROVED",
      })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    expect(row("asmt-full").status).toBe("UNDER_REVIEW");
  });

  it("allows self-review when explicitly acknowledged, and records it", async () => {
    await callerFor("author").processApproval({
      organizationId: ORG,
      id: "asmt-full",
      decision: "APPROVED",
      acknowledgeSelfReview: true,
    });

    expect(row("asmt-full").status).toBe("APPROVED");
    const entry = H.auditLog.__rows().find(
      (a) => a.entityId === "asmt-full" && a.action === "APPROVE"
    );
    expect((entry?.changes as Record<string, unknown>)?.selfReview).toBe(true);
  });

  it("lets a different reviewer approve without any acknowledgement", async () => {
    await callerFor("reviewer").processApproval({
      organizationId: ORG,
      id: "asmt-full",
      decision: "APPROVED",
    });

    const updated = row("asmt-full");
    expect(updated.status).toBe("APPROVED");
    expect(updated.approvedBy).toBe("reviewer");
    const entry = H.auditLog.__rows().find(
      (a) => a.entityId === "asmt-full" && a.action === "APPROVE"
    );
    expect((entry?.changes as Record<string, unknown>)?.selfReview).toBe(false);
  });

  it("refuses to approve an assessment that is not under review", async () => {
    await expect(
      callerFor("reviewer").processApproval({
        organizationId: ORG,
        id: "asmt-empty",
        decision: "APPROVED",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(row("asmt-empty").status).toBe("DRAFT");
  });
});
