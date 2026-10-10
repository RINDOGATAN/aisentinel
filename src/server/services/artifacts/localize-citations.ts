// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The citation strings inside a generated document, in the document's language.
 *
 * The builder keeps citations as English free text ("EU GDPR Art. 22(3)") because
 * the scope filter (filterCitationStrings) matches on those prefixes. A Spanish
 * document then printed "EU GDPR Art. 22" and "EU AI ACT Art. 27(1)" under every
 * section. This converts them once filtering is done, at render time, with the same
 * rule the screens use (citationString: "RGPD art. 22(3)", "RIA art. 27(1)").
 * English is returned unchanged.
 */

import { citationString } from "@/config/framework-display";
import type { Artifact, ArtifactSection, Block } from "./types";

type Locale = "en" | "es";

const cite = (list: string[], locale: Locale) => list.map((c) => citationString(c, locale));

function block(b: Block, locale: Locale): Block {
  return b.kind === "gap" ? { ...b, citations: cite(b.citations, locale) } : b;
}

function section(s: ArtifactSection, locale: Locale): ArtifactSection {
  return {
    ...s,
    ...(s.citations ? { citations: cite(s.citations, locale) } : {}),
    blocks: s.blocks.map((b) => block(b, locale)),
    ...(s.subsections ? { subsections: s.subsections.map((x) => section(x, locale)) } : {}),
  };
}

export function localizeArtifactCitations(artifact: Artifact, locale: Locale): Artifact {
  if (locale !== "es") return artifact;
  return {
    ...artifact,
    sections: artifact.sections.map((s) => section(s, locale)),
    gaps: artifact.gaps.map((g) => ({ ...g, citations: cite(g.citations, locale) })),
  };
}
