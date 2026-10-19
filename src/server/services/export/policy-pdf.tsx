// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One policy as a PDF (@react-pdf/renderer, the same styles as the other
 * reports). The organization's name heads the first page and every page
 * header; the reference, version, status and dates follow, then the text.
 */

import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { s, PageHeader, PageFooter, PDF_COLORS } from "./pdf-styles";
import type { PolicyDocument, PolicyBlock } from "./policy-document";

function Block({ block }: { block: PolicyBlock }) {
  switch (block.kind) {
    case "heading":
      return (
        <Text
          style={{
            fontSize: block.level === 1 ? 13 : block.level === 2 ? 11.5 : 10.5,
            fontFamily: "Helvetica-Bold",
            marginTop: 10,
            marginBottom: 6,
          }}
          minPresenceAhead={40}
        >
          {block.text}
        </Text>
      );
    case "bullet":
      return (
        <View style={{ flexDirection: "row", marginBottom: 4, paddingLeft: 8 }}>
          <Text style={{ width: 10, fontSize: 9.5 }}>•</Text>
          <Text style={{ flex: 1, fontSize: 9.5, lineHeight: 1.5 }}>{block.text}</Text>
        </View>
      );
    case "numbered":
      return (
        <View style={{ flexDirection: "row", marginBottom: 4, paddingLeft: 8 }}>
          <Text style={{ width: 18, fontSize: 9.5 }}>{block.marker}</Text>
          <Text style={{ flex: 1, fontSize: 9.5, lineHeight: 1.5 }}>{block.text}</Text>
        </View>
      );
    default:
      return <Text style={[s.paragraph, { fontSize: 9.5 }]}>{block.text}</Text>;
  }
}

export function PolicyPdf({ doc, date }: { doc: PolicyDocument; date: string }) {
  return (
    <Document language={doc.locale} title={doc.title} author={doc.orgName}>
      <Page size="A4" style={s.page} wrap>
        <PageHeader title={doc.title} orgName={doc.orgName} />
        <Text
          style={{
            fontSize: 11,
            color: PDF_COLORS.MUTED,
            textTransform: "uppercase",
            letterSpacing: 1.5,
            marginBottom: 6,
          }}
        >
          {doc.orgName}
        </Text>
        <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 12 }}>{doc.title}</Text>
        <View style={{ borderTopWidth: 2, borderTopColor: PDF_COLORS.PRIMARY, paddingTop: 8, marginBottom: 12 }}>
          {doc.meta.map((m) => (
            <View key={m.label} style={s.metaRow}>
              <Text style={s.metaLabel}>{m.label}</Text>
              <Text style={s.metaValue}>{m.value}</Text>
            </View>
          ))}
        </View>
        {doc.draftNotice && (
          <Text style={[s.calloutText, { marginBottom: 10, fontFamily: "Helvetica-Bold" }]}>{doc.draftNotice}</Text>
        )}
        {doc.description && (
          <Text style={[s.paragraph, { fontStyle: "italic", color: PDF_COLORS.MUTED }]}>{doc.description}</Text>
        )}
        <View style={s.divider} />
        {doc.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
        {doc.systems.length > 0 && (
          <View style={{ marginTop: 14 }} wrap={false}>
            <Text style={{ fontSize: 10.5, fontFamily: "Helvetica-Bold", marginBottom: 6 }}>{doc.systemsTitle}</Text>
            {doc.systems.map((name) => (
              <View key={name} style={{ flexDirection: "row", marginBottom: 3, paddingLeft: 8 }}>
                <Text style={{ width: 10, fontSize: 9 }}>•</Text>
                <Text style={{ flex: 1, fontSize: 9 }}>{name}</Text>
              </View>
            ))}
          </View>
        )}
        {doc.stamp.length > 0 && (
          <View style={{ marginTop: 18 }}>
            {doc.stamp.map((line) => (
              <Text key={line} style={{ fontSize: 7, color: PDF_COLORS.MUTED }}>
                {line}
              </Text>
            ))}
          </View>
        )}
        <PageFooter date={date} locale={doc.locale} />
      </Page>
    </Document>
  );
}
