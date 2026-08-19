// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Design tokens for the modern PDF reports (Governance Program and future
 * reports). Single source of truth for color, typography, spacing, radii,
 * and page geometry.
 *
 * Ported from DPO Central's export design system and re-skinned for
 * AI SENTINEL: the accent comes from the runtime brand config, so
 * white-label deployments get their own accent in PDFs (the legacy
 * pdf-styles.tsx hardcodes amber and is intentionally left untouched —
 * the four legacy reports keep consuming it).
 *
 * Risk / glyph / stage colors are re-exported from src/lib/program-map/
 * palette.ts — the single color source shared with the interactive map,
 * so web and PDF cannot drift.
 */

import { getBrandConfig } from "@/config/brand";
import {
  RISK_COLORS,
  UNCLASSIFIED_COLOR,
  VENDOR_RISK_COLORS,
  GLYPH_COLORS,
  STAGE_COLORS,
  CHART,
  CANVAS,
  riskColor,
} from "@/lib/program-map/palette";

const brand = getBrandConfig();

export const tokens = {
  color: {
    brand: {
      /** Runtime brand accent (amber #f5a623 by default; white-label aware) */
      accent: brand.colors.primary,
      /** Primary ink — matches the brand's dark ground */
      ink: "#1a1a1a",
      inkSoft: "#3f3f3c",
    },
    semantic: {
      success: { bg: "#ecfdf5", fg: "#065f46", solid: "#059669" },
      warning: { bg: "#fffbeb", fg: "#92400e", solid: "#d97706" },
      danger: { bg: "#fef2f2", fg: "#991b1b", solid: "#dc2626" },
      info: { bg: "#eff6ff", fg: "#1e3a8a", solid: "#2563eb" },
      neutral: { bg: "#f8fafc", fg: "#475569", solid: "#64748b" },
    },
    surface: {
      page: "#ffffff",
      subtle: "#f8f8f6",
      subtleAlt: "#efefec",
      tintAccent: "#fdf5e6",
      tintAmber: "#fffbeb",
      tintRed: "#fef2f2",
      tintGreen: "#ecfdf5",
      tintBlue: "#eff6ff",
    },
    text: {
      primary: "#1a1a1a",
      secondary: "#4b4b47",
      muted: "#6f6f69",
      inverse: "#ffffff",
    },
    border: {
      hairline: "#e5e4e0",
      rule: brand.colors.primary,
    },
  },
  typography: {
    family: { sans: "Inter" },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 } as const,
    size: {
      micro: 7,
      caption: 8,
      body: 9,
      bodyLg: 10,
      h4: 11,
      h3: 13,
      h2: 16,
      h1: 22,
      display: 32,
    },
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      caps: 1.2,
      capsWide: 2,
    },
    lineHeight: { tight: 1.2, normal: 1.45, relaxed: 1.6 },
  },
  space: {
    0: 0,
    1: 2,
    2: 4,
    3: 6,
    4: 8,
    5: 12,
    6: 16,
    7: 20,
    8: 24,
    9: 32,
    10: 40,
    11: 56,
  },
  radius: { none: 0, sm: 2, md: 4, lg: 8, pill: 999 },
  page: {
    size: "A4" as const,
    margin: { top: 48, right: 48, bottom: 56, left: 48 },
  },
  chart: {
    donut: { size: 120, thickness: 14 },
    bar: { height: 14, gap: 6, pillRadius: 2, trackOpacity: 0.12 },
    radar: { size: 220, rings: [25, 50, 75, 100] as const },
  },
} as const;

export type Tokens = typeof tokens;
export type SemanticTone = keyof typeof tokens.color.semantic;

// Shared map palette — re-exported so PDF code has one import site and the
// interactive map stays the single source of these colors.
export {
  RISK_COLORS,
  UNCLASSIFIED_COLOR,
  VENDOR_RISK_COLORS,
  GLYPH_COLORS,
  STAGE_COLORS,
  CHART,
  CANVAS,
  riskColor,
};
