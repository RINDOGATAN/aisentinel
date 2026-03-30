import React from "react";
import { Document, View, Text } from "@react-pdf/renderer";
import {
  ContentPage, CoverPage, DataTable, MetadataBlock,
  StatCard, ProgressBar, StatusBadge,
  s, fmtDate,
} from "./pdf-styles";

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

export function ComplianceSummaryReport({ data }: { data: ComplianceSummaryData }) {
  const date = fmtDate(new Date());

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
    <Document>
      <CoverPage
        orgName={data.orgName}
        title={`${data.frameworkName} Compliance Summary`}
        subtitle={`Assessment for ${data.aiSystemName}`}
        date={date}
      />

      <ContentPage title="Compliance Summary" orgName={data.orgName} date={date}>
        <Text style={s.sectionTitle}>Executive Summary</Text>
        <MetadataBlock
          items={[
            { label: "Framework", value: data.frameworkName },
            { label: "AI System", value: data.aiSystemName },
          ]}
        />
        <View style={s.statsGrid}>
          <StatCard value={total} label="Requirements" />
          <StatCard value={compliant} label="Compliant" />
          <StatCard value={partial} label="Partial" />
          <StatCard value={nonCompliant} label="Non-Compliant" />
        </View>

        <Text style={s.sectionSubtitle}>Compliance Progress ({compliancePercent}% of assessed)</Text>
        <ProgressBar percent={compliancePercent} />

        <Text style={s.sectionTitle}>Status Breakdown</Text>
        <DataTable
          headers={["Status", "Count", "Percentage"]}
          colWidths={[2, 1, 1]}
          rows={[
            ["Compliant", compliant, `${total > 0 ? Math.round((compliant / total) * 100) : 0}%`],
            ["Partially Compliant", partial, `${total > 0 ? Math.round((partial / total) * 100) : 0}%`],
            ["Non-Compliant", nonCompliant, `${total > 0 ? Math.round((nonCompliant / total) * 100) : 0}%`],
            ["Not Assessed", notAssessed, `${total > 0 ? Math.round((notAssessed / total) * 100) : 0}%`],
            ["Not Applicable", byStatus["NOT_APPLICABLE"] || 0, `${total > 0 ? Math.round(((byStatus["NOT_APPLICABLE"] || 0) / total) * 100) : 0}%`],
          ]}
        />
      </ContentPage>

      <ContentPage title="Compliance Summary" orgName={data.orgName} date={date}>
        <Text style={s.sectionTitle}>Requirement Details</Text>
        <DataTable
          headers={["Code", "Requirement", "Status", "Evidence"]}
          colWidths={[1, 4, 1.5, 0.8]}
          rows={all.map((r) => {
            const full = data.requirements.find((req) => req.code === r.code)
              || data.requirements.flatMap((req) => req.children).find((c) => c.code === r.code);
            return [
              r.code,
              full?.title || "—",
              r.status.replace(/_/g, " "),
              full?.evidenceCount ?? 0,
            ];
          })}
        />
      </ContentPage>

      {/* Non-compliant items detail page */}
      {nonCompliant > 0 && (
        <ContentPage title="Compliance Summary" orgName={data.orgName} date={date}>
          <Text style={s.sectionTitle}>Non-Compliant Requirements — Action Required</Text>
          {data.requirements.map((req) => {
            const items = [req, ...req.children].filter((r) => r.status === "NON_COMPLIANT");
            return items.map((item) => (
              <View key={item.code} style={s.card}>
                <View style={s.row}>
                  <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#991b1b", marginRight: 6 }}>{item.code}</Text>
                  <Text style={{ fontSize: 10, flex: 1 }}>{item.title}</Text>
                </View>
                <StatusBadge status="NON_COMPLIANT" />
                {item.notes && <Text style={s.notesText}>{item.notes}</Text>}
              </View>
            ));
          })}
        </ContentPage>
      )}
    </Document>
  );
}
