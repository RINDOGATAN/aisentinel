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

function renderBlock(block: Block): string[] {
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
        `> **Gap to complete:** ${block.text}`,
        block.citations.length ? `> Obligation: ${block.citations.join("; ")}` : "",
        "",
      ].filter((line, i, arr) => !(line === "" && arr[i - 1] === ""));
    case "table":
      return [
        `| ${block.headers.join(" | ")} |`,
        `| ${block.headers.map(() => "---").join(" | ")} |`,
        ...block.rows.map((row) => `| ${row.join(" | ")} |`),
        "",
      ];
  }
}

function renderSection(section: ArtifactSection, depth: number, number: string): string[] {
  const hashes = "#".repeat(Math.min(depth + 1, 6));
  const lines: string[] = [`${hashes} ${number} ${section.heading}`, ""];
  if (section.citations?.length) {
    lines.push(`*${section.citations.join(" · ")}*`, "");
  }
  for (const block of section.blocks) lines.push(...renderBlock(block));
  section.subsections?.forEach((sub, i) => {
    lines.push(...renderSection(sub, depth + 1, `${number}${i + 1}.`));
  });
  return lines;
}

export function renderArtifactMarkdown(artifact: Artifact): string {
  const lines: string[] = [
    `# ${artifact.title}`,
    "",
    `**${artifact.systemName}** · ${artifact.organizationName}`,
    "",
    artifact.subtitle,
    "",
    `Calibrated to: ${artifact.regimes.join(", ")}.`,
    "",
    `Generated ${artifact.generatedAt} · content ${artifact.contentVersion} · law reviewed as of ${artifact.lawReviewedAsOf}.`,
    "",
    `> ${artifact.disclaimer}`,
    "",
    "---",
    "",
  ];

  if (artifact.gaps.length > 0) {
    lines.push(
      `## Open items (${artifact.gaps.length})`,
      "",
      "This draft is not complete. Each item below is an obligation the document cannot evidence until someone answers it.",
      "",
      ...artifact.gaps.map(
        (g) => `- **${g.section}** — ${g.text}${g.citations.length ? ` *(${g.citations.join("; ")})*` : ""}`,
      ),
      "",
      "---",
      "",
    );
  }

  artifact.sections.forEach((section, i) => {
    lines.push(...renderSection(section, 1, `${i + 1}.`));
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
