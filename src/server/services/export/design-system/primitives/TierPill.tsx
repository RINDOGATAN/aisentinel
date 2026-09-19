// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Risk-tier pill for the PDF reports: same geometry as PillBadge (solid),
 * but a neutral fill, a coloured dot (hollow ring when not classified) and
 * the label in the body ink. Colours come from the shared tier tokens.
 */

import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { tokens } from "../tokens";
import { TIER_MARKER, TIER_SURFACES, toRiskTier } from "@/config/risk-tier-palette";

const s = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.space[4],
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    alignSelf: "flex-start",
    backgroundColor: TIER_SURFACES.light.chip,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 3 },
  text: {
    fontSize: tokens.typography.size.micro,
    fontFamily: tokens.typography.family.sans,
    fontWeight: tokens.typography.weight.semibold,
    letterSpacing: 0.3,
    color: TIER_SURFACES.light.text,
  },
});

export function TierPill({
  level,
  children,
}: {
  level: string | null | undefined;
  children: React.ReactNode;
}) {
  const tier = toRiskTier(level);
  const marker = TIER_MARKER.light[tier];
  return (
    <View style={s.pill}>
      <View
        style={[
          s.dot,
          tier === "UNCLASSIFIED"
            ? { borderWidth: 1, borderColor: marker }
            : { backgroundColor: marker },
        ]}
      />
      <Text style={s.text}>{children}</Text>
    </View>
  );
}
