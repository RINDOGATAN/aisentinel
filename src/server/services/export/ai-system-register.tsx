import React from "react";
import { Document, View, Text } from "@react-pdf/renderer";
import {
  ContentPage, CoverPage, DataTable, MetadataBlock,
  StatCard, AccentSectionHeader, RiskBadge, StatusBadge,
  s, fmtDate,
} from "./pdf-styles";

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
}: {
  systems: AISystemExportData[];
  orgName: string;
}) {
  const date = fmtDate(new Date());

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
    <Document>
      <CoverPage
        orgName={orgName}
        title="AI System Register"
        subtitle="Complete inventory of AI systems under governance"
        date={date}
      />

      <ContentPage title="AI System Register" orgName={orgName} date={date}>
        <Text style={s.sectionTitle}>Executive Summary</Text>
        <View style={s.statsGrid}>
          <StatCard value={systems.length} label="Total Systems" />
          <StatCard value={deployed} label="Deployed" />
          <StatCard value={highRisk} label="High / Unacceptable Risk" />
          <StatCard value={byStatus["DRAFT"] || 0} label="Draft" />
        </View>

        <Text style={s.sectionTitle}>System Overview</Text>
        <DataTable
          headers={["System Name", "Status", "Risk Level", "Technique", "Role", "Models"]}
          colWidths={[3, 1.2, 1.2, 1.5, 1, 0.8]}
          rows={systems.map((sys) => [
            sys.name,
            sys.status.replace(/_/g, " "),
            sys.riskLevel || "—",
            sys.technique.replace(/_/g, " "),
            sys.role,
            sys.modelCount,
          ])}
        />
      </ContentPage>

      <ContentPage title="AI System Register" orgName={orgName} date={date}>
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
              `${Math.round((count / systems.length) * 100)}%`,
            ])}
        />

        <Text style={s.sectionTitle}>Status Distribution</Text>
        <DataTable
          headers={["Status", "Count", "Percentage"]}
          colWidths={[2, 1, 1]}
          rows={Object.entries(byStatus).map(([status, count]) => [
            status.replace(/_/g, " "),
            count,
            `${Math.round((count / systems.length) * 100)}%`,
          ])}
        />
      </ContentPage>

      {systems.map((sys) => (
        <ContentPage key={sys.id} title="AI System Register" orgName={orgName} date={date}>
          <AccentSectionHeader title={sys.name} description={sys.purpose || undefined} />
          <View style={s.row}>
            <StatusBadge status={sys.status} />
            <Text style={{ marginHorizontal: 6 }}> </Text>
            <RiskBadge level={sys.riskLevel} />
          </View>
          <MetadataBlock
            items={[
              { label: "Technique", value: sys.technique.replace(/_/g, " ") },
              { label: "Role", value: sys.role },
              { label: "Business Owner", value: sys.businessOwner },
              { label: "Technical Owner", value: sys.technicalOwner },
              { label: "Vendor", value: sys.vendorName },
              { label: "Deployment Date", value: fmtDate(sys.deploymentDate) !== "—" ? fmtDate(sys.deploymentDate) : null },
              { label: "Retirement Date", value: fmtDate(sys.retirementDate) !== "—" ? fmtDate(sys.retirementDate) : null },
              { label: "Processes Personal Data", value: sys.processesPersonalData ? "Yes" : "No" },
              { label: "Models", value: String(sys.modelCount) },
              { label: "Data Sources", value: String(sys.dataSourceCount) },
              { label: "Assessments", value: String(sys.assessmentCount) },
              { label: "Incidents", value: String(sys.incidentCount) },
              { label: "Compliance Mappings", value: String(sys.complianceMappingCount) },
            ]}
          />
          {sys.description && (
            <View>
              <Text style={s.sectionSubtitle}>Description</Text>
              <Text style={s.paragraph}>{sys.description}</Text>
            </View>
          )}
          {sys.rationale && (
            <View>
              <Text style={s.sectionSubtitle}>Risk Classification Rationale</Text>
              <Text style={s.paragraph}>{sys.rationale}</Text>
            </View>
          )}
        </ContentPage>
      ))}
    </Document>
  );
}
