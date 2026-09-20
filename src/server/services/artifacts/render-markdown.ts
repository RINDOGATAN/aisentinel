// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Markdown rendering for generated artifacts.
 *
 * Markdown is the primary format on purpose: the decision on this product is
 * that people take artifacts into their own systems of record, and Markdown
 * pastes into every one of them without losing the citations.
 */

import type { Artifact, ArtifactSection, Block } from "./types";

/**
 * The renderer's own words. Everything else in a document arrives already in
 * the reader's language; these few labels used to be English whatever the
 * document was, which is exactly the untranslated furniture that makes a
 * generated file look machine-made.
 */
type Locale = "en" | "es";

const CHROME: Record<Locale, Record<string, string>> = {
  en: {
    gap: "Gap to complete",
    obligation: "Obligation",
    calibrated: "Calibrated to",
    generated: "Generated",
    content: "content",
    lawReviewed: "law reviewed as of",
    preparedBy: "prepared by",
    riskTier: "Risk tier",
    openItems: "Open items",
    openItemsLead: "This draft is not complete. Every open item is listed under",
    openItemsSection: "What remains open",
  },
  es: {
    gap: "Apartado pendiente",
    obligation: "Obligación",
    calibrated: "Calibrado para",
    generated: "Generado el",
    content: "contenido",
    lawReviewed: "derecho revisado a fecha de",
    preparedBy: "preparado por",
    riskTier: "Nivel de riesgo",
    openItems: "Apartados abiertos",
    openItemsLead: "Este borrador no está completo. Todos los apartados abiertos se detallan en",
    openItemsSection: "Qué queda abierto",
  },
};

/**
 * Which language a document is in. The artifact does not carry the locale, and
 * adding one to every generator for the sake of six labels is worse than
 * deriving it: the disclaimer is always present and always localized.
 */
function localeOf(artifact: Artifact): Locale {
  return /asesoramiento jurídico|ayuda a la redacción/.test(artifact.disclaimer) ? "es" : "en";
}

function renderBlock(block: Block, c: Record<string, string>): string[] {
  switch (block.kind) {
    case "paragraph":
      return [block.text, ""];
    case "list":
      return [
        ...block.items.map((item, i) => (block.ordered ? `${i + 1}. ${item}` : `- ${item}`)),
        "",
      ];
    case "gap":
      return [
        `> **${c.gap}:** ${block.text}`,
        block.citations.length ? `> ${c.obligation}: ${block.citations.join("; ")}` : "",
        "",
      ].filter((line, i, arr) => !(line === "" && arr[i - 1] === ""));
    case "table":
      return [
        `| ${block.headers.join(" | ")} |`,
        `| ${block.headers.map(() => "---").join(" | ")} |`,
        // A newline inside a cell breaks a Markdown table; a long recorded
        // answer is one paragraph either way.
        ...block.rows.map((row) => `| ${row.map((cell) => cell.replace(/\s*\n+\s*/g, " ")).join(" | ")} |`),
        "",
      ];
  }
}

function renderSection(
  section: ArtifactSection,
  depth: number,
  number: string,
  c: Record<string, string>,
): string[] {
  const hashes = "#".repeat(Math.min(depth + 1, 6));
  const lines: string[] = [`${hashes} ${number} ${section.heading}`, ""];
  if (section.citations?.length) {
    lines.push(`*${section.citations.join(" · ")}*`, "");
  }
  for (const block of section.blocks) lines.push(...renderBlock(block, c));
  section.subsections?.forEach((sub, i) => {
    lines.push(...renderSection(sub, depth + 1, `${number}${i + 1}.`, c));
  });
  return lines;
}

export function renderArtifactMarkdown(artifact: Artifact): string {
  const c = CHROME[localeOf(artifact)];
  const stamp = [
    `${c.generated} ${artifact.generatedAt}`,
    `${c.content} ${artifact.contentVersion}`,
    `${c.lawReviewed} ${artifact.lawReviewedAsOf}`,
    ...(artifact.preparedBy ? [`${c.preparedBy} ${artifact.preparedBy}`] : []),
  ].join(" · ");

  const lines: string[] = [
    `# ${artifact.title}`,
    "",
    `**${artifact.systemName}** · ${artifact.organizationName}`,
    "",
    artifact.subtitle,
    "",
    ...(artifact.riskTierLabel
      ? [`${c.riskTier}: ${artifact.riskTierShape ?? ""} ${artifact.riskTierLabel}.`.trim(), ""]
      : []),
    `${c.calibrated}: ${artifact.regimes.join(", ")}.`,
    "",
    `${stamp}.`,
    "",
    `> ${artifact.disclaimer}`,
    "",
    "---",
    "",
  ];

  // Stated at the top, listed in its ordered place. A reader must see at a
  // glance that the document is incomplete; printing the same list twice in
  // one document is how a reader learns to skip both copies.
  if (artifact.gaps.length > 0) {
    lines.push(
      `## ${c.openItems} (${artifact.gaps.length})`,
      "",
      `${c.openItemsLead} "${c.openItemsSection}".`,
      "",
      "---",
      "",
    );
  }

  artifact.sections.forEach((section, i) => {
    lines.push(...renderSection(section, 1, `${i + 1}.`, c));
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
