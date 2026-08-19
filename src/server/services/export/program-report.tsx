// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AI Governance Program report — the exportable counterpart of the
 * /governance/program page. First bilingual PDF in the app: all chrome
 * strings come from the `programReport` namespace of the shared next-intl
 * message files (EN/ES parity enforced by src/i18n/messages/parity.test.ts),
 * and all program data arrives pre-localized from
 * src/server/services/program/program-data.ts — the same module the tRPC
 * router uses, so page and PDF cannot diverge.
 *
 * The map pages consume the same computeProgramMapLayout as the interactive
 * page (compact metrics), paginated along lane boundaries.
 */

import React from "react";
import { Document, View, Text, StyleSheet } from "@react-pdf/renderer";
import { createTranslator } from "next-intl";
import type { ContentLocale } from "@/config/lawfirm-ai-toolkit";
import type { ProgramGraph, ProgramMapLayout } from "@/lib/program-map/types";
import {
  computeProgramMapLayout,
  paginateProgramGraph,
} from "@/lib/program-map/layout";
import type { ProgramScorecardData } from "@/server/services/program/program-data";
import {
  registerReportFonts,
  tokens,
  CoverFrame,
  PageFrame,
  SectionHeading,
  StatTile,
  StatTileRow,
  PillBadge,
  MiniCoverageBar,
  ConfidentialPill,
  DonutChart,
  StackedBar,
  RadarChart,
  type SemanticTone,
} from "./design-system";
import { ProgramMapSvg } from "./design-system/charts/ProgramMapSvg";
import { rulePackList } from "@/config/rule-pack-versions";

// ── Map page geometry ───────────────────────────────────────────────
// A4 landscape ≈ 842×595pt; PageFrame margins 48/48/56 + header/footer rows.
const MAP_USABLE_W = 842 - 48 - 48;
const MAP_USABLE_H = 595 - 48 - 56 - 34 - 28;
const LAYOUT_W = 1160;
const MAP_SCALE = MAP_USABLE_W / LAYOUT_W;
/** fixed allowances so heading (first page) and legend (last page) never push the Svg to a continuation page */
const MAP_HEADING_H = 44;
const MAP_LEGEND_H = 30;
/** height budget expressed in layout units (worst case: heading + legend on the same page) */
const MAP_HEIGHT_BUDGET =
  (MAP_USABLE_H - MAP_HEADING_H - MAP_LEGEND_H) / MAP_SCALE;

