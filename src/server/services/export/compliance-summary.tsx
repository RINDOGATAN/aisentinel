// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import React from "react";
import { Document, View, Text } from "@react-pdf/renderer";
import {
  ContentPage, CoverPage, DataTable, MetadataBlock,
  StatCard, ProgressBar, StatusBadge,
  s, fmtDate,
} from "./pdf-styles";
import { pdfLabels, statusLabel, type PdfLocale } from "./pdf-labels";

export interface ComplianceRequirementExport {
  code: string;
  title: string;
  status: string;
  evidenceCount: number;
  notes: string | null;
  children: Array<{
    code: string;
    title: string;
    status: string;
    evidenceCount: number;
    notes: string | null;
  }>;
}

export interface ComplianceSummaryData {
  orgName: string;
  aiSystemName: string;
  frameworkName: string;
  frameworkCode: string;
  requirements: ComplianceRequirementExport[];
}

export function ComplianceSummaryReport({ data, locale = "en" }: { data: ComplianceSummaryData; locale?: PdfLocale }) {
  const date = fmtDate(new Date());
  const l = pdfLabels(locale);
  const cs = l.compliance;

  // Flatten all requirements (parents + children) for stats
  const all: Array<{ code: string; status: string }> = [];
  for (const req of data.requirements) {
    all.push({ code: req.code, status: req.status });
    for (const child of req.children) {
      all.push({ code: child.code, status: child.status });
    }
  }

  const total = all.length;
  const byStatus: Record<string, number> = {};
  for (const r of all) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }

  const compliant = byStatus["COMPLIANT"] || 0;
  const partial = byStatus["PARTIALLY_COMPLIANT"] || 0;
  const nonCompliant = byStatus["NON_COMPLIANT"] || 0;
  const notAssessed = byStatus["NOT_ASSESSED"] || 0;
  const assessed = total - notAssessed;
  const compliancePercent = assessed > 0 ? Math.round((compliant / assessed) * 100) : 0;

  return (
    <Document language={locale}>
      <CoverPage
        orgName={data.orgName}
        title={cs.coverTitle(data.frameworkName)}
        subtitle={cs.coverSubtitle(data.aiSystemName)}
        date={date}
        locale={locale}
      />

      <ContentPage title={cs.title} orgName={data.orgName} date={date} locale={locale}>
        <Text style={s.sectionTitle}>{l.executiveSummary}</Text>
        <MetadataBlock
          items={[
            { label: cs.framework, value: data.frameworkName },
            { label: l.aiSystem, value: data.aiSystemName },
          ]}
        />
        <View style={s.statsGrid}>
          <StatCard value={total} label={cs.requirements} />
          <StatCard value={compliant} label={cs.compliant} />
          <StatCard value={partial} label={cs.partial} />
          <StatCard value={nonCompliant} label={cs.nonCompliant} />
        </View>

        <Text style={s.sectionSubtitle}>{cs.progress(compliancePercent)}</Text>
        <ProgressBar percent={compliancePercent} />

        <Text style={s.sectionTitle}>{cs.statusBreakdown}</Text>
        <DataTable
          locale={locale}
          headers={[l.status, l.count, l.percentage]}
          colWidths={[2, 1, 1]}
          rows={[
            [cs.compliantRow, compliant, `${total > 0 ? Math.round((compliant / total) * 100) : 0}%`],
            [cs.partiallyCompliant, partial, `${total > 0 ? Math.round((partial / total) * 100) : 0}%`],
            [cs.nonCompliantRow, nonCompliant, `${total > 0 ? Math.round((nonCompliant / total) * 100) : 0}%`],
            [cs.notAssessed, notAssessed, `${total > 0 ? Math.round((notAssessed / total) * 100) : 0}%`],
            [cs.notApplicable, byStatus["NOT_APPLICABLE"] || 0, `${total > 0 ? Math.round(((byStatus["NOT_APPLICABLE"] || 0) / total) * 100) : 0}%`],
          ]}
        />
      </ContentPage>

      <ContentPage title={cs.title} orgName={data.orgName} date={date} locale={locale}>
        <Text style={s.sectionTitle}>{cs.requirementDetails}</Text>
        <DataTable
          locale={locale}
          headers={[cs.code, cs.requirement, l.status, cs.evidence]}
          colWidths={[1, 4, 1.5, 0.8]}
          rows={all.map((r) => {
            const full = data.requirements.find((req) => req.code === r.code)
              || data.requirements.flatMap((req) => req.children).find((c) => c.code === r.code);
            return [
              r.code,
              full?.title || "—",
              statusLabel(r.status, locale),
              full?.evidenceCount ?? 0,
            ];
          })}
        />
      </ContentPage>

      {/* Non-compliant items detail page */}
      {nonCompliant > 0 && (
        <ContentPage title={cs.title} orgName={data.orgName} date={date} locale={locale}>
          <Text style={s.sectionTitle}>{cs.actionRequired}</Text>
          {data.requirements.map((req) => {
            const items = [req, ...req.children].filter((r) => r.status === "NON_COMPLIANT");
            return items.map((item) => (
              <View key={item.code} style={s.card}>
                <View style={s.row}>
                  <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#991b1b", marginRight: 6 }}>{item.code}</Text>
                  <Text style={{ fontSize: 10, flex: 1 }}>{item.title}</Text>
                </View>
                <StatusBadge status="NON_COMPLIANT" locale={locale} />
                {item.notes && <Text style={s.notesText}>{item.notes}</Text>}
              </View>
            ));
          })}
        </ContentPage>
      )}
    </Document>
  );
}
