// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import React from "react";
import { Document, View, Text } from "@react-pdf/renderer";
import {
  ContentPage, CoverPage, DataTable, MetadataBlock,
  StatCard, AccentSectionHeader, RiskBadge, StatusBadge,
  s, fmtDate,
} from "./pdf-styles";
import { pdfLabels, riskLabel, roleLabel, statusLabel, techniqueLabel, type PdfLocale } from "./pdf-labels";
import { DraftGapsPage, type DraftNote } from "./draft-gaps-page";

export interface AISystemExportData {
  id: string;
  name: string;
  description: string | null;
  technique: string;
  role: string;
  status: string;
  purpose: string | null;
  businessOwner: string | null;
  technicalOwner: string | null;
  deploymentDate: Date | string | null;
  retirementDate: Date | string | null;
  processesPersonalData: boolean;
  riskLevel: string | null;
  rationale: string | null;
  vendorName: string | null;
  modelCount: number;
  dataSourceCount: number;
  assessmentCount: number;
  incidentCount: number;
  complianceMappingCount: number;
}

export function AISystemRegisterReport({
  systems,
  orgName,
  draftNote,
  locale = "en",
}: {
  systems: AISystemExportData[];
  orgName: string;
  /** In the program pack, a draft opens on a page naming its gaps. */
  draftNote?: DraftNote | null;
  locale?: PdfLocale;
}) {
  const date = fmtDate(new Date());
  const l = pdfLabels(locale);
  const r = l.register;

  const byStatus: Record<string, number> = {};
  const byRisk: Record<string, number> = {};
  for (const sys of systems) {
    byStatus[sys.status] = (byStatus[sys.status] || 0) + 1;
    const risk = sys.riskLevel || "UNCLASSIFIED";
    byRisk[risk] = (byRisk[risk] || 0) + 1;
  }

  const deployed = byStatus["DEPLOYED"] || 0;
  const highRisk = (byRisk["HIGH"] || 0) + (byRisk["UNACCEPTABLE"] || 0);

  return (
    <Document language={locale}>
      {draftNote && <DraftGapsPage note={draftNote} />}
      <CoverPage
        orgName={orgName}
        title={r.title}
        subtitle={r.subtitle}
        date={date}
        locale={locale}
      />

      <ContentPage title={r.title} orgName={orgName} date={date} locale={locale}>
        <Text style={s.sectionTitle}>{l.executiveSummary}</Text>
        <View style={s.statsGrid}>
          <StatCard value={systems.length} label={r.totalSystems} />
          <StatCard value={deployed} label={r.deployed} />
          <StatCard value={highRisk} label={r.highOrUnacceptable} />
          <StatCard value={byStatus["DRAFT"] || 0} label={r.draft} />
        </View>

        <Text style={s.sectionTitle}>{r.systemOverview}</Text>
        <DataTable
          locale={locale}
          headers={[r.systemName, l.status, l.riskLevel, r.technique, r.role, r.models]}
          colWidths={[3, 1.2, 1.2, 1.5, 1, 0.8]}
          rows={systems.map((sys) => [
            sys.name,
            statusLabel(sys.status, locale),
            sys.riskLevel ? riskLabel(sys.riskLevel, locale) : "—",
            techniqueLabel(sys.technique, locale),
            roleLabel(sys.role, locale),
            sys.modelCount,
          ])}
        />
      </ContentPage>

      <ContentPage title={r.title} orgName={orgName} date={date} locale={locale}>
        <Text style={s.sectionTitle}>{l.riskDistribution}</Text>
        <DataTable
          locale={locale}
          headers={[l.riskLevel, l.count, l.percentage]}
          colWidths={[2, 1, 1]}
          rows={Object.entries(byRisk)
            .sort(([a], [b]) => {
              const order = ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL", "UNCLASSIFIED"];
              return order.indexOf(a) - order.indexOf(b);
            })
            .map(([level, count]) => [
              riskLabel(level, locale),
              count,
              `${Math.round((count / systems.length) * 100)}%`,
            ])}
        />

        <Text style={s.sectionTitle}>{l.statusDistribution}</Text>
        <DataTable
          locale={locale}
          headers={[l.status, l.count, l.percentage]}
          colWidths={[2, 1, 1]}
          rows={Object.entries(byStatus).map(([status, count]) => [
            statusLabel(status, locale),
            count,
            `${Math.round((count / systems.length) * 100)}%`,
          ])}
        />
      </ContentPage>

      {systems.map((sys) => (
        <ContentPage key={sys.id} title={r.title} orgName={orgName} date={date} locale={locale}>
          <AccentSectionHeader title={sys.name} description={sys.purpose || undefined} />
          <View style={s.row}>
            <StatusBadge status={sys.status} locale={locale} />
            <Text style={{ marginHorizontal: 6 }}> </Text>
            <RiskBadge level={sys.riskLevel} locale={locale} />
          </View>
          <MetadataBlock
            items={[
              { label: r.technique, value: techniqueLabel(sys.technique, locale) },
              { label: r.role, value: roleLabel(sys.role, locale) },
              { label: r.businessOwner, value: sys.businessOwner },
              { label: r.technicalOwner, value: sys.technicalOwner },
              { label: r.vendor, value: sys.vendorName },
              { label: r.deploymentDate, value: fmtDate(sys.deploymentDate) !== "—" ? fmtDate(sys.deploymentDate) : null },
              { label: r.retirementDate, value: fmtDate(sys.retirementDate) !== "—" ? fmtDate(sys.retirementDate) : null },
              { label: r.processesPersonalData, value: sys.processesPersonalData ? l.yes : l.no },
              { label: r.models, value: String(sys.modelCount) },
              { label: r.dataSources, value: String(sys.dataSourceCount) },
              { label: r.assessments, value: String(sys.assessmentCount) },
              { label: r.incidents, value: String(sys.incidentCount) },
              { label: r.complianceMappings, value: String(sys.complianceMappingCount) },
            ]}
          />
          {sys.description && (
            <View>
              <Text style={s.sectionSubtitle}>{r.description}</Text>
              <Text style={s.paragraph}>{sys.description}</Text>
            </View>
          )}
          {sys.rationale && (
            <View>
              <Text style={s.sectionSubtitle}>{r.rationale}</Text>
              <Text style={s.paragraph}>{sys.rationale}</Text>
            </View>
          )}
        </ContentPage>
      ))}
    </Document>
  );
}
