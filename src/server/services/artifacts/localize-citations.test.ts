// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { localizeArtifactCitations } from "./localize-citations";
import { renderArtifactMarkdown } from "./render-markdown";
import type { Artifact } from "./types";

function artifact(disclaimer: string): Artifact {
  return {
    kind: "assessment",
    title: "T",
    subtitle: "S",
    organizationName: "O",
    systemName: "Sys",
    generatedAt: "2026-10-10",
    contentVersion: "1",
    lawReviewedAsOf: "2026-09-08",
    disclaimer,
    regimes: ["RGPD"],
    sections: [
      {
        heading: "Datos",
        citations: ["EU GDPR Art. 30", "EU AI ACT Art. 10(2)", "NIST AI RMF MAP 4"],
        blocks: [{ kind: "gap", text: "Falta la base jurídica", citations: ["EU GDPR Art. 6", "EU AI Act Art. 50(1)"] }],
      },
    ],
    gaps: [{ section: "Datos", text: "Falta la base jurídica", citations: ["EU GDPR Art. 6"] }],
  };
}

const ES_DISCLAIMER = "Esto es una ayuda a la redacción, no asesoramiento jurídico.";
const EN_DISCLAIMER = "This is a drafting aid, not legal advice.";

describe("citations in generated documents", () => {
  it("are Spanish in a Spanish document", () => {
    const out = localizeArtifactCitations(artifact(ES_DISCLAIMER), "es");
    expect(out.sections[0].citations).toEqual(["RGPD art. 30", "RIA art. 10(2)", "NIST AI RMF MAP 4"]);
    const gap = out.sections[0].blocks[0];
    expect(gap.kind === "gap" && gap.citations).toEqual(["RGPD art. 6", "RIA art. 50(1)"]);
    expect(out.gaps[0].citations).toEqual(["RGPD art. 6"]);
  });

  it("are unchanged in English", () => {
    const a = artifact(EN_DISCLAIMER);
    expect(localizeArtifactCitations(a, "en")).toBe(a);
  });

  it("reach the Spanish Markdown", () => {
    const md = renderArtifactMarkdown(artifact(ES_DISCLAIMER));
    expect(md).toContain("*RGPD art. 30 · RIA art. 10(2) · NIST AI RMF MAP 4*");
    expect(md).toContain("> Obligación: RGPD art. 6; RIA art. 50(1)");
    expect(md).not.toMatch(/EU GDPR|EU AI ACT/i);
  });
});
