// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The first page of a PDF that goes into the program pack as a draft: it says
 * the document is not finished and names the gaps that remain, in the words
 * of the document register (src/config/document-register.ts). A reader who
 * opens only this one file still learns it is a draft.
 */

import React from "react";
import { Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface DraftNote {
  title: string;
  intro: string;
  gaps: string[];
  generated: string;
}

const styles = StyleSheet.create({
  page: { padding: 56, fontFamily: "Helvetica", fontSize: 11, color: "#1a1a1a" },
  band: { borderLeftWidth: 4, borderLeftColor: "#f5a623", paddingLeft: 14 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 18, marginBottom: 10 },
  intro: { marginBottom: 12, lineHeight: 1.4 },
  gap: { marginBottom: 6, lineHeight: 1.4 },
  generated: { marginTop: 18, fontSize: 9, color: "#555555" },
});

export function DraftGapsPage({ note }: { note: DraftNote }) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.band}>
        <Text style={styles.title}>{note.title}</Text>
        <Text style={styles.intro}>{note.intro}</Text>
        {note.gaps.map((gap, i) => (
          <Text key={i} style={styles.gap}>
            {`- ${gap}`}
          </Text>
        ))}
        <Text style={styles.generated}>{note.generated}</Text>
      </View>
    </Page>
  );
}
