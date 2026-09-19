// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The menus of the dashboard navigation (top bar on desktop, side sheet on
 * phones). The same in both account modes: the client entries ("My clients",
 * "+ Add organization") live in the organization switcher, never here, where
 * a fifth menu pushed the top bar over the logo.
 */

import {
  AlertTriangle,
  Brain,
  Building2,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  Crosshair,
  Database,
  Eye,
  Gavel,
  HeartPulse,
  History,
  KeyRound,
  Landmark,
  Network,
  Scale,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  premium?: boolean;
}

export interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export function buildNavGroups(
  t: (key: string) => string,
  { stripeEnabled }: { stripeEnabled: boolean },
): NavGroup[] {
  return [
    {
      key: "getStarted",
      label: t("getStarted"),
      icon: Sparkles,
      items: [
        { href: "/governance/quickstart", label: t("quickStart"), icon: Sparkles },
      ],
    },
    {
      key: "aiSystemsGroup",
      label: t("aiSystemsGroup"),
      icon: Brain,
      items: [
        { href: "/governance/ai-registry", label: t("aiRegistry"), icon: Brain },
        { href: "/governance/risk-classification", label: t("riskClassification"), icon: ShieldAlert },
        { href: "/governance/threat-model", label: t("threatModel"), icon: Crosshair },
      ],
    },
    {
      key: "governanceGroup",
      label: t("governanceGroup"),
      icon: Scale,
      items: [
        { href: "/governance/program", label: t("program"), icon: Network },
        { href: "/governance/review", label: t("review"), icon: ShieldCheck },
        { href: "/governance/obligations", label: t("obligations"), icon: CalendarClock },
        { href: "/governance/assessments", label: t("assessments"), icon: ClipboardCheck },
        { href: "/governance/oversight", label: t("oversight"), icon: Eye },
        { href: "/governance/compliance", label: t("compliance"), icon: Scale },
        { href: "/governance/policies", label: t("policies"), icon: ScrollText },
        { href: "/governance/sensitive-data", label: t("sensitiveData"), icon: HeartPulse },
        { href: "/governance/board", label: t("boardReports"), icon: Landmark },
        { href: "/governance/audit", label: t("auditTrail"), icon: History },
      ],
    },
    {
      key: "operationsGroup",
      label: t("operationsGroup"),
      icon: AlertTriangle,
      items: [
        { href: "/governance/incidents", label: t("incidents"), icon: AlertTriangle },
        { href: "/governance/proceedings", label: t("proceedings"), icon: Gavel },
        { href: "/governance/vendors", label: t("vendors"), icon: Building2 },
        { href: "/governance/vendor-catalog", label: t("vendorCatalog"), icon: Database, premium: true },
        { href: "/governance/shadow-ai", label: t("shadowAi"), icon: Search, premium: true },
        // Offline licence activation for skills bought on TODO.LAW — always
        // visible: it is the purchase path when the Stripe store is off.
        { href: "/governance/skills", label: t("skills"), icon: KeyRound },
        // Billing is the hosted (Stripe) tier: hide the menu entry when the
        // store is off (sovereign posture).
        ...(stripeEnabled
          ? [{ href: "/governance/billing", label: t("billing"), icon: CreditCard }]
          : []),
      ],
    },
  ];
}
