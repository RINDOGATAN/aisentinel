// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import React from "react";
import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { getBrandConfig } from "@/config/brand";
import { tokens } from "../tokens";

const brand = getBrandConfig();

const s = StyleSheet.create({
  page: {
    paddingTop: tokens.page.margin.top,
    paddingRight: tokens.page.margin.right,
    paddingBottom: tokens.page.margin.bottom,
    paddingLeft: tokens.page.margin.left,
    fontFamily: tokens.typography.family.sans,
    fontSize: tokens.typography.size.body,
    color: tokens.color.text.primary,
    backgroundColor: tokens.color.surface.page,
  },
  topRule: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: tokens.color.brand.accent,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingBottom: tokens.space[3],
    marginBottom: tokens.space[6],
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.color.border.hairline,
  },
  headerLeft: {
    fontSize: tokens.typography.size.micro,
    fontFamily: tokens.typography.family.sans,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.color.text.muted,
    textTransform: "uppercase",
    letterSpacing: tokens.typography.letterSpacing.caps,
  },
  headerRight: {
    fontSize: tokens.typography.size.caption,
    color: tokens.color.text.secondary,
    fontWeight: tokens.typography.weight.medium,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: tokens.page.margin.left,
    right: tokens.page.margin.right,
    fontSize: tokens.typography.size.micro,
    color: tokens.color.text.muted,
    borderTopWidth: 0.5,
    borderTopColor: tokens.color.border.hairline,
    paddingTop: tokens.space[3],
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerDisclaimer: {
    fontSize: tokens.typography.size.micro,
    color: tokens.color.text.muted,
    marginBottom: 3,
  },
  footerLabel: {
    fontSize: tokens.typography.size.micro,
    color: tokens.color.text.muted,
    textTransform: "uppercase",
    letterSpacing: tokens.typography.letterSpacing.caps,
    fontWeight: tokens.typography.weight.medium,
  },
});

/**
 * Content page shell with fixed header/footer. All human-readable strings
 * (eyebrow, disclaimer) arrive translated as props — no i18n in primitives.
 */
export function PageFrame({
  eyebrow,
  orgName,
  date,
  disclaimer,
  children,
  showTopRule = true,
  orientation = "portrait",
}: {
  eyebrow: string;
  orgName: string;
  date: string;
  /** Translated one-line disclaimer for the footer; omitted if absent */
  disclaimer?: string;
  children: React.ReactNode;
  showTopRule?: boolean;
  orientation?: "portrait" | "landscape";
}) {
  return (
    <Page
      size={tokens.page.size}
      orientation={orientation}
      style={s.page}
      wrap
    >
      {showTopRule && <View style={s.topRule} fixed />}
      <View style={s.header} fixed>
        <Text style={s.headerLeft}>{eyebrow}</Text>
        <Text style={s.headerRight}>{orgName}</Text>
      </View>
      {children}
      <View style={s.footer} fixed>
        {disclaimer && <Text style={s.footerDisclaimer}>{disclaimer}</Text>}
        <View style={s.footerRow}>
          <Text style={s.footerLabel}>{brand.name}</Text>
          <Text style={s.footerLabel}>{date}</Text>
          <Text
            style={s.footerLabel}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </View>
    </Page>
  );
}
