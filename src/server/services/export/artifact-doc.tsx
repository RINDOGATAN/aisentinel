// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The generated artifacts as a PDF that stands on its own.
 *
 * Read as a stranger would, with no access to the screen it came from, the file
 * has to answer, in this order: what was assessed and for whom; when and by
 * whom; the method and its version; the inputs given; the findings, with the
 * risk tier shown by shape and label and never by colour alone; the references
 * behind each finding, cited to the article; what remains open; and what the
 * document is not. The order is the artifact's own section order
 * (build-artifacts.ts); this file only draws it.
 *
 * Markdown stays the primary format, because an artifact is meant to be taken
 * into the organisation's own systems of record. The PDF is for the reader who
 * receives the document rather than re-uses it: a regulator, a client, a board.
 *
 * No i18n here. Every string arrives already in the reader's language, on the
 * artifact, which is how the generators keep page and document from diverging.
 */

import React from "react";
import { Document, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Artifact, ArtifactSection, Block } from "@/server/services/artifacts/types";
import {
  registerReportFonts,
  tokens,
  CoverFrame,
  PageFrame,
  SectionHeading,
  TierPill,
  ConfidentialPill,
} from "./design-system";
import { TIER_SURFACES } from "@/config/risk-tier-palette";

const s = StyleSheet.create({
  coverTitle: {
    fontSize: tokens.typography.size.display,
    fontWeight: tokens.typography.weight.bold,
    letterSpacing: tokens.typography.letterSpacing.tight,
    color: tokens.color.text.primary,
    marginTop: tokens.space[9],
  },
  coverSystem: {
    fontSize: tokens.typography.size.h2,
    fontWeight: tokens.typography.weight.medium,
    color: tokens.color.text.secondary,
    marginTop: tokens.space[4],
  },
  coverOrg: {
    fontSize: tokens.typography.size.bodyLg,
    color: tokens.color.text.muted,
    marginTop: tokens.space[2],
  },
  coverSubtitle: {
    fontSize: tokens.typography.size.body,
    lineHeight: tokens.typography.lineHeight.relaxed,
    color: tokens.color.text.secondary,
    marginTop: tokens.space[7],
    maxWidth: 400,
  },
  coverTierRow: { marginTop: tokens.space[7], flexDirection: "row" },
  coverFacts: { marginTop: tokens.space[7] },
  coverFactRow: { flexDirection: "row", marginBottom: 3 },
  coverFactLabel: {
    width: 150,
    fontSize: tokens.typography.size.caption,
    color: tokens.color.text.muted,
    textTransform: "uppercase",
    letterSpacing: tokens.typography.letterSpacing.caps,
  },
  coverFactValue: {
    flex: 1,
    fontSize: tokens.typography.size.caption,
    color: tokens.color.text.primary,
  },
  coverDisclaimer: {
    marginTop: tokens.space[7],
    fontSize: tokens.typography.size.micro,
    lineHeight: tokens.typography.lineHeight.relaxed,
    color: tokens.color.text.muted,
    maxWidth: 420,
  },
  coverFooter: { marginTop: tokens.space[6], flexDirection: "row" },

  // ── Body ──
  paragraph: {
    fontSize: tokens.typography.size.body,
    lineHeight: tokens.typography.lineHeight.relaxed,
    color: tokens.color.text.primary,
    marginBottom: tokens.space[4],
  },
  bold: { fontWeight: tokens.typography.weight.semibold },
  citationLine: {
    fontSize: tokens.typography.size.micro,
    color: tokens.color.text.muted,
    marginBottom: tokens.space[4],
  },
  bullet: {
    fontSize: tokens.typography.size.body,
    lineHeight: tokens.typography.lineHeight.normal,
    color: tokens.color.text.secondary,
    marginBottom: 2,
    marginLeft: tokens.space[4],
  },
  // A gap is a visible block, not an omission: a left bar, a label, the
  // obligation it would have evidenced.
  gapBlock: {
    borderLeftWidth: 3,
    borderLeftColor: tokens.color.semantic.warning.solid,
    backgroundColor: tokens.color.surface.subtle,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    marginBottom: tokens.space[4],
  },
  gapLabel: {
    fontSize: tokens.typography.size.micro,
    fontWeight: tokens.typography.weight.bold,
    textTransform: "uppercase",
    letterSpacing: tokens.typography.letterSpacing.caps,
    color: tokens.color.text.muted,
    marginBottom: 2,
  },
  gapText: {
    fontSize: tokens.typography.size.caption,
    lineHeight: tokens.typography.lineHeight.normal,
    color: tokens.color.text.primary,
  },
  gapCitation: {
    fontSize: tokens.typography.size.micro,
    color: tokens.color.text.muted,
    marginTop: 3,
  },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border.rule,
    paddingBottom: tokens.space[2],
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: tokens.space[2],
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.color.border.hairline,
  },
  tableRowAlt: { backgroundColor: TIER_SURFACES.light.altRow },
  tableCellHead: {
    fontSize: tokens.typography.size.micro,
    fontWeight: tokens.typography.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: tokens.typography.letterSpacing.caps,
    color: tokens.color.text.muted,
    paddingRight: tokens.space[3],
  },
  tableCell: {
    fontSize: tokens.typography.size.caption,
    lineHeight: tokens.typography.lineHeight.normal,
    color: tokens.color.text.secondary,
    paddingRight: tokens.space[3],
  },
  tableWrap: { marginBottom: tokens.space[5] },
});

