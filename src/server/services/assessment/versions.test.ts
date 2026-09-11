// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect, vi } from "vitest";
import {
  answeredCount,
  assessmentContentHash,
  recordAssessmentVersion,
} from "./versions";

const ASSESSMENT = {
  id: "a1",
  title: "FRIA: credit scoring",
  status: "IN_PROGRESS",
  riskScore: 3,
  responses: { q1: "yes", q2: "no" },
  mitigations: { m1: "human review" },
};

/** Minimal stand-in for the two delegates the service touches. */
function fakeDb(last: { version: number; contentHash: string } | null) {
  const created: Array<Record<string, unknown>> = [];
  return {
    created,
    db: {
      aIAssessment: { findFirst: vi.fn().mockResolvedValue(ASSESSMENT) },
      aIAssessmentVersion: {
        findFirst: vi.fn().mockResolvedValue(last),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return data;
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  };
}

describe("assessment content hash", () => {
  it("ignores key order", () => {
    const a = assessmentContentHash({
      title: "t",
      responses: { b: 2, a: 1 },
      mitigations: null,
    });
    const b = assessmentContentHash({
      title: "t",
      responses: { a: 1, b: 2 },
      mitigations: null,
    });
    expect(a).toBe(b);
  });

  it("changes when an answer changes", () => {
    const a = assessmentContentHash({ title: "t", responses: { q: "yes" }, mitigations: null });
    const b = assessmentContentHash({ title: "t", responses: { q: "no" }, mitigations: null });
    expect(a).not.toBe(b);
  });

  it("changes when the title changes", () => {
    const a = assessmentContentHash({ title: "one", responses: {}, mitigations: null });
    const b = assessmentContentHash({ title: "two", responses: {}, mitigations: null });
    expect(a).not.toBe(b);
  });

  it("treats a missing answer set and an explicit null alike", () => {
    expect(
      assessmentContentHash({ title: "t", responses: undefined, mitigations: undefined }),
    ).toBe(assessmentContentHash({ title: "t", responses: null, mitigations: null }));
  });
});

describe("recordAssessmentVersion", () => {
  it("writes version 1 when there is no history", async () => {
    const { db, created } = fakeDb(null);
    const result = await recordAssessmentVersion(db, {
      organizationId: "org1",
      assessmentId: "a1",
      reason: "EDIT",
      userId: "u1",
    });
    expect(result.version).toBe(1);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ version: 1, reason: "EDIT", createdBy: "u1" });
  });

  it("writes nothing when the content is unchanged", async () => {
    const hash = assessmentContentHash(ASSESSMENT);
    const { db, created } = fakeDb({ version: 3, contentHash: hash });
    const result = await recordAssessmentVersion(db, {
      organizationId: "org1",
      assessmentId: "a1",
      reason: "EDIT",
      userId: "u1",
    });
    expect(result.version).toBeNull();
    expect(created).toHaveLength(0);
  });

  it("records an unchanged submission anyway, because the event matters", async () => {
    const hash = assessmentContentHash(ASSESSMENT);
    const { db, created } = fakeDb({ version: 3, contentHash: hash });
    const result = await recordAssessmentVersion(db, {
      organizationId: "org1",
      assessmentId: "a1",
      reason: "SUBMIT",
      userId: "u1",
      force: true,
    });
    expect(result.version).toBe(4);
    expect(created[0]).toMatchObject({ version: 4, reason: "SUBMIT" });
  });

  it("does nothing for an assessment in another organization", async () => {
    const db = {
      aIAssessment: { findFirst: vi.fn().mockResolvedValue(null) },
      aIAssessmentVersion: { findFirst: vi.fn(), create: vi.fn() },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const result = await recordAssessmentVersion(db, {
      organizationId: "other",
      assessmentId: "a1",
      reason: "EDIT",
      userId: "u1",
    });
    expect(result.version).toBeNull();
    expect(db.aIAssessmentVersion.create).not.toHaveBeenCalled();
  });
});

describe("answeredCount", () => {
  it("counts only answers with substance", () => {
    expect(answeredCount({ a: "yes", b: "", c: null, d: [], e: ["x"], f: 0 })).toBe(3);
  });

  it("handles a missing answer set", () => {
    expect(answeredCount(null)).toBe(0);
    expect(answeredCount(undefined)).toBe(0);
  });
});