const s = StyleSheet.create({
  coverTitle: {
    fontSize: tokens.typography.size.display,
    fontWeight: tokens.typography.weight.bold,
    letterSpacing: tokens.typography.letterSpacing.tight,
    color: tokens.color.text.primary,
    marginTop: tokens.space[10],
  },
  coverOrg: {
    fontSize: tokens.typography.size.h2,
    fontWeight: tokens.typography.weight.medium,
    color: tokens.color.text.secondary,
    marginTop: tokens.space[4],
  },
  coverDate: {
    fontSize: tokens.typography.size.bodyLg,
    color: tokens.color.text.muted,
    marginTop: tokens.space[3],
    marginBottom: tokens.space[9],
  },
  coverLead: {
    fontSize: tokens.typography.size.bodyLg,
    lineHeight: tokens.typography.lineHeight.relaxed,
    color: tokens.color.text.secondary,
    marginTop: tokens.space[8],
    maxWidth: 380,
  },
  coverFooter: {
    // Flowed (not absolute): the pill can never overlap the lead paragraph
    marginTop: 28,
    flexDirection: "row",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: tokens.space[4],
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: tokens.space[6],
    marginBottom: tokens.space[2],
  },
  legendSwatch: {
    width: 8,
    height: 8,
    marginRight: tokens.space[2],
  },
  legendText: {
    fontSize: tokens.typography.size.micro,
    color: tokens.color.text.muted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.space[2],
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.color.border.hairline,
  },
  cellName: { flex: 2.2, fontSize: tokens.typography.size.body, fontWeight: 500 },
  cellPlain: {
    flex: 1.2,
    fontSize: tokens.typography.size.caption,
    color: tokens.color.text.secondary,
  },
  cellSmall: {
    flex: 0.7,
    fontSize: tokens.typography.size.caption,
    color: tokens.color.text.secondary,
  },
  cellBadge: { flex: 1 },
  cellBar: { flex: 1.4 },
  colHead: {
    fontSize: tokens.typography.size.micro,
    fontWeight: 600,
    color: tokens.color.text.muted,
    textTransform: "uppercase",
    letterSpacing: tokens.typography.letterSpacing.caps,
  },
  planBlock: {
    marginBottom: tokens.space[6],
    padding: tokens.space[5],
    backgroundColor: tokens.color.surface.subtle,
    borderLeftWidth: 3,
  },
  planBucket: {
    fontSize: tokens.typography.size.micro,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: tokens.typography.letterSpacing.caps,
    color: tokens.color.text.muted,
    marginBottom: tokens.space[3],
  },
  planItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: tokens.space[1],
  },
  planTitle: {
    fontSize: tokens.typography.size.body,
    fontWeight: 600,
    marginRight: tokens.space[3],
  },
  planDetail: {
    fontSize: tokens.typography.size.caption,
    color: tokens.color.text.secondary,
    marginBottom: tokens.space[3],
    lineHeight: tokens.typography.lineHeight.normal,
  },
  rolloutCard: {
    marginBottom: tokens.space[5],
    padding: tokens.space[5],
    borderWidth: 0.5,
    borderColor: tokens.color.border.hairline,
  },
  rolloutHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: tokens.space[3],
  },
  rolloutLabel: { fontSize: tokens.typography.size.h4, fontWeight: 600 },
  rolloutSummary: {
    fontSize: tokens.typography.size.caption,
    color: tokens.color.text.secondary,
    lineHeight: tokens.typography.lineHeight.normal,
    marginBottom: tokens.space[3],
  },
  bullet: {
    fontSize: tokens.typography.size.caption,
    color: tokens.color.text.secondary,
    marginBottom: tokens.space[1],
  },
  dutyBlock: {
    marginBottom: tokens.space[6],
  },
  dutyLabel: { fontSize: tokens.typography.size.h4, fontWeight: 600, marginBottom: tokens.space[2] },
  dutyDescription: {
    fontSize: tokens.typography.size.caption,
    color: tokens.color.text.secondary,
    lineHeight: tokens.typography.lineHeight.normal,
    marginBottom: tokens.space[3],
  },
  controlRow: { flexDirection: "row", flexWrap: "wrap" },
  controlItem: { marginRight: tokens.space[3], marginBottom: tokens.space[2] },
  annexText: {
    fontSize: tokens.typography.size.caption,
    color: tokens.color.text.secondary,
    lineHeight: tokens.typography.lineHeight.relaxed,
    marginBottom: tokens.space[4],
  },
  annexMono: {
    fontSize: tokens.typography.size.micro,
    color: tokens.color.text.secondary,
    marginBottom: tokens.space[1],
  },
  radarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: tokens.space[6],
  },
  dimsCol: { flex: 1, marginLeft: tokens.space[7] },
  // ── Methodology annex ──
  annexTableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border.rule,
    paddingBottom: tokens.space[2],
    marginBottom: tokens.space[2],
  },
  annexRow: {
    flexDirection: "row",
    paddingVertical: tokens.space[1],
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.color.border.hairline,
  },
  annexCell: {
    fontSize: tokens.typography.size.micro,
    color: tokens.color.text.secondary,
  },
  annexCellHead: {
    fontSize: tokens.typography.size.micro,
    color: tokens.color.text.primary,
    fontFamily: "Inter",
    fontWeight: 600,
  },
  annexNote: {
    fontSize: tokens.typography.size.micro,
    color: tokens.color.text.muted,
    lineHeight: tokens.typography.lineHeight.relaxed,
    marginTop: tokens.space[3],
  },
  annexKeyLine: {
    fontSize: tokens.typography.size.caption,
    color: tokens.color.text.primary,
    lineHeight: tokens.typography.lineHeight.relaxed,
    marginBottom: tokens.space[3],
  },
});

