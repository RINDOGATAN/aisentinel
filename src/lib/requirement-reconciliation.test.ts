// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  planRequirementReconciliation,
  REVIEW_ACTION,
  RECONCILED_ACTION,
  type MappingSnapshot,
  type ReconciliationInput,
  type ReconciliationPlan,
} from "./requirement-reconciliation";
import type { RequirementSupersession } from "../config/requirement-supersessions";

const CHANGED = "2026-07-17T19:00:38Z";
const BEFORE = new Date("2026-07-01T00:00:00Z");
const AFTER = new Date("2026-08-01T00:00:00Z");
const NOW = new Date("2026-09-11T00:00:00Z");

const retired: RequirementSupersession = {
  key: "old-to-new",
  kind: "superseded",
  fromId: "old",
  fromCode: "Art. X — 2027",
  toId: "new",
  toCode: "Art. X — 2028",
  previousTitles: [],
  changedAt: CHANGED,
  commit: "fff628f",
  reason: "deferred",
};

const reused: RequirementSupersession = {
  key: "reused-to-successor",
  kind: "repurposed",
  fromId: "reused",
  fromCode: "Art. Y — 2026",
  toId: "successor",
  toCode: "Art. Y — 2027",
  previousTitles: ["Old meaning"],
  changedAt: CHANGED,
  commit: "fff628f",
  reason: "re-used",
};

// The Art. 5(1)(d)/(h) case: two codes that swapped meanings.
const swapD: RequirementSupersession = {
  ...reused,
  key: "d-to-h",
  fromId: "d",
  fromCode: "(d)",
  toId: "h",
  toCode: "(h)",
  previousTitles: ["Old d"],
};
const swapH: RequirementSupersession = {
  ...reused,
  key: "h-to-d",
  fromId: "h",
  fromCode: "(h)",
  toId: "d",
  toCode: "(d)",
  previousTitles: ["Old h"],
};

let seq = 0;
function link(p: Partial<MappingSnapshot> & { requirementId: string }): MappingSnapshot {
  seq += 1;
  return {
    id: `m${seq}`,
    organizationId: "org1",
    aiSystemId: "sys1",
    status: "NOT_ASSESSED",
    evidence: null,
    notes: null,
    assessedBy: null,
    assessedAt: null,
    confirmedBy: null,
    confirmedAt: null,
    provenance: "USER_ENTERED",
    sourceRef: null,
    createdAt: BEFORE,
    updatedAt: BEFORE,
    evidenceItemIds: [],
    ...p,
  };
}

function worked(p: Partial<MappingSnapshot> & { requirementId: string }): MappingSnapshot {
  return link({
    status: "COMPLIANT",
    notes: "checked by counsel",
    assessedBy: "user1",
    assessedAt: BEFORE,
    ...p,
  });
}

interface State {
  entries: RequirementSupersession[];
  titles: Record<string, string>;
  requirements: { id: string; parentId: string | null }[];
  mappings: MappingSnapshot[];
  cross: { id: string; requirementAId: string; requirementBId: string }[];
  recorded: Set<string>;
  audits: { action: string; entityId: string }[];
}

function state(p: Partial<State>): State {
  return {
    entries: [retired, reused],
    titles: {},
    requirements: ["old", "new", "reused", "successor", "d", "h"].map((id) => ({ id, parentId: null })),
    mappings: [],
    cross: [],
    recorded: new Set(),
    audits: [],
    ...p,
  };
}

function plan(s: State, now = NOW): ReconciliationPlan {
  const input: ReconciliationInput = {
    entries: s.entries,
    preSeedTitles: s.titles,
    requirements: s.requirements,
    mappings: s.mappings.filter((m) =>
      s.entries.some((e) => e.fromId === m.requirementId || e.toId === m.requirementId),
    ),
    crossMappings: s.cross,
    alreadyRecorded: s.recorded,
    now,
  };
  return planRequirementReconciliation(input);
}

