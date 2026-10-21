// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  exportStamp,
  renderManifest,
  sha256,
  stampLines,
  type ManifestEntry,
} from "./integrity";

describe("export integrity", () => {
  it("hashes the same bytes to the same digest whether string or array", () => {
    const text = "AI governance program pack";
    expect(sha256(text)).toBe(sha256(new TextEncoder().encode(text)));
    expect(sha256(text)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes the digest when a single character changes", () => {
    expect(sha256("impact assessment")).not.toBe(sha256("impact assessments"));
  });

  it("stamps the application version and every rule pack", async () => {
    const stamp = await exportStamp();
    expect(stamp.appVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(stamp.rulePacks.length).toBeGreaterThan(0);
    for (const pack of stamp.rulePacks) {
      expect(pack.version).toBeTruthy();
      // The law-reviewed date is what makes a citation checkable later.
      expect(pack.lawReviewedAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(new Date(stamp.generatedAt).toString()).not.toBe("Invalid Date");
  });

  it("counts the rule packs without a pending-sign-off note, in both languages", async () => {
    const stamp = await exportStamp();
    const en = stampLines(stamp, "en").join(" ");
    const es = stampLines(stamp, "es").join(" ");
    expect(en).toContain(`Rule packs: ${stamp.rulePacks.length}`);
    expect(es).toContain(`Paquetes de reglas: ${stamp.rulePacks.length}`);
    expect(en).not.toMatch(/pending|sign-off/i);
    expect(es).not.toMatch(/pendiente|validación/i);
    const manifest = renderManifest(stamp, [], "en") + renderManifest(stamp, [], "es");
    expect(manifest).not.toMatch(/Sign-off|Validación|pending|signed-off/);
  });

  it("lists every file with its digest in the manifest", async () => {
    const stamp = await exportStamp();
    const entries: ManifestEntry[] = [
      { name: "00-README.md", bytes: 12, sha256: sha256("readme") },
      { name: "07-ai-inventory.csv", bytes: 34, sha256: sha256("inventory") },
    ];
    const text = renderManifest(stamp, entries, "en");
    for (const e of entries) {
      expect(text).toContain(e.name);
      expect(text).toContain(e.sha256);
    }
    // The manifest must not overclaim: it evidences production, not custody.
    expect(text).toContain("does not evidence that the archive was not altered");
  });

  it("renders the Spanish manifest without falling back to English", async () => {
    const stamp = await exportStamp();
    const text = renderManifest(stamp, [{ name: "a.md", bytes: 1, sha256: sha256("a") }], "es");
    expect(text).toContain("MANIFIESTO DE INTEGRIDAD");
    expect(text).not.toContain("INTEGRITY MANIFEST");
  });
});