/** Column widths for the annex tables (flex units). */
const DERIVATION_COLS = [2.4, 1, 1.2, 1.4, 0.9];
const RULE_PACK_COLS = [2.4, 1.2, 1.4, 1.2];

const RISK_TONE: Record<string, SemanticTone> = {
  UNACCEPTABLE: "danger",
  HIGH: "danger",
  LIMITED: "warning",
  MINIMAL: "success",
};
const STAGE_TONE: Record<string, SemanticTone> = {
  ADOPT: "success",
  PILOT: "info",
  RESTRICT: "warning",
  HOLD: "danger",
};
const SEVERITY_TONE: Record<string, SemanticTone> = {
  critical: "danger",
  high: "warning",
  medium: "info",
};
const SEVERITY_COLOR: Record<string, string> = {
  critical: tokens.color.semantic.danger.solid,
  high: tokens.color.semantic.warning.solid,
  medium: tokens.color.semantic.info.solid,
};
const DUTY_STATUS_TONE: Record<string, SemanticTone> = {
  inPlace: "success",
  partial: "warning",
  missing: "danger",
  recommended: "info",
};

// Methodology lines for the annex — mirrors maturity.ts JSDoc verbatim.
const DIMENSION_FORMULAS: Array<[string, string]> = [
  ["inventory", "40·(any systems) + 30·(withOwner/total) + 30·(withPurpose/total)"],
  ["classification", "100·(classified/total)"],
  ["oversight", "100·(0.6·withGate/needingGate + 0.4·passed/gatesTotal) − 10·min(overdue,3)"],
  ["policies", "50·(coreTypes/6) + 25·(active/policies) + 25·(systemsLinked/systems)"],
  ["compliance", "50·(assessed/mappings) + 50·((compliant + 0.5·partial)/mappings)"],
  ["transparency", "100·(withProfile/relevant) − 15·min(markingOverdue,3)"],
  ["vendorRisk", "50·(systemsWithVendor/systems) + 50·(vendorsAssessed/vendors)"],
  ["shadowAi", "100·(triaged/reports)"],
];
const NIST_MAPPING: Array<[string, string, number]> = [
  ["GOVERN", "policies 0.6 · shadowAi 0.4", 80],
  ["MAP", "inventory 0.4 · classification 0.35 · vendorRisk 0.25", 85],
  ["MEASURE", "compliance 0.6 · transparency 0.4", 75],
  ["MANAGE", "oversight 1.0", 75],
];

/**
 * Provenance breakdown for the derivation table. Absent when confirmation
 * tracking is not enabled — rendered as an explicit "not yet enabled" line
 * rather than as zeros, because a fabricated 0% is worse than no number.
 */
export interface DerivationSummary {
  byClass: {
    id: string;
    total: number;
    autoDerived: number;
    confirmed: number;
  }[];
  weightedPct: number;
}

/** Snapshot identity + trend, stamped into the annex by the export route. */
export interface SnapshotContext {
  id: string;
  payloadHash: string;
  capturedAt: string;
  previous?: {
    id: string;
    capturedAt: string;
    overallDelta: number;
    dimensionDeltas: { id: string; delta: number }[];
    gapsClosed: string[];
    gapsOpened: string[];
    rulePackChanges: { pack: string; from: string | null; to: string | null }[];
  } | null;
}