/** Applies a plan to the in-memory state the way the executor applies it to Postgres. */
function apply(s: State, p: ReconciliationPlan, now = NOW): State {
  const next: State = {
    ...s,
    mappings: s.mappings.map((m) => ({ ...m, evidenceItemIds: [...m.evidenceItemIds] })),
    cross: s.cross.map((c) => ({ ...c })),
    requirements: [...s.requirements],
    audits: [...s.audits],
  };
  const created = new Map<string, string>();
  const find = (id: string) => next.mappings.find((m) => m.id === id)!;
  const ops = (k: string) => p.ops.filter((o) => o.op === k);
  for (const o of ops("relink")) if (o.op === "relink") Object.assign(find(o.mappingId), { requirementId: o.toRequirementId, updatedAt: now });
  for (const o of ops("create")) {
    if (o.op !== "create") continue;
    const m = link({ organizationId: o.organizationId, aiSystemId: o.aiSystemId, requirementId: o.requirementId, ...o.work, createdAt: now, updatedAt: now });
    expect(next.mappings.some((x) => x.aiSystemId === m.aiSystemId && x.requirementId === m.requirementId), "unique (system, requirement)").toBe(false);
    next.mappings.push(m);
    created.set(o.createKey, m.id);
  }
  for (const o of ops("update")) if (o.op === "update") Object.assign(find(o.mappingId), { ...o.work, updatedAt: now });
  for (const o of ops("moveEvidence")) {
    if (o.op !== "moveEvidence") continue;
    const to = "mappingId" in o.to ? o.to.mappingId : created.get(o.to.createKey)!;
    for (const m of next.mappings) m.evidenceItemIds = m.evidenceItemIds.filter((e) => !o.evidenceIds.includes(e));
    find(to).evidenceItemIds.push(...o.evidenceIds);
  }
  for (const o of ops("deleteMapping")) if (o.op === "deleteMapping") next.mappings = next.mappings.filter((m) => m.id !== o.mappingId);
  for (const o of ops("relinkCross")) {
    if (o.op !== "relinkCross") continue;
    const c = next.cross.find((x) => x.id === o.id)!;
    if (o.side === "A") c.requirementAId = o.toRequirementId;
    else c.requirementBId = o.toRequirementId;
  }
  for (const o of ops("deleteCross")) if (o.op === "deleteCross") next.cross = next.cross.filter((c) => c.id !== o.id);
  for (const o of ops("deleteRequirement")) {
    if (o.op !== "deleteRequirement") continue;
    // Postgres cascades: anything still attached is lost. The plan must have moved it first.
    expect(next.mappings.filter((m) => m.requirementId === o.id), `links left on ${o.id}`).toEqual([]);
    next.requirements = next.requirements.filter((r) => r.id !== o.id);
  }
  for (const a of p.audits) {
    const entityId = "mappingId" in a.target ? a.target.mappingId : created.get(a.target.createKey)!;
    next.audits.push({ action: a.action, entityId });
    next.recorded = new Set([...next.recorded, entityId]);
  }
  // After a run the seed has rewritten every title to its current meaning.
  next.titles = {};
  return next;
}

function on(s: State, requirementId: string, aiSystemId = "sys1") {
  return s.mappings.find((m) => m.requirementId === requirementId && m.aiSystemId === aiSystemId);
}

function expectIdempotent(s: State) {
  const second = plan(s);
  expect(second.ops, "second run ops").toEqual([]);
  expect(second.audits, "second run audits").toEqual([]);
}

