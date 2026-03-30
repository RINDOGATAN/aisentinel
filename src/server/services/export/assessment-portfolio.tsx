import React from "react";
import { Document, View, Text } from "@react-pdf/renderer";
import {
  ContentPage, CoverPage, DataTable, MetadataBlock,
  StatCard, AccentSectionHeader, StatusBadge,
  s, fmtDate,
} from "./pdf-styles";

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
}: {
  assessments: AssessmentExportData[];
  orgName: string;
}) {
  const date = fmtDate(new Date());

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
    <Document>
      <CoverPage
        orgName={orgName}
        title="AI Risk Assessment Portfolio"
        subtitle="Overview of all AI risk assessments and their outcomes"
        date={date}
      />

      <ContentPage title="Assessment Portfolio" orgName={orgName} date={date}>
        <Text style={s.sectionTitle}>Executive Summary</Text>
        <View style={s.statsGrid}>
          <StatCard value={assessments.length} label="Total Assessments" />
          <StatCard value={byStatus["APPROVED"] || 0} label="Approved" />
          <StatCard value={byStatus["IN_PROGRESS"] || 0} label="In Progress" />
          <StatCard value={avgScore} label="Avg Risk Score" />
        </View>

        <Text style={s.sectionTitle}>By Assessment Type</Text>
        <DataTable
          headers={["Type", "Count", "Percentage"]}
          colWidths={[2, 1, 1]}
          rows={Object.entries(byType).map(([type, count]) => [
            type.replace(/_/g, " "),
            count,
            `${Math.round((count / assessments.length) * 100)}%`,
          ])}
        />

        <Text style={s.sectionTitle}>By Status</Text>
        <DataTable
          headers={["Status", "Count", "Percentage"]}
          colWidths={[2, 1, 1]}
          rows={Object.entries(byStatus).map(([status, count]) => [
            status.replace(/_/g, " "),
            count,
            `${Math.round((count / assessments.length) * 100)}%`,
          ])}
        />
      </ContentPage>

      <ContentPage title="Assessment Portfolio" orgName={orgName} date={date}>
        <Text style={s.sectionTitle}>Assessment Register</Text>
        <DataTable
          headers={["Title", "AI System", "Type", "Status", "Risk Score", "Created"]}
          colWidths={[3, 2, 1.2, 1.2, 1, 1]}
          rows={assessments.map((a) => [
            a.title,
            a.aiSystemName,
            a.type.replace(/_/g, " "),
            a.status.replace(/_/g, " "),
            a.riskScore != null ? a.riskScore.toFixed(1) : "—",
            fmtDate(a.createdAt),
          ])}
        />
      </ContentPage>

      {assessments.map((a) => (
        <ContentPage key={a.id} title="Assessment Portfolio" orgName={orgName} date={date}>
          <AccentSectionHeader title={a.title} />
          <StatusBadge status={a.status} />
          <MetadataBlock
            items={[
              { label: "AI System", value: a.aiSystemName },
              { label: "Type", value: a.type.replace(/_/g, " ") },
              { label: "Template", value: a.templateName },
              { label: "Risk Score", value: a.riskScore != null ? a.riskScore.toFixed(1) : null },
              { label: "Created By", value: a.createdBy },
              { label: "Created", value: fmtDate(a.createdAt) },
              { label: "Reviewed By", value: a.reviewedBy },
              { label: "Reviewed", value: fmtDate(a.reviewedAt) },
              { label: "Approved By", value: a.approvedBy },
              { label: "Approved", value: fmtDate(a.approvedAt) },
            ]}
          />
        </ContentPage>
      ))}
    </Document>
  );
}
