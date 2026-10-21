// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { departmentNames, departmentTree } from "./department-tree";

const DEPTS = [
  { id: "it", name: "IT", parentId: null },
  { id: "sec", name: "Security", parentId: "it" },
  { id: "apps", name: "Applications", parentId: "it" },
  { id: "hr", name: "HR", parentId: null },
  { id: "orphan", name: "Orphan", parentId: "gone" },
];

describe("department tree", () => {
  it("lists each parent followed by its children, by name", () => {
    expect(departmentTree(DEPTS).map(({ department, depth }) => `${depth}:${department.id}`)).toEqual([
      "0:hr",
      "0:it",
      "1:apps",
      "1:sec",
      "0:orphan",
    ]);
  });

  it("names chosen departments in tree order", () => {
    expect(departmentNames(DEPTS, ["sec", "hr"])).toEqual(["HR", "Security"]);
    expect(departmentNames(DEPTS, [])).toEqual([]);
  });
});