/**
 * `**bold**` runs inside a generated paragraph, rendered as bold rather than
 * printed with their asterisks. The generators mark the question a paragraph
 * answers this way; asterisks on a page are the mark of a document that was
 * written for one format and printed in another.
 */
function inlineRuns(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <Text key={i} style={s.bold}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      <Text key={i}>{part}</Text>
    ),
  );
}

/** Even column widths, except a three-column table, whose last column is wider. */
function columnFlex(count: number, index: number): number {
  if (count === 3) return [1.1, 1.6, 1.3][index] ?? 1;
  if (count === 2) return [1, 2][index] ?? 1;
  return 1;
}

function renderBlock(block: Block, key: string, chrome: Chrome): React.ReactNode {
  switch (block.kind) {
    case "paragraph":
      return (
        <Text key={key} style={s.paragraph}>
          {inlineRuns(block.text)}
        </Text>
      );
    case "list":
      return (
        <View key={key} style={{ marginBottom: tokens.space[4] }}>
          {block.items.map((item, i) => (
            <Text key={i} style={s.bullet}>
              {block.ordered ? `${i + 1}.  ${item}` : `•  ${item}`}
            </Text>
          ))}
        </View>
      );
    case "gap":
      return (
        <View key={key} style={s.gapBlock} wrap={false}>
          <Text style={s.gapLabel}>{chrome.gapLabel}</Text>
          <Text style={s.gapText}>{block.text}</Text>
          {block.citations.length > 0 && (
            <Text style={s.gapCitation}>{`${chrome.obligationLabel}: ${block.citations.join("; ")}`}</Text>
          )}
        </View>
      );
    case "table":
      return (
        <View key={key} style={s.tableWrap}>
          <View style={s.tableHead}>
            {block.headers.map((header, i) => (
              <Text
                key={i}
                style={[s.tableCellHead, { flex: columnFlex(block.headers.length, i) }]}
              >
                {header}
              </Text>
            ))}
          </View>
          {block.rows.map((row, r) => (
            <View key={r} style={r % 2 === 1 ? [s.tableRow, s.tableRowAlt] : s.tableRow} wrap={false}>
              {row.map((cell, i) => (
                <Text key={i} style={[s.tableCell, { flex: columnFlex(row.length, i) }]}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
  }
}

function renderSection(
  section: ArtifactSection,
  number: string,
  level: 2 | 3,
  chrome: Chrome,
): React.ReactNode[] {
  const out: React.ReactNode[] = [
    <SectionHeading key={`h-${number}`} title={`${number} ${section.heading}`} level={level} />,
  ];
  if (section.citations?.length) {
    out.push(
      <Text key={`c-${number}`} style={s.citationLine}>
        {section.citations.join("  ·  ")}
      </Text>,
    );
  }
  section.blocks.forEach((block, i) => out.push(renderBlock(block, `${number}-${i}`, chrome)));
  section.subsections?.forEach((sub, i) => {
    out.push(...renderSection(sub, `${number}${i + 1}.`, 3, chrome));
  });
  return out;
}

/**
 * The handful of words the drawing itself needs. They are not on the artifact
 * because Markdown renders the same ideas as blockquote furniture, so they are
 * passed in from the caller in the reader's language.
 */
export interface Chrome {
  gapLabel: string;
  obligationLabel: string;
  preparedByLabel: string;
  generatedLabel: string;
  methodLabel: string;
  lawReviewedLabel: string;
  calibratedLabel: string;
  openItemsLabel: string;
  riskTierLabel: string;
  notRecorded: string;
  confidential: string;
  eyebrow: string;
}

export const ARTIFACT_CHROME: Record<"en" | "es", Chrome> = {
  en: {
    gapLabel: "Gap to complete",
    obligationLabel: "Obligation",
    preparedByLabel: "Prepared by",
    generatedLabel: "Generated",
    methodLabel: "Method version",
    lawReviewedLabel: "Law reviewed as of",
    calibratedLabel: "Calibrated to",
    openItemsLabel: "Open items",
    riskTierLabel: "Risk tier",
    notRecorded: "Not recorded",
    confidential: "Confidential",
    eyebrow: "Generated document",
  },
  es: {
    gapLabel: "Apartado pendiente",
    obligationLabel: "Obligación",
    preparedByLabel: "Preparado por",
    generatedLabel: "Generado el",
    methodLabel: "Versión del método",
    lawReviewedLabel: "Derecho revisado a fecha de",
    calibratedLabel: "Calibrado para",
    openItemsLabel: "Apartados abiertos",
    riskTierLabel: "Nivel de riesgo",
    notRecorded: "No consta",
    confidential: "Confidencial",
    eyebrow: "Documento generado",
  },
};

/**
 * One section per page group. Sections are drawn in the artifact's order onto
 * continuous pages: a section that does not fill a page does not get a blank
 * one, and a long section flows.
 */
export function renderArtifactDocument({
  artifact,
  chrome,
  locale,
}: {
  artifact: Artifact;
  chrome: Chrome;
  locale: "en" | "es";
}) {
  registerReportFonts();

  const facts: [string, string][] = [
    [chrome.generatedLabel, artifact.generatedAt],
    [chrome.preparedByLabel, artifact.preparedBy ?? chrome.notRecorded],
    [chrome.methodLabel, artifact.contentVersion],
    [chrome.lawReviewedLabel, artifact.lawReviewedAsOf],
    [chrome.calibratedLabel, artifact.regimes.join(", ")],
    [chrome.openItemsLabel, String(artifact.gaps.length)],
  ];

  return (
    <Document
      title={`${artifact.title} — ${artifact.systemName}`}
      author="AI SENTINEL"
      subject={artifact.subtitle}
      language={locale}
    >
      <CoverFrame rightEyebrow={chrome.eyebrow}>
        <Text style={s.coverTitle}>{artifact.title}</Text>
        <Text style={s.coverSystem}>{artifact.systemName}</Text>
        <Text style={s.coverOrg}>{artifact.organizationName}</Text>

        {artifact.riskTierLabel && (
          <View style={s.coverTierRow}>
            <TierPill level={artifact.riskTier}>
              {`${chrome.riskTierLabel}: ${artifact.riskTierLabel}`}
            </TierPill>
          </View>
        )}

        <Text style={s.coverSubtitle}>{artifact.subtitle}</Text>

        <View style={s.coverFacts}>
          {facts.map(([label, value]) => (
            <View key={label} style={s.coverFactRow}>
              <Text style={s.coverFactLabel}>{label}</Text>
              <Text style={s.coverFactValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={s.coverDisclaimer}>{artifact.disclaimer}</Text>
        <View style={s.coverFooter}>
          <ConfidentialPill label={chrome.confidential} />
        </View>
      </CoverFrame>

      <PageFrame
        eyebrow={chrome.eyebrow}
        orgName={artifact.organizationName}
        date={artifact.generatedAt}
        disclaimer={artifact.disclaimer}
      >
        {artifact.sections.flatMap((section, i) =>
          renderSection(section, `${i + 1}.`, 2, chrome),
        )}
      </PageFrame>
    </Document>
  );
}