describe("retired codes", () => {
  it("moves a link to the successor, keeping its id and evidence, then deletes the row", () => {
    const m = worked({ requirementId: "old", evidenceItemIds: ["e1"] });
    const s0 = state({ mappings: [m] });
    const p = plan(s0);
    expect(p.ops).toContainEqual({ op: "relink", mappingId: m.id, toRequirementId: "new" });
    expect(p.ops).toContainEqual({ op: "deleteRequirement", id: "old" });
    const s1 = apply(s0, p);
    const moved = on(s1, "new")!;
    expect(moved.id).toBe(m.id);
    expect(moved.status).toBe("COMPLIANT");
    expect(moved.evidenceItemIds).toEqual(["e1"]);
    expect(s1.requirements.map((r) => r.id)).not.toContain("old");
    expect(p.audits.map((a) => a.action)).toEqual([RECONCILED_ACTION]);
    expectIdempotent(s1);
  });

  it("gives an empty successor link the work done on the retired one", () => {
    const old = worked({ requirementId: "old", evidence: "policy v2", evidenceItemIds: ["e1", "e2"] });
    const fresh = link({ requirementId: "new" });
    const s1 = apply(state({ mappings: [old, fresh] }), plan(state({ mappings: [old, fresh] })));
    const succ = on(s1, "new")!;
    expect(succ.id).toBe(fresh.id);
    expect(succ.status).toBe("COMPLIANT");
    expect(succ.notes).toBe("checked by counsel");
    expect(succ.evidence).toBe("policy v2");
    expect(succ.assessedBy).toBe("user1");
    expect(succ.evidenceItemIds).toEqual(["e1", "e2"]);
    expect(on(s1, "old")).toBeUndefined();
    expectIdempotent(s1);
  });

  it("never overwrites a status a person set on the successor; carries the notes instead", () => {
    const old = worked({ requirementId: "old", status: "COMPLIANT", notes: "old note", evidenceItemIds: ["e1"] });
    const succ = worked({ requirementId: "new", status: "NON_COMPLIANT", notes: "gap found" });
    const s0 = state({ mappings: [old, succ] });
    const s1 = apply(s0, plan(s0));
    const after = on(s1, "new")!;
    expect(after.status).toBe("NON_COMPLIANT");
    expect(after.notes).toContain("gap found");
    expect(after.notes).toContain('Carried over on 2026-09-11 from "Art. X — 2027" (status COMPLIANT)');
    expect(after.notes).toContain("old note");
    expect(after.evidenceItemIds).toEqual(["e1"]);
    expectIdempotent(s1);
  });

  it("removes an empty duplicate without touching the successor", () => {
    const old = link({ requirementId: "old" });
    const succ = worked({ requirementId: "new" });
    const s0 = state({ mappings: [old, succ] });
    const p = plan(s0);
    expect(p.ops.filter((o) => o.op === "update")).toEqual([]);
    const s1 = apply(s0, p);
    expect(on(s1, "new")).toEqual(succ);
    expectIdempotent(s1);
  });

  it("re-points cross-framework mappings, dropping one whose successor pair exists", () => {
    const s0 = state({
      cross: [
        { id: "c1", requirementAId: "old", requirementBId: "nist-1" },
        { id: "c2", requirementAId: "iso-1", requirementBId: "old" },
        { id: "c3", requirementAId: "iso-1", requirementBId: "new" },
      ],
    });
    const s1 = apply(s0, plan(s0));
    expect(s1.cross).toEqual([
      { id: "c1", requirementAId: "new", requirementBId: "nist-1" },
      { id: "c3", requirementAId: "iso-1", requirementBId: "new" },
    ]);
  });

  it("handles every system and organisation independently", () => {
    const a = worked({ requirementId: "old", aiSystemId: "sysA", organizationId: "orgA" });
    const b = link({ requirementId: "old", aiSystemId: "sysB", organizationId: "orgB" });
    const bSucc = link({ requirementId: "new", aiSystemId: "sysB", organizationId: "orgB" });
    const s0 = state({ mappings: [a, b, bSucc] });
    const s1 = apply(s0, plan(s0));
    expect(on(s1, "new", "sysA")!.status).toBe("COMPLIANT");
    expect(on(s1, "new", "sysA")!.organizationId).toBe("orgA");
    expect(on(s1, "new", "sysB")!.id).toBe(bSucc.id);
    expect(s1.mappings.filter((m) => m.requirementId === "old")).toEqual([]);
    expectIdempotent(s1);
  });

  it("skips an entry whose successor is missing, deleting nothing", () => {
    const m = worked({ requirementId: "old" });
    const s0 = state({ mappings: [m], requirements: [{ id: "old", parentId: null }, { id: "reused", parentId: null }, { id: "successor", parentId: null }] });
    const p = plan(s0);
    expect(p.ops).toEqual([]);
    expect(p.warnings.join()).toContain("does not exist");
  });

  it("does nothing when the retired row was never seeded", () => {
    const s0 = state({ requirements: [{ id: "new", parentId: null }, { id: "successor", parentId: null }, { id: "reused", parentId: null }] });
    expect(plan(s0)).toEqual({ ops: [], audits: [], log: [], warnings: [] });
  });

  it("deletes a retired child before its retired parent, and keeps a parent with a live child", () => {
    const parent: RequirementSupersession = { ...retired, key: "p", fromId: "p-old", fromCode: "Art. 62", toId: "new" };
    const child: RequirementSupersession = { ...retired, key: "c", fromId: "c-old", fromCode: "Art. 62(1)", toId: "new" };
    const reqs = [
      { id: "p-old", parentId: null },
      { id: "c-old", parentId: "p-old" },
      { id: "new", parentId: null },
    ];
    const deletes = plan(state({ entries: [parent, child], requirements: reqs })).ops.filter((o) => o.op === "deleteRequirement");
    expect(deletes).toEqual([
      { op: "deleteRequirement", id: "c-old" },
      { op: "deleteRequirement", id: "p-old" },
    ]);
    const kept = plan(state({ entries: [parent], requirements: reqs }));
    expect(kept.ops.filter((o) => o.op === "deleteRequirement")).toEqual([]);
    expect(kept.warnings.join()).toContain("children not listed");
  });
});

