// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import React from "react";
import { Document, View, Text } from "@react-pdf/renderer";
import {
  ContentPage, CoverPage, DataTable, MetadataBlock,
  StatCard, AccentSectionHeader, RiskBadge,
  s, fmtDate,
} from "./pdf-styles";
import { pdfLabels, riskLabel, statusLabel, type PdfLocale } from "./pdf-labels";

export interface ModelExportData {
  id: string;
  name: string;
  provider: string | null;
  modelType: string | null;
  version: string | null;
  trainingDataSummary: string | null;
  knownLimitations: string | null;
  aiSystemName: string;
  aiSystemStatus: string;
  riskLevel: string | null;
}

export function ModelInventoryReport({
  models,
  orgName,
  locale = "en",
}: {
  models: ModelExportData[];
  orgName: string;
  locale?: PdfLocale;
}) {
  const date = fmtDate(new Date());
  const l = pdfLabels(locale);
  const inv = l.inventory;

  const byProvider: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byRisk: Record<string, number> = {};

  for (const m of models) {
    const provider = m.provider || inv.unknown;
    byProvider[provider] = (byProvider[provider] || 0) + 1;
    const modelType = m.modelType || inv.unspecified;
    byType[modelType] = (byType[modelType] || 0) + 1;
    const risk = m.riskLevel || "UNCLASSIFIED";
    byRisk[risk] = (byRisk[risk] || 0) + 1;
  }

  const uniqueProviders = Object.keys(byProvider).length;
  const uniqueSystems = new Set(models.map((m) => m.aiSystemName)).size;

  return (
    <Document language={locale}>
      <CoverPage
        orgName={orgName}
        title={inv.title}
        subtitle={inv.subtitle}
        date={date}
        locale={locale}
      />

      <ContentPage title={inv.title} orgName={orgName} date={date} locale={locale}>
        <Text style={s.sectionTitle}>{l.executiveSummary}</Text>
        <View style={s.statsGrid}>
          <StatCard value={models.length} label={inv.totalModels} />
          <StatCard value={uniqueProviders} label={l.providers} />
          <StatCard value={uniqueSystems} label={l.aiSystems} />
          <StatCard value={byRisk["HIGH"] || 0} label={inv.highRisk} />
        </View>

        <Text style={s.sectionTitle}>{inv.modelRegister}</Text>
        <DataTable
          locale={locale}
          headers={[inv.modelName, l.provider, l.type, l.version, l.aiSystem, inv.risk]}
          colWidths={[2.5, 1.5, 1.2, 0.8, 2, 1]}
          rows={models.map((m) => [
            m.name,
            m.provider || "—",
            m.modelType || "—",
            m.version || "—",
            m.aiSystemName,
            m.riskLevel ? riskLabel(m.riskLevel, locale) : "—",
          ])}
        />
      </ContentPage>

      <ContentPage title={inv.title} orgName={orgName} date={date} locale={locale}>
        <Text style={s.sectionTitle}>{inv.byProvider}</Text>
        <DataTable
          locale={locale}
          headers={[l.provider, l.count, l.percentage]}
          colWidths={[2, 1, 1]}
          rows={Object.entries(byProvider)
            .sort(([, a], [, b]) => b - a)
            .map(([provider, count]) => [
              provider,
              count,
              `${Math.round((count / models.length) * 100)}%`,
            ])}
        />

        <Text style={s.sectionTitle}>{inv.byModelType}</Text>
        <DataTable
          locale={locale}
          headers={[l.type, l.count, l.percentage]}
          colWidths={[2, 1, 1]}
          rows={Object.entries(byType)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => [
              type,
              count,
              `${Math.round((count / models.length) * 100)}%`,
            ])}
        />

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
              `${Math.round((count / models.length) * 100)}%`,
            ])}
        />
      </ContentPage>

      {models.filter((m) => m.trainingDataSummary || m.knownLimitations).map((m) => (
        <ContentPage key={m.id} title={inv.title} orgName={orgName} date={date} locale={locale}>
          <AccentSectionHeader
            title={m.name}
            description={
              locale === "es"
                ? `${m.aiSystemName} (${m.provider || inv.unknownProvider})`
                : `${m.aiSystemName} — ${m.provider || inv.unknownProvider}`
            }
          />
          <RiskBadge level={m.riskLevel} locale={locale} />
          <MetadataBlock
            items={[
              { label: l.provider, value: m.provider },
              { label: l.type, value: m.modelType },
              { label: l.version, value: m.version },
              { label: l.aiSystem, value: m.aiSystemName },
              { label: inv.systemStatus, value: statusLabel(m.aiSystemStatus, locale) },
            ]}
          />
          {m.trainingDataSummary && (
            <View>
              <Text style={s.sectionSubtitle}>{inv.trainingData}</Text>
              <Text style={s.paragraph}>{m.trainingDataSummary}</Text>
            </View>
          )}
          {m.knownLimitations && (
            <View>
              <Text style={s.sectionSubtitle}>{inv.limitations}</Text>
              <Text style={s.paragraph}>{m.knownLimitations}</Text>
            </View>
          )}
        </ContentPage>
      ))}
    </Document>
  );
}
