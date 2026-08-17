// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import Link from "next/link";
import {
  Brain,
  ShieldAlert,
  ClipboardCheck,
  Eye,
  AlertTriangle,
  Scale,
  Building2,
  ScrollText,
  Search,
  BookMarked,
  FileCheck,
  Activity,
  Megaphone,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { features } from "@/config/features";

export const metadata = {
  title: "Documentation — AI SENTINEL",
  description:
    "Learn how to use AI SENTINEL for AI governance, EU AI Act compliance, risk classification, and incident management.",
};

// Catalog sizes are read from the database rather than hardcoded: both grow on
// every vendor.watch sync, and stale literals here previously understated them
// by hundreds of entries. Revalidate hourly so docs traffic does not hit the DB
// on every view.
export const revalidate = 3600;

async function getCatalogCounts() {
  try {
    const [vendors, tools] = await Promise.all([
      prisma.vendorCatalog.count(),
      prisma.shadowAITool.count(),
    ]);
    return { vendors, tools };
  } catch {
    // Docs must render even when the database is unreachable.
    return { vendors: null, tools: null };
  }
}

// Rounded down to the nearest 50 so the copy reads as a claim about scale
// rather than a number that is wrong the moment the next sync lands.
function approx(n: number | null) {
  if (!n) return null;
  return `${Math.floor(n / 50) * 50}+`;
}

const modules = [
  {
    href: "/docs/ai-registry",
    icon: Brain,
    title: "AI Registry",
    description: "Inventory all AI systems, models, and agents with lifecycle tracking and role assignment.",
  },
  {
    href: "/docs/risk-classification",
    icon: ShieldAlert,
    title: "Risk Classification",
    description: "EU AI Act four-tier risk classification with guided Annex III wizard and classification history.",
  },
  {
    href: "/docs/assessments",
    icon: ClipboardCheck,
    title: "Assessments",
    description: "FRIA, conformity, AI risk, and bias/fairness assessments with templates and approval workflows.",
  },
  {
    href: "/docs/oversight",
    icon: Eye,
    title: "Human Oversight",
    description: "Approval gates, review scheduling, and decision logging for Art. 14 compliance.",
  },
  {
    href: "/docs/incidents",
    icon: AlertTriangle,
    title: "AI Incidents",
    description: "Track AI-specific failures, coordinate response tasks, and manage Art. 73 authority notifications.",
  },
  {
    href: "/docs/transparency",
    icon: Megaphone,
    title: "Transparency (Art. 50)",
    description: "Per-system Art. 50 obligations, the synthetic-content marking deadline, and the AI interaction statement.",
  },
  {
    href: "/docs/compliance",
    icon: Scale,
    title: "Compliance",
    description: "Framework mapping for EU AI Act, NIST AI RMF, and ISO 42001 with evidence management.",
  },
  {
    href: "/docs/vendors",
    icon: Building2,
    title: "Vendor Risk",
    description: "Third-party AI vendor management with risk assessment, contract tracking, and due diligence.",
  },
  {
    href: "/docs/policies",
    icon: ScrollText,
    title: "Policy Management",
    description: "AI governance policies with versioning, approval workflow, and system linking.",
  },
];

const premiumModulesFor = (counts: { vendors: number | null; tools: number | null }) => [
  {
    href: "/docs/shadow-ai",
    icon: Search,
    title: "Shadow AI Discovery",
    description: `Discover unauthorized AI tools adopted by employees, against a catalog of ${
      counts.tools ?? "60+"
    } known tools. Self-reporting portal, triage workflow, and promotion to formal governance.`,
  },
  {
    href: "/docs/vendor-catalog",
    icon: BookMarked,
    title: "AI Vendor Catalog",
    description: `Pre-audited catalog of ${
      approx(counts.vendors) ?? "800+"
    } AI vendors with risk profiles, compliance certifications, and governance metadata.`,
  },
  {
    href: "/docs/conformity-assessment",
    icon: FileCheck,
    title: "Conformity Assessment",
    description: "EU AI Act Art. 43 conformity assessment template for high-risk AI systems with structured evaluation sections.",
  },
  {
    href: "/docs/bias-fairness",
    icon: Activity,
    title: "Bias & Fairness Assessment",
    description: "Structured bias and fairness evaluation for AI systems — detect discrimination risks and document mitigations.",
  },
];

const roles = [
  {
    name: "Owner",
    description: "Billing, team management, organization settings",
  },
  {
    name: "Admin",
    description: "User management, module configuration, full governance access",
  },
  {
    name: "AI Officer",
    description: "All governance modules, assessments, risk classification, incident management",
  },
  {
    name: "Member",
    description: "Create and edit records, submit assessments, report incidents",
  },
  {
    name: "Viewer",
    description: "Read-only dashboard and report access",
  },
];

export default async function DocsPage() {
  const counts = await getCatalogCounts();
  const premiumModules = premiumModulesFor(counts);
  const allFree = features.allSkillsFree;

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          AI SENTINEL
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          A purpose-built platform for AI governance. Manage your AI system inventory, EU AI Act
          compliance, risk classification, human oversight, and AI-specific incidents — all in one
          place.
        </p>
      </section>

      {/* Quick Start */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Quick Start</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              step: "1",
              title: "Sign in",
              description: "Sign in via email magic link or Google OAuth.",
            },
            {
              step: "2",
              title: "Create or join your organization",
              description:
                "Set up your organization and invite team members. Users with a matching email domain are auto-joined.",
            },
            {
              step: "3",
              title: "Register your AI systems",
              description:
                "Build your AI inventory by registering systems, models, and agents. Assign risk levels and owners.",
            },
            {
              step: "4",
              title: "Govern your AI",
              description:
                "Run assessments, set up oversight gates, map compliance frameworks, manage vendors, and track incidents.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-border bg-card p-5 flex gap-4"
            >
              <div className="text-2xl font-display text-primary/40 shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* User Roles */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">User Roles</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div
              key={role.name}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-semibold mb-1">{role.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {role.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Modules</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="rounded-xl border border-border bg-card p-5 flex gap-4 group hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Premium Modules */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-2">
          {allFree ? "Add-on Modules" : "Premium Skills"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {allFree ? (
            <>
              Included on this instance — no licence or subscription required. These
              modules were previously sold as add-ons; they are now enabled for
              everyone here.
            </>
          ) : (
            <>
              Add-on modules, unlocked per organization with a TODO.LAW licence file
              on the{" "}
              <Link href="/governance/skills" className="text-primary hover:underline">
                skills page
              </Link>
              .
            </>
          )}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {premiumModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="rounded-xl border border-border bg-card p-5 flex gap-4 group hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {mod.title}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                      {allFree ? "Included" : "Licensed"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features without a dedicated guide yet */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-2">
          Also in the app
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Shipped features that do not have a full guide here yet. The links go to
          the app itself, so you will be asked to sign in.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              href: "/governance/quickstart",
              title: "Quick Start wizard",
              description:
                "Bootstrap a programme from an industry template, or import an existing vendor portfolio.",
            },
            {
              href: "/governance/settings",
              title: "AI posture",
              description:
                "Choose whether embedded AI assists are off, use a cloud LLM, or route through a local gateway. Off by default — no AI call leaves your instance until an admin turns it on.",
            },
            {
              href: "/governance/skills",
              title: "Skills & licences",
              description:
                "Activate TODO.LAW licence files offline. Owner and admin only; a licence never installs code, it only unlocks an entitlement.",
            },
            {
              href: "/governance/clients",
              title: "Managed organizations",
              description:
                "For governance professionals running programmes for several clients: switch between organizations you manage.",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-border bg-card p-5 group hover:border-primary/30 transition-colors"
            >
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Licensing */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Open Core Licensing
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="inline-block px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              AGPL-3.0
            </div>
            <h3 className="text-lg font-semibold mb-3">Core</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>AI Registry &amp; lifecycle tracking</li>
              <li>EU AI Act risk classification</li>
              <li>FRIA &amp; AI Risk assessments</li>
              <li>Human oversight &amp; approval gates</li>
              <li>AI incident management</li>
              <li>Compliance mapping (EU AI Act, NIST, ISO 42001)</li>
              <li>Vendor risk management</li>
              <li>Policy management</li>
              <li>Executive dashboard</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="inline-block px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-4">
              Commercial
            </div>
            <h3 className="text-lg font-semibold mb-3">Premium</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Conformity Assessment template (Art. 43)</li>
              <li>Bias &amp; Fairness Assessment</li>
              <li>
                Shadow AI Discovery ({counts.tools ?? "60+"}-tool catalog)
              </li>
              <li>AI Vendor Catalog (vendor.watch integration)</li>
            </ul>
            {allFree && (
              <p className="mt-4 text-xs text-muted-foreground">
                Enabled for everyone on this instance. The commercial path is an
                offline licence file, not a subscription.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
