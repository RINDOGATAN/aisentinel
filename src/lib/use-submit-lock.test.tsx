// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One record per submission on the create forms, and a compliance status
 * saved on click with an undo.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { useSubmitLock } from "./use-submit-lock";

describe("useSubmitLock", () => {
  it("admits one submission until released", () => {
    let lock: ReturnType<typeof useSubmitLock> | null = null;
    function Probe() {
      lock = useSubmitLock();
      return null;
    }
    renderToStaticMarkup(<Probe />);
    const l = lock as unknown as ReturnType<typeof useSubmitLock>;
    expect(l.acquire()).toBe(true);
    expect(l.acquire()).toBe(false);
    l.release();
    expect(l.acquire()).toBe(true);
  });

  const forms = ["ai-registry", "incidents", "policies", "oversight", "shadow-ai", "vendors"];
  for (const form of forms) {
    it(`locks the ${form} create form`, () => {
      const src = readFileSync(`src/app/(dashboard)/governance/${form}/new/page.tsx`, "utf8");
      expect(src).toContain("if (!lock.acquire()) return;");
      expect(src).toContain("onSettled: lock.release");
    });
  }
});

describe("compliance status", () => {
  const src = readFileSync("src/components/governance/compliance-matrix.tsx", "utf8");
  it("is saved on click, with the previous status offered back", () => {
    expect(src).toContain("onClick={() => pickStatus(value as StatusValue)}");
    expect(src).toContain('label: t("undo")');
  });
  it("keeps Save for the notes only", () => {
    expect(src).toContain('t("saveNotes")');
    expect(src).not.toMatch(/setDirty\(true\)/);
  });
});
