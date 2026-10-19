// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Departments in hierarchy order: each top-level department (by name) followed
 * by its children (by name), with their depth. Departments nest one level, so
 * depth is 0 or 1; a child whose parent is missing is shown at the top level.
 */
export interface TreeDepartment {
  id: string;
  name: string;
  parentId: string | null;
}

export function departmentTree<T extends TreeDepartment>(departments: readonly T[]): { department: T; depth: 0 | 1 }[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
  const ids = new Set(departments.map((d) => d.id));
  const isTop = (d: T) => !d.parentId || !ids.has(d.parentId) || d.parentId === d.id;
  const out: { department: T; depth: 0 | 1 }[] = [];
  for (const top of departments.filter(isTop).sort(byName)) {
    out.push({ department: top, depth: 0 });
    for (const child of departments.filter((d) => !isTop(d) && d.parentId === top.id).sort(byName)) {
      out.push({ department: child, depth: 1 });
    }
  }
  return out;
}

/** The names of the given departments, in hierarchy order, joined for a sentence. */
export function departmentNames(departments: readonly TreeDepartment[], ids: readonly string[]): string[] {
  const wanted = new Set(ids);
  return departmentTree(departments)
    .filter(({ department }) => wanted.has(department.id))
    .map(({ department }) => department.name);
}
