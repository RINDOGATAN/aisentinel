import React from "react";
import { Document, View, Text } from "@react-pdf/renderer";
import {
  ContentPage, CoverPage, DataTable, MetadataBlock,
  StatCard, AccentSectionHeader, RiskBadge,
  s, fmtDate,
} from "./pdf-styles";

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
}: {
  models: ModelExportData[];
  orgName: string;
}) {
  const date = fmtDate(new Date());

  const byProvider: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byRisk: Record<string, number> = {};

  for (const m of models) {
    const provider = m.provider || "Unknown";
    byProvider[provider] = (byProvider[provider] || 0) + 1;
    const modelType = m.modelType || "Unspecified";
    byType[modelType] = (byType[modelType] || 0) + 1;
    const risk = m.riskLevel || "UNCLASSIFIED";
    byRisk[risk] = (byRisk[risk] || 0) + 1;
  }

  const uniqueProviders = Object.keys(byProvider).length;
  const uniqueSystems = new Set(models.map((m) => m.aiSystemName)).size;

  return (
    <Document>
      <CoverPage
        orgName={orgName}
        title="AI Model Inventory"
        subtitle="Complete catalogue of AI models across all systems"
        date={date}
      />

      <ContentPage title="AI Model Inventory" orgName={orgName} date={date}>
        <Text style={s.sectionTitle}>Executive Summary</Text>
        <View style={s.statsGrid}>
          <StatCard value={models.length} label="Total Models" />
          <StatCard value={uniqueProviders} label="Providers" />
          <StatCard value={uniqueSystems} label="AI Systems" />
          <StatCard value={byRisk["HIGH"] || 0} label="High Risk" />
        </View>

        <Text style={s.sectionTitle}>Model Register</Text>
        <DataTable
          headers={["Model Name", "Provider", "Type", "Version", "AI System", "Risk"]}
          colWidths={[2.5, 1.5, 1.2, 0.8, 2, 1]}
          rows={models.map((m) => [
            m.name,
            m.provider || "—",
            m.modelType || "—",
            m.version || "—",
            m.aiSystemName,
            m.riskLevel || "—",
          ])}
        />
      </ContentPage>

      <ContentPage title="AI Model Inventory" orgName={orgName} date={date}>
        <Text style={s.sectionTitle}>By Provider</Text>
        <DataTable
          headers={["Provider", "Count", "Percentage"]}
          colWidths={[2, 1, 1]}
          rows={Object.entries(byProvider)
            .sort(([, a], [, b]) => b - a)
            .map(([provider, count]) => [
              provider,
              count,
              `${Math.round((count / models.length) * 100)}%`,
            ])}
        />

        <Text style={s.sectionTitle}>By Model Type</Text>
        <DataTable
          headers={["Type", "Count", "Percentage"]}
          colWidths={[2, 1, 1]}
          rows={Object.entries(byType)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => [
              type,
              count,
              `${Math.round((count / models.length) * 100)}%`,
            ])}
        />

        <Text style={s.sectionTitle}>Risk Distribution</Text>
        <DataTable
          headers={["Risk Level", "Count", "Percentage"]}
          colWidths={[2, 1, 1]}
          rows={Object.entries(byRisk)
            .sort(([a], [b]) => {
              const order = ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL", "UNCLASSIFIED"];
              return order.indexOf(a) - order.indexOf(b);
            })
            .map(([level, count]) => [
              level,
              count,
              `${Math.round((count / models.length) * 100)}%`,
            ])}
        />
      </ContentPage>

      {models.filter((m) => m.trainingDataSummary || m.knownLimitations).map((m) => (
        <ContentPage key={m.id} title="AI Model Inventory" orgName={orgName} date={date}>
          <AccentSectionHeader title={m.name} description={`${m.aiSystemName} — ${m.provider || "Unknown provider"}`} />
          <RiskBadge level={m.riskLevel} />
          <MetadataBlock
            items={[
              { label: "Provider", value: m.provider },
              { label: "Type", value: m.modelType },
              { label: "Version", value: m.version },
              { label: "AI System", value: m.aiSystemName },
              { label: "System Status", value: m.aiSystemStatus.replace(/_/g, " ") },
            ]}
          />
          {m.trainingDataSummary && (
            <View>
              <Text style={s.sectionSubtitle}>Training Data Summary</Text>
              <Text style={s.paragraph}>{m.trainingDataSummary}</Text>
            </View>
          )}
          {m.knownLimitations && (
            <View>
              <Text style={s.sectionSubtitle}>Known Limitations</Text>
              <Text style={s.paragraph}>{m.knownLimitations}</Text>
            </View>
          )}
        </ContentPage>
      ))}
    </Document>
  );
}