describe("re-used codes", () => {
  const only = (p: Partial<State>) => state({ entries: [reused], ...p });
  it("moves the work of a link made under the old meaning, leaving an empty link behind", () => {
    const m = worked({ requirementId: "reused", evidenceItemIds: ["e1"], updatedAt: AFTER });
    const s0 = only({ mappings: [m], titles: { reused: "Old meaning" } });
    const s1 = apply(s0, plan(s0));
    const succ = on(s1, "successor")!;
    expect(succ.status).toBe("COMPLIANT");
    expect(succ.notes).toBe("checked by counsel");
    expect(succ.evidenceItemIds).toEqual(["e1"]);
    const left = on(s1, "reused")!;
    expect(left.id).toBe(m.id);
    expect(left.status).toBe("NOT_ASSESSED");
    expect(left.notes).toBeNull();
    expect(left.assessedBy).toBeNull();
    expect(left.evidenceItemIds).toEqual([]);
    expect(s1.requirements.map((r) => r.id)).toContain("reused");
    expectIdempotent(s1);
  });

  it("treats a link untouched since before the change as old meaning, even after re-seeding", () => {
    const m = worked({ requirementId: "reused" });
    const s0 = only({ mappings: [m], titles: { reused: "New meaning" } });
    const s1 = apply(s0, plan(s0));
    expect(on(s1, "successor")!.status).toBe("COMPLIANT");
    expect(on(s1, "reused")!.status).toBe("NOT_ASSESSED");
    expectIdempotent(s1);
  });

  it("gives a system with an empty old-meaning link an empty successor link, once", () => {
    const m = link({ requirementId: "reused" });
    const s0 = only({ mappings: [m] });
    const p = plan(s0);
    const create = p.ops.find((o) => o.op === "create");
    expect(create).toMatchObject({ requirementId: "successor", work: { status: "NOT_ASSESSED", provenance: "AUTO_RULE" } });
    const s1 = apply(s0, p);
    expect(on(s1, "reused")).toEqual(m);
    expectIdempotent(s1);
  });

  it("leaves alone a link made after the change", () => {
    const m = worked({ requirementId: "reused", createdAt: AFTER, updatedAt: AFTER });
    const s0 = only({ mappings: [m] });
    expect(plan(s0)).toEqual({ ops: [], audits: [], log: [], warnings: [] });
  });

  it("flags, once and without moving it, a link made before the change but edited after", () => {
    const m = worked({ requirementId: "reused", updatedAt: AFTER, assessedAt: AFTER });
    const s0 = only({ mappings: [m], titles: { reused: "New meaning" } });
    const p = plan(s0);
    expect(p.ops).toEqual([]);
    expect(p.audits).toEqual([expect.objectContaining({ action: REVIEW_ACTION, target: { mappingId: m.id } })]);
    const s1 = apply(s0, p);
    expect(on(s1, "reused")).toEqual(m);
    expectIdempotent(s1);
  });

  it("does not overwrite a status already set on the successor", () => {
    const m = worked({ requirementId: "reused", status: "COMPLIANT", notes: "old" });
    const succ = worked({ requirementId: "successor", status: "PARTIALLY_COMPLIANT", notes: "current", createdAt: AFTER, updatedAt: AFTER });
    const s0 = only({ mappings: [m, succ] });
    const s1 = apply(s0, plan(s0));
    expect(on(s1, "successor")!.status).toBe("PARTIALLY_COMPLIANT");
    expect(on(s1, "successor")!.notes).toContain("a code that now refers to a different obligation");
    expect(on(s1, "reused")!.status).toBe("NOT_ASSESSED");
    expectIdempotent(s1);
  });

  it("resolves a swap of meanings from one snapshot", () => {
    const d = worked({ requirementId: "d", status: "NON_COMPLIANT", notes: "about d-old", evidenceItemIds: ["ed"] });
    const h = worked({ requirementId: "h", status: "COMPLIANT", notes: "about h-old", evidenceItemIds: ["eh"] });
    const s0 = state({ entries: [swapD, swapH], mappings: [d, h], titles: { d: "Old d", h: "Old h" } });
    const s1 = apply(s0, plan(s0));
    // What was said about the old (d) now sits on (h), and the reverse.
    expect(on(s1, "h")).toMatchObject({ id: h.id, status: "NON_COMPLIANT", notes: "about d-old", evidenceItemIds: ["ed"] });
    expect(on(s1, "d")).toMatchObject({ id: d.id, status: "COMPLIANT", notes: "about h-old", evidenceItemIds: ["eh"] });
    expectIdempotent(s1);
  });

  it("resolves a swap where only one side carries work", () => {
    const d = worked({ requirementId: "d" });
    const h = link({ requirementId: "h" });
    const s0 = state({ entries: [swapD, swapH], mappings: [d, h], titles: { d: "Old d", h: "Old h" } });
    const s1 = apply(s0, plan(s0));
    expect(on(s1, "h")!.status).toBe("COMPLIANT");
    expect(on(s1, "d")!.status).toBe("NOT_ASSESSED");
    expectIdempotent(s1);
  });
});

describe("the reported case: a v0.3.0 install upgraded", () => {
  it("ends with the links a fresh install would have, and does nothing on the next boot", () => {
    // The restored backup: one system classified 2026-07-17 16:25 UTC, before
    // fff628f was committed, with empty auto-mapped links on both rows.
    const at = new Date("2026-07-17T16:25:07Z");
    const onOld = link({ requirementId: "old", createdAt: at, updatedAt: at });
    const onReused = link({ requirementId: "reused", createdAt: at, updatedAt: at });
    const s0 = state({ mappings: [onOld, onReused], titles: { reused: "New meaning" } });
    const s1 = apply(s0, plan(s0));
    expect(s1.mappings.map((m) => m.requirementId).sort()).toEqual(["new", "reused", "successor"]);
    expect(s1.requirements.map((r) => r.id)).not.toContain("old");
    expectIdempotent(s1);
  });
});
