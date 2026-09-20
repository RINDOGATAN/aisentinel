// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Risk-tier pill for the PDF reports: same geometry as PillBadge (solid),
 * but a neutral fill, coloured pips and the label in the body ink. Colours and
 * pip counts come from the shared tier tokens.
 *
 * The pips are the shape signal: four for unacceptable down to one for minimal,
 * and a single hollow pip for not classified. A PDF is read alone and often on
 * paper, so the tier has to survive a monochrome print; counting does, hue does
 * not. The label always names the tier as well.
 */

import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { tokens } from "../tokens";
import { TIER_MARKER, TIER_SURFACES, tierPips, toRiskTier } from "@/config/risk-tier-palette";

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
  pips: { flexDirection: "row", alignItems: "center", marginRight: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 1.5 },
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
  const { count, filled } = tierPips(tier);
  return (
    <View style={s.pill}>
      <View style={s.pips}>
        {Array.from({ length: count }, (_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              filled ? { backgroundColor: marker } : { borderWidth: 1, borderColor: marker },
            ]}
          />
        ))}
      </View>
      <Text style={s.text}>{children}</Text>
    </View>
  );
}