export async function renderProgramReport({
  orgName,
  locale,
  graph,
  scorecard,
  derivation,
  snapshot,
}: {
  orgName: string;
  locale: ContentLocale;
  graph: ProgramGraph;
  scorecard: ProgramScorecardData;
  derivation?: DerivationSummary | null;
  snapshot?: SnapshotContext | null;
}) {
  registerReportFonts();

  const messages = (await import(`../../../i18n/messages/${locale}.json`))
    .default as Record<string, unknown>;
  // The `programReport` namespace lives in the shared message files; the
  // string-keyed cast sidesteps next-intl's compile-time key inference
  // (the EN/ES parity test is the real guard on these keys). Missing keys
  // render as their last path segment instead of throwing.
  const t = createTranslator({
    locale,
    messages,
    namespace: "programReport",
    onError: () => undefined,
    getMessageFallback: ({ key }: { key: string }) =>
      key.split(".").pop() ?? key,
  } as unknown as Parameters<typeof createTranslator>[0]) as unknown as (
    key: string,
  ) => string;

  const date = scorecard.generatedAt.slice(0, 10);
  const disclaimer = t("disclaimer");
  const mapPages = paginateProgramGraph(
    graph,
    { compact: true, maxWidth: LAYOUT_W },
    MAP_HEIGHT_BUDGET,
  ).map((page) =>
    computeProgramMapLayout(page, { compact: true, maxWidth: LAYOUT_W }),
  );

  const vendorNameById = new Map(graph.vendors.map((v) => [v.id, v.name]));
  const groupsWithSystems = graph.groups
    .map((group) => ({
      group,
      systems: graph.systems.filter((sys) => sys.groupId === group.id),
    }))
    .filter((g) => g.systems.length > 0);
  const ungrouped = graph.systems.filter(
    (sys) => !graph.groups.some((g) => g.id === sys.groupId),
  );

  const legend = (layout: ProgramMapLayout) => (
    <View style={s.legendRow}>
      {layout.legend.map((item) => (
        <View key={item.id} style={s.legendItem}>
          <View
            style={[
              s.legendSwatch,
              item.shape === "stripe"
                ? { backgroundColor: item.color }
                : {
                    backgroundColor: tokens.color.surface.page,
                    borderWidth: 1.2,
                    borderColor: item.color,
                  },
            ]}
          />
          <Text style={s.legendText}>{t(`legend.${item.id}`)}</Text>
        </View>
      ))}
    </View>
  );

  const systemRow = (sys: ProgramGraph["systems"][number]) => (
    <View key={sys.id} style={s.row} wrap={false}>
      <Text style={s.cellName}>{sys.name}</Text>
      <View style={s.cellBadge}>
        <PillBadge tone={sys.riskLevel ? RISK_TONE[sys.riskLevel] : "neutral"}>
          {sys.riskLevel ? t(`risk.${sys.riskLevel}`) : t("risk.unclassified")}
        </PillBadge>
      </View>
      <Text style={s.cellPlain}>{t(`status.${sys.status}`)}</Text>
      <Text style={s.cellPlain}>
        {sys.vendorId ? (vendorNameById.get(sys.vendorId) ?? "—") : "—"}
      </Text>
      <Text style={s.cellSmall}>{sys.gates.length > 0 ? sys.gates.length : "—"}</Text>
      <View style={s.cellBar}>
        {sys.complianceAssessedPct !== null ? (
          <MiniCoverageBar
            label=""
            value={sys.complianceAssessedPct}
            total={100}
            format="percent"
          />
        ) : (
          <Text style={s.cellSmall}>—</Text>
        )}
      </View>
    </View>
  );

  return (
    <Document
      title={`${t("title")} — ${orgName}`}
      author="AI SENTINEL"
      language={locale}
    >
      {/* ── 1 · Cover ─────────────────────────────────────────── */}
      <CoverFrame rightEyebrow={t("coverEyebrow")}>
        <Text style={s.coverTitle}>{t("title")}</Text>
        <Text style={s.coverOrg}>{orgName}</Text>
        <Text style={s.coverDate}>{date}</Text>
        <DonutChart
          value={scorecard.tiles.overall}
          max={100}
          displayMode="custom"
          subValue={`${scorecard.tiles.overall}`}
          label={t("maturityLabel")}
          sublabel={t("maturitySublabel")}
        />
        <Text style={s.coverLead}>{t("coverLead")}</Text>
        <View style={s.coverFooter}>
          <ConfidentialPill label={t("confidential")} />
        </View>
      </CoverFrame>

      {/* ── 2 · Governance map (landscape) ────────────────────── */}
      {mapPages.map((layout, i) => {
        const allowance =
          (i === 0 ? MAP_HEADING_H : 0) +
          (i === mapPages.length - 1 ? MAP_LEGEND_H : 0);
        const scale = Math.min(
          MAP_SCALE,
          (MAP_USABLE_H - allowance) / layout.height,
        );
        return (
          <PageFrame
            key={`map-${i}`}
            orientation="landscape"
            eyebrow={
              mapPages.length > 1
                ? `${t("map.eyebrow")} ${i + 1}/${mapPages.length}`
                : t("map.eyebrow")
            }
            orgName={orgName}
            date={date}
            disclaimer={disclaimer}
          >
            {i === 0 && <SectionHeading title={t("map.title")} first />}
            <ProgramMapSvg layout={layout} width={layout.width * scale} />
            {i === mapPages.length - 1 && legend(layout)}
          </PageFrame>
        );
      })}

      {/* ── 3 · Scorecard ─────────────────────────────────────── */}
      <PageFrame
        eyebrow={t("scorecard.eyebrow")}
        orgName={orgName}
        date={date}
        disclaimer={disclaimer}
      >
        <SectionHeading title={t("scorecard.title")} first />
        <StatTileRow>
          <StatTile
            value={scorecard.tiles.overall}
            suffix="/100"
            label={t("tiles.overall")}
          />
          <StatTile
            value={`${scorecard.tiles.systemsGoverned.classified}/${scorecard.tiles.systemsGoverned.total}`}
            label={t("tiles.systemsGoverned")}
          />
          <StatTile
            value={`${scorecard.tiles.highRiskUnderOversight.withGate}/${scorecard.tiles.highRiskUnderOversight.needing}`}
            label={t("tiles.highRiskOversight")}
          />
          <StatTile
            value={`${scorecard.tiles.policyCoverage.coreTypesPresent}/6`}
            label={t("tiles.policyCoverage")}
          />
          <StatTile
            value={scorecard.tiles.complianceAssessedPct}
            suffix="%"
            label={t("tiles.complianceAssessed")}
          />
          <StatTile
            value={scorecard.tiles.openGaps}
            label={t("tiles.openGaps")}
            tone={scorecard.tiles.openGaps > 0 ? "warning" : "success"}
          />
        </StatTileRow>

        <View style={s.radarRow}>
          <RadarChart
            axes={scorecard.maturity.nist.map((axis) => ({
              label: t(`nist.${axis.id}`),
              current: axis.score,
              target: axis.target,
            }))}
            label={t("scorecard.radarCaption")}
            currentLegend={t("scorecard.current")}
            targetLegend={t("scorecard.target")}
          />
          <View style={s.dimsCol}>
            {scorecard.maturity.dimensions.map((dim) => (
              <MiniCoverageBar
                key={dim.id}
                label={t(`dimension.${dim.id}`)}
                value={dim.score}
                total={100}
                format="percent"
              />
            ))}
          </View>
        </View>

        <StackedBar
          totalLabel={t("compliance.title")}
          segments={[
            {
              label: t("compliance.compliant"),
              count: scorecard.snapshot.compliance.compliant,
              color: tokens.color.semantic.success.solid,
            },
            {
              label: t("compliance.partial"),
              count: scorecard.snapshot.compliance.partial,
              color: tokens.color.semantic.warning.solid,
            },
            {
              label: t("compliance.other"),
              count: Math.max(
                0,
                scorecard.snapshot.compliance.assessed -
                  scorecard.snapshot.compliance.compliant -
                  scorecard.snapshot.compliance.partial,
              ),
              color: tokens.color.semantic.danger.solid,
            },
            {
              label: t("compliance.notAssessed"),
              count:
                scorecard.snapshot.compliance.totalMappings -
                scorecard.snapshot.compliance.assessed,
              color: tokens.color.semantic.neutral.solid,
            },
          ]}
        />
      </PageFrame>

      {/* ── 4 · Systems by category ───────────────────────────── */}
      <PageFrame
        eyebrow={t("systems.eyebrow")}
        orgName={orgName}
        date={date}
        disclaimer={disclaimer}
      >
        <SectionHeading title={t("systems.title")} first />
        <View style={s.row}>
          <Text style={[s.cellName, s.colHead]}>{t("systems.colSystem")}</Text>
          <Text style={[s.cellBadge, s.colHead]}>{t("systems.colRisk")}</Text>
          <Text style={[s.cellPlain, s.colHead]}>{t("systems.colStatus")}</Text>
          <Text style={[s.cellPlain, s.colHead]}>{t("systems.colVendor")}</Text>
          <Text style={[s.cellSmall, s.colHead]}>{t("systems.colGates")}</Text>
          <Text style={[s.cellBar, s.colHead]}>{t("systems.colCompliance")}</Text>
        </View>
        {groupsWithSystems.map(({ group, systems }) => (
          <View key={group.id} wrap={false}>
            <SectionHeading title={group.label} level={3} />
            {systems.map(systemRow)}
          </View>
        ))}
        {ungrouped.length > 0 && (
          <View wrap={false}>
            <SectionHeading title={t("systems.ungrouped")} level={3} />
            {ungrouped.map(systemRow)}
          </View>
        )}
      </PageFrame>

      {/* ── 5 · 90-day plan + rollout guidance ────────────────── */}
      <PageFrame
        eyebrow={t("plan.eyebrow")}
        orgName={orgName}
        date={date}
        disclaimer={disclaimer}
      >
        <SectionHeading title={t("plan.title")} first />
        {scorecard.plan
          .filter((bucket) => bucket.items.length > 0)
          .map((bucket) => (
            <View
              key={bucket.bucket}
              style={[
                s.planBlock,
                {
                  borderLeftColor:
                    SEVERITY_COLOR[bucket.items[0]?.severity ?? "medium"],
                },
              ]}
              wrap={false}
            >
              <Text style={s.planBucket}>{t(`plan.bucket.${bucket.bucket}`)}</Text>
              {bucket.items.map((item) => (
                <View key={item.gapId}>
                  <View style={s.planItemRow}>
                    <Text style={s.planTitle}>{item.title}</Text>
                    <PillBadge tone={SEVERITY_TONE[item.severity]}>
                      {`${item.count} · ${item.effort}`}
                    </PillBadge>
                  </View>
                  <Text style={s.planDetail}>{item.detail}</Text>
                </View>
              ))}
            </View>
          ))}

        {scorecard.rollout.length > 0 && (
          <>
            <SectionHeading title={t("rollout.title")} />
            {scorecard.rollout.map((rec) => (
              <View key={rec.categoryId} style={s.rolloutCard} wrap={false}>
                <View style={s.rolloutHead}>
                  <Text style={s.rolloutLabel}>{rec.label}</Text>
                  <PillBadge tone={STAGE_TONE[rec.stage]} uppercase>
                    {t(`stage.${rec.stage}`)}
                  </PillBadge>
                </View>
                <Text style={s.rolloutSummary}>{rec.summary}</Text>
                {rec.preconditions.map((precondition, i) => (
                  <Text key={i} style={s.bullet}>{`•  ${precondition}`}</Text>
                ))}
              </View>
            ))}
          </>
        )}
      </PageFrame>

      {/* ── 6 · Professional duties (lawfirm only) ────────────── */}
      {scorecard.duties !== null && (
        <PageFrame
          eyebrow={t("duties.eyebrow")}
          orgName={orgName}
          date={date}
          disclaimer={disclaimer}
        >
          <SectionHeading
            title={t("duties.title")}
            lead={t("duties.lead")}
            first
          />
          {scorecard.duties.map((duty) => (
            <View key={duty.id} style={s.dutyBlock} wrap={false}>
              <Text style={s.dutyLabel}>{duty.label}</Text>
              <Text style={s.dutyDescription}>{duty.description}</Text>
              <View style={s.controlRow}>
                {duty.controls.map((control, i) => (
                  <View key={i} style={s.controlItem}>
                    <PillBadge tone={DUTY_STATUS_TONE[control.status]}>
                      {`${control.label ?? t(`dutyControl.${control.kind}`)} — ${t(`dutyStatus.${control.status}`)}`}
                    </PillBadge>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </PageFrame>
      )}

      {/* ── 7 · Annex: methodology ────────────────────────────── */}
      <PageFrame
        eyebrow={t("annex.eyebrow")}
        orgName={orgName}
        date={date}
        disclaimer={disclaimer}
      >
        <SectionHeading title={t("annex.title")} first />
        <Text style={s.annexText}>{t("annex.methodology")}</Text>
        <SectionHeading title={t("annex.dimensionsTitle")} level={3} />
        {DIMENSION_FORMULAS.map(([id, formula]) => (
          <Text key={id} style={s.annexMono}>
            {`${t(`dimension.${id}`)}  =  ${formula}`}
          </Text>
        ))}
        <SectionHeading title={t("annex.nistTitle")} level={3} />
        {NIST_MAPPING.map(([axis, mapping, target]) => (
          <Text key={axis} style={s.annexMono}>
            {`${t(`nist.${axis}`)}  =  ${mapping}   (${t("annex.target")}: ${target})`}
          </Text>
        ))}
        <View style={{ marginTop: tokens.space[7] }}>
          <Text style={s.annexText}>{scorecard.reviewMarker}</Text>
          <Text style={s.annexText}>
            {`${t("annex.generated")}: ${scorecard.generatedAt}`}
          </Text>
        </View>
      </PageFrame>

      {/* ── 8 · Annex: derivation & provenance ────────────────── */}
      <PageFrame
        eyebrow={t("methodology.eyebrow")}
        orgName={orgName}
        date={date}
        disclaimer={disclaimer}
      >
        <SectionHeading title={t("methodology.derivationTitle")} first />

        {/* The claim that does the defensibility work — stated out loud,
            because it is the enforced invariant of the baseline rule pack. */}
        <Text style={s.annexKeyLine}>{t("methodology.neverAsserts")}</Text>

        {derivation ? (
          <>
            <View style={s.annexTableHead}>
              {[
                t("methodology.colClass"),
                t("methodology.colTotal"),
                t("methodology.colAuto"),
                t("methodology.colConfirmed"),
                t("methodology.colPct"),
              ].map((label, i) => (
                <Text
                  key={label}
                  style={[s.annexCellHead, { flex: DERIVATION_COLS[i] }]}
                >
                  {label}
                </Text>
              ))}
            </View>
            {derivation.byClass.map((row) => (
              <View key={row.id} style={s.annexRow}>
                <Text style={[s.annexCell, { flex: DERIVATION_COLS[0] }]}>
                  {t(`methodology.class.${row.id}`)}
                </Text>
                <Text style={[s.annexCell, { flex: DERIVATION_COLS[1] }]}>
                  {row.total}
                </Text>
                <Text style={[s.annexCell, { flex: DERIVATION_COLS[2] }]}>
                  {row.autoDerived}
                </Text>
                <Text style={[s.annexCell, { flex: DERIVATION_COLS[3] }]}>
                  {row.confirmed}
                </Text>
                <Text style={[s.annexCell, { flex: DERIVATION_COLS[4] }]}>
                  {row.total > 0
                    ? `${Math.round((100 * row.confirmed) / row.total)}%`
                    : "—"}
                </Text>
              </View>
            ))}
            <Text style={s.annexNote}>
              {`${t("methodology.weighted")}: ${Math.round(derivation.weightedPct)}%`}
            </Text>
          </>
        ) : (
          <Text style={s.annexText}>{t("methodology.confirmationDisabled")}</Text>
        )}

        <SectionHeading title={t("methodology.rulePacksTitle")} level={3} />
        <View style={s.annexTableHead}>
          {[
            t("methodology.colPack"),
            t("methodology.colVersion"),
            t("methodology.colReviewed"),
            t("methodology.colSignOff"),
          ].map((label, i) => (
            <Text
              key={label}
              style={[s.annexCellHead, { flex: RULE_PACK_COLS[i] }]}
            >
              {label}
            </Text>
          ))}
        </View>
        {rulePackList().map((pack) => (
          <View key={pack.id} style={s.annexRow}>
            <Text style={[s.annexCell, { flex: RULE_PACK_COLS[0] }]}>
              {pack.id}
            </Text>
            <Text style={[s.annexCell, { flex: RULE_PACK_COLS[1] }]}>
              {pack.version}
            </Text>
            <Text style={[s.annexCell, { flex: RULE_PACK_COLS[2] }]}>
              {pack.lawReviewedAsOf}
            </Text>
            <Text style={[s.annexCell, { flex: RULE_PACK_COLS[3] }]}>
              {t(`methodology.signOff.${pack.signOff}`)}
            </Text>
          </View>
        ))}

        <SectionHeading title={t("methodology.determinismTitle")} level={3} />
        <Text style={s.annexText}>{t("methodology.determinism")}</Text>
      </PageFrame>

      {/* ── 9 · Annex: snapshot identity & trend ──────────────── */}
      {snapshot && (
        <PageFrame
          eyebrow={t("methodology.eyebrow")}
          orgName={orgName}
          date={date}
          disclaimer={disclaimer}
        >
          <SectionHeading title={t("methodology.snapshotTitle")} first />
          <Text style={s.annexText}>{t("methodology.snapshotIntro")}</Text>
          <Text style={s.annexMono}>
            {`${t("methodology.snapshotId")}: ${snapshot.id}`}
          </Text>
          <Text style={s.annexMono}>
            {`${t("methodology.snapshotHash")}: ${snapshot.payloadHash.slice(0, 12)}`}
          </Text>
          <Text style={s.annexMono}>
            {`${t("methodology.snapshotCaptured")}: ${snapshot.capturedAt}`}
          </Text>

          <SectionHeading title={t("methodology.trendTitle")} level={3} />
          {snapshot.previous ? (
            <>
              <Text style={s.annexText}>
                {`${t("methodology.comparedWith")}: ${snapshot.previous.capturedAt}`}
              </Text>
              <Text style={s.annexKeyLine}>
                {`${t("methodology.overallDelta")}: ${
                  snapshot.previous.overallDelta >= 0 ? "+" : ""
                }${snapshot.previous.overallDelta}`}
              </Text>
              {snapshot.previous.dimensionDeltas
                .filter((d) => d.delta !== 0)
                .map((d) => (
                  <Text key={d.id} style={s.annexMono}>
                    {`${t(`dimension.${d.id}`)}  ${d.delta >= 0 ? "+" : ""}${d.delta}`}
                  </Text>
                ))}
              {snapshot.previous.gapsClosed.length > 0 && (
                <Text style={s.annexNote}>
                  {`${t("methodology.gapsClosed")}: ${snapshot.previous.gapsClosed.join(", ")}`}
                </Text>
              )}
              {snapshot.previous.gapsOpened.length > 0 && (
                <Text style={s.annexNote}>
                  {`${t("methodology.gapsOpened")}: ${snapshot.previous.gapsOpened.join(", ")}`}
                </Text>
              )}
              {/* The distinction that matters: did the program change, or did
                  the law change underneath it? */}
              {snapshot.previous.rulePackChanges.length > 0 && (
                <>
                  <SectionHeading
                    title={t("methodology.rulePackChangesTitle")}
                    level={3}
                  />
                  <Text style={s.annexText}>
                    {t("methodology.rulePackChangesIntro")}
                  </Text>
                  {snapshot.previous.rulePackChanges.map((change) => (
                    <Text key={change.pack} style={s.annexMono}>
                      {`${change.pack}: ${change.from ?? "—"} → ${change.to ?? "—"}`}
                    </Text>
                  ))}
                </>
              )}
            </>
          ) : (
            <Text style={s.annexText}>{t("methodology.noPrevious")}</Text>
          )}
        </PageFrame>
      )}
    </Document>
  );
}
