// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import React from "react";
import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { getBrandConfig } from "@/config/brand";
import { tokens } from "../tokens";

const brand = getBrandConfig();

const s = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingRight: 56,
    paddingBottom: 56,
    paddingLeft: 56,
    fontFamily: tokens.typography.family.sans,
    color: tokens.color.text.primary,
    backgroundColor: tokens.color.surface.page,
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: tokens.color.brand.accent,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  wordmarkBrand: {
    flexDirection: "row",
    alignItems: "center",
  },
  wordmarkMark: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: tokens.color.brand.accent,
    marginRight: 10,
  },
  wordmarkText: {
    fontSize: tokens.typography.size.h4,
    fontFamily: tokens.typography.family.sans,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.color.brand.ink,
    letterSpacing: tokens.typography.letterSpacing.caps,
    textTransform: "uppercase",
  },
  wordmarkSubtle: {
    fontSize: tokens.typography.size.micro,
    color: tokens.color.text.muted,
    textTransform: "uppercase",
    letterSpacing: tokens.typography.letterSpacing.capsWide,
    fontWeight: tokens.typography.weight.medium,
  },
});

/**
 * Cover page shell: brand accent bar, top-left wordmark, free-flowing body.
 * Children provide the hero title, stat tiles, and content blocks.
 */
export function CoverFrame({
  children,
  rightEyebrow,
}: {
  children: React.ReactNode;
  rightEyebrow?: string;
}) {
  return (
    <Page size={tokens.page.size} style={s.page} wrap={false}>
      <View style={s.accentBar} fixed />
      <View style={s.wordmarkRow}>
        <View style={s.wordmarkBrand}>
          <View style={s.wordmarkMark} />
          <Text style={s.wordmarkText}>{brand.name}</Text>
        </View>
        {rightEyebrow && <Text style={s.wordmarkSubtle}>{rightEyebrow}</Text>}
      </View>
      {children}
    </Page>
  );
}
