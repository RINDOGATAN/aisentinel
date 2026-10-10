// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import React from "react";
import { Document, View, Text } from "@react-pdf/renderer";
import {
  ContentPage, CoverPage, DataTable, MetadataBlock,
  StatCard, AccentSectionHeader, StatusBadge,
  s, fmtDate,
} from "./pdf-styles";
import { assessmentTypeLabel, pdfLabels, statusLabel, type PdfLocale } from "./pdf-labels";
import { DraftGapsPage, type DraftNote } from "./draft-gaps-page";

export interface AssessmentExportData {
  id: string;
  title: string;
  type: string;
  status: string;
  riskScore: number | null;
  aiSystemName: string;
  templateName: string | null;
  createdBy: string;
  reviewedBy: string | null;
  approvedBy: string | null;
  createdAt: Date | string;
  reviewedAt: Date | string | null;
  approvedAt: Date | string | null;
}

export function AssessmentPortfolioReport({
  assessments,
  orgName,
  draftNote,
  locale = "en",
}: {
  assessments: AssessmentExportData[];
  orgName: string;
  /** In the program pack, a draft opens on a page naming its gaps. */
  draftNote?: DraftNote | null;
  locale?: PdfLocale;
}) {
  const date = fmtDate(new Date());
  const l = pdfLabels(locale);
  const p = l.portfolio;

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let totalScore = 0;
  let scoredCount = 0;

  for (const a of assessments) {
    byType[a.type] = (byType[a.type] || 0) + 1;
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    if (a.riskScore != null) {
      totalScore += a.riskScore;
      scoredCount++;
    }
  }

  const avgScore = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : "—";

  return (
    <Document language={locale}>
      {draftNote && <DraftGapsPage note={draftNote} />}
      <CoverPage
        orgName={orgName}
        title={p.coverTitle}
        subtitle={p.subtitle}
        date={date}
        locale={locale}
      />

      <ContentPage title={p.title} orgName={orgName} date={date} locale={locale}>
        <Text style={s.sectionTitle}>{l.executiveSummary}</Text>
        <View style={s.statsGrid}>
          <StatCard value={assessments.length} label={p.totalAssessments} />
          <StatCard value={byStatus["APPROVED"] || 0} label={p.approved} />
          <StatCard value={byStatus["IN_PROGRESS"] || 0} label={p.inProgress} />
          <StatCard value={avgScore} label={p.avgRiskScore} />
        </View>

        <Text style={s.sectionTitle}>{p.byType}</Text>
        <DataTable
          locale={locale}
          headers={[l.type, l.count, l.percentage]}
          colWidths={[2, 1, 1]}
          rows={Object.entries(byType).map(([type, count]) => [
            assessmentTypeLabel(type, locale),
            count,
            `${Math.round((count / assessments.length) * 100)}%`,
          ])}
        />

        <Text style={s.sectionTitle}>{p.byStatus}</Text>
        <DataTable
          locale={locale}
          headers={[l.status, l.count, l.percentage]}
          colWidths={[2, 1, 1]}
          rows={Object.entries(byStatus).map(([status, count]) => [
            statusLabel(status, locale),
            count,
            `${Math.round((count / assessments.length) * 100)}%`,
          ])}
        />
      </ContentPage>

      <ContentPage title={p.title} orgName={orgName} date={date} locale={locale}>
        <Text style={s.sectionTitle}>{p.register}</Text>
        <DataTable
          locale={locale}
          headers={[p.assessmentTitle, l.aiSystem, l.type, l.status, p.riskScore, p.created]}
          colWidths={[3, 2, 1.2, 1.2, 1, 1]}
          rows={assessments.map((a) => [
            a.title,
            a.aiSystemName,
            assessmentTypeLabel(a.type, locale),
            statusLabel(a.status, locale),
            a.riskScore != null ? a.riskScore.toFixed(1) : "—",
            fmtDate(a.createdAt),
          ])}
        />
      </ContentPage>

      {assessments.map((a) => (
        <ContentPage key={a.id} title={p.title} orgName={orgName} date={date} locale={locale}>
          <AccentSectionHeader title={a.title} />
          <StatusBadge status={a.status} locale={locale} />
          <MetadataBlock
            items={[
              { label: l.aiSystem, value: a.aiSystemName },
              { label: l.type, value: assessmentTypeLabel(a.type, locale) },
              { label: p.template, value: a.templateName },
              { label: p.riskScore, value: a.riskScore != null ? a.riskScore.toFixed(1) : null },
              { label: p.createdBy, value: a.createdBy },
              { label: p.created, value: fmtDate(a.createdAt) },
              { label: p.reviewedBy, value: a.reviewedBy },
              { label: p.reviewed, value: fmtDate(a.reviewedAt) },
              { label: p.approvedBy, value: a.approvedBy },
              { label: p.approvedOn, value: fmtDate(a.approvedAt) },
            ]}
          />
        </ContentPage>
      ))}
    </Document>
  );
}
