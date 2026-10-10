// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * A brand-new organisation must be writable at once. The create call returns
 * a row with no role, and the quick start read that as "no role": a read-only
 * form, and no "start from an example or blank" offer, until a reload.
 */

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import path from "path";

vi.mock("@/lib/trpc", () => ({ trpc: {} }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "unauthenticated" }) }));

const { resolveRole } = await import("./organization-context");

const read = (rel: string) => readFileSync(path.resolve(__dirname, "../..", rel), "utf8");

describe("the role in the selected organisation", () => {
  it("uses the role the selected object carries", () => {
    expect(resolveRole({ id: "a", role: "ADMIN" }, [])).toBe("ADMIN");
  });

  it("falls back to the organisation list when the selected object has no role", () => {
    expect(resolveRole({ id: "a" }, [{ id: "b", role: "VIEWER" }, { id: "a", role: "OWNER" }])).toBe("OWNER");
  });

  it("is none with nothing selected, or when the list does not know the organisation yet", () => {
    expect(resolveRole(null, [{ id: "a", role: "OWNER" }])).toBeNull();
    expect(resolveRole({ id: "new" }, [])).toBeNull();
  });

  it("is OWNER straight after creating an organisation, in both creation flows", () => {
    for (const file of [
      "src/components/governance/organization-setup.tsx",
      "src/components/governance/add-organization-dialog.tsx",
    ]) {
      expect(read(file), file).toMatch(/setOrganization\(\{ id: org\.id, name: org\.name, slug: org\.slug, role: "OWNER" \}\)/);
    }
  });
});
