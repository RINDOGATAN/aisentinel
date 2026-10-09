// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The lock beside a premium menu entry (owner's decision, 9 October 2026):
 * shown only where the page itself would show its locked state, which is a
 * deployment that enforces licences, for an organisation without one. Never
 * on the hosted pilot, never where every skill is free.
 *
 * The decision is the page's own entitlement check; these tests run that check
 * under each kind of deployment, feed its answers to the menu rule, and render
 * the menu to prove the lock and its label.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LayoutDashboard } from "lucide-react";

vi.mock("@/config/features", () => ({
  features: { allSkillsFree: false },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    skillPackage: { findFirst: vi.fn() },
    customerOrganization: { findFirst: vi.fn() },
  },
}));

import { features } from "@/config/features";
import prisma from "@/lib/prisma";
import { hasShadowAiAccess, hasVendorCatalogAccess } from "@/server/services/licensing/entitlement";
import { lockedMenuHrefs, PREMIUM_MENU_ENTRIES } from "@/lib/menu-locks";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { AI_SENTINEL_PATH } from "./path-config";
import { PathMenu } from "./path-menu";

const BOTH = ["/governance/shadow-ai", "/governance/vendor-catalog"];

/** The menu's answer for one organisation, from the pages' own access checks. */
async function menuLocksFor(organizationId: string) {
  return lockedMenuHrefs({
    shadowAi: await hasShadowAiAccess(organizationId),
    vendorCatalog: await hasVendorCatalogAccess(organizationId),
  });
}

describe("the menu rule", () => {
  it("locks an entry only when its page answered no access", () => {
    expect(lockedMenuHrefs({ shadowAi: false, vendorCatalog: false })).toEqual(BOTH);
    expect(lockedMenuHrefs({ shadowAi: true, vendorCatalog: false })).toEqual([
      "/governance/vendor-catalog",
    ]);
    expect(lockedMenuHrefs({ shadowAi: true, vendorCatalog: true })).toEqual([]);
  });

  it("draws no lock while the answer is still on its way", () => {
    expect(lockedMenuHrefs({})).toEqual([]);
    expect(lockedMenuHrefs({ shadowAi: undefined, vendorCatalog: undefined })).toEqual([]);
  });

  it("covers the premium entries the menu actually shows", () => {
    const stepHrefs = AI_SENTINEL_PATH.stages.flatMap((s) => s.steps.map((step) => step.href));
    const libraryHrefs = AI_SENTINEL_PATH.library({ stripeEnabled: false }).map((i) => i.href);
    for (const entry of PREMIUM_MENU_ENTRIES) {
      expect([...stepHrefs, ...libraryHrefs]).toContain(entry.href);
    }
  });
});

describe("by deployment", () => {
  const savedPilot = process.env.NEXT_PUBLIC_HOSTED_PILOT;

  beforeEach(() => {
    vi.clearAllMocks();
    features.allSkillsFree = false;
    process.env.NEXT_PUBLIC_HOSTED_PILOT = "false";
  });

  afterEach(() => {
    if (savedPilot === undefined) delete process.env.NEXT_PUBLIC_HOSTED_PILOT;
    else process.env.NEXT_PUBLIC_HOSTED_PILOT = savedPilot;
  });

  it("enforced, no licence: both premium entries carry the lock", async () => {
    vi.mocked(prisma.skillPackage.findFirst).mockResolvedValue({ id: "pkg" } as never);
    vi.mocked(prisma.customerOrganization.findFirst).mockResolvedValue(null as never);

    expect(await menuLocksFor("org-1")).toEqual(BOTH);
  });

  it("enforced, licence held: no lock", async () => {
    vi.mocked(prisma.skillPackage.findFirst).mockResolvedValue({ id: "pkg" } as never);
    vi.mocked(prisma.customerOrganization.findFirst).mockResolvedValue({
      customer: {
        entitlements: [{ id: "e1", status: "ACTIVE", licenseType: "PERPETUAL", expiresAt: null }],
      },
    } as never);

    expect(await menuLocksFor("org-1")).toEqual([]);
  });

  it("not enforced (every skill free, the kit's posture): no lock, no lookup", async () => {
    features.allSkillsFree = true;

    expect(await menuLocksFor("org-1")).toEqual([]);
    expect(prisma.skillPackage.findFirst).not.toHaveBeenCalled();
  });

  it("the hosted pilot: no lock, even where skills are not declared free", async () => {
    process.env.NEXT_PUBLIC_HOSTED_PILOT = "true";

    expect(await menuLocksFor("org-1")).toEqual([]);
    expect(prisma.skillPackage.findFirst).not.toHaveBeenCalled();
  });
});

describe("menu and page ask the same question", () => {
  const src = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

  it("the menu runs the pages' own access queries", () => {
    const hook = src("src/components/guided/use-menu-locks.ts");
    expect(src("src/app/(dashboard)/governance/shadow-ai/page.tsx")).toContain(
      "trpc.shadowAi.checkAccess.useQuery",
    );
    expect(src("src/app/(dashboard)/governance/vendor-catalog/page.tsx")).toContain(
      "trpc.vendorCatalog.checkAccess.useQuery",
    );
    expect(hook).toContain("trpc.shadowAi.checkAccess.useQuery");
    expect(hook).toContain("trpc.vendorCatalog.checkAccess.useQuery");
  });
});

describe("the lock in the menu", () => {
  const messages = { en: en.guided, es: es.guided } as const;
  /** A translator over the `guided` namespace that returns the key when a value is missing. */
  const translator = (locale: "en" | "es") => (key: string) => {
    const value = key
      .split(".")
      .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages[locale]);
    return typeof value === "string" ? value : key;
  };

  const render = (locked: string[], locale: "en" | "es" = "en", collapsed = false) =>
    renderToStaticMarkup(
      <PathMenu
        config={AI_SENTINEL_PATH}
        statuses={null}
        pathname="/governance"
        stripeEnabled={false}
        variant="sidebar"
        collapsed={collapsed}
        t={translator(locale)}
        overview={{ href: "/governance", icon: LayoutDashboard }}
        locked={locked}
      />,
    );

  const locks = (html: string) => html.match(/data-testid="menu-lock"/g)?.length ?? 0;

  it("draws one labelled lock per locked entry, with no price", () => {
    const html = render(BOTH);
    expect(locks(html)).toBe(2);
    expect(html).toContain("Requires a licence");
    expect(html).not.toMatch(/[$€£]|\/yr|\/mo/);
  });

  it("says it in Spanish", () => {
    expect(render(BOTH, "es")).toContain("Requiere una licencia");
  });

  it("draws nothing where nothing is locked", () => {
    const html = render([]);
    expect(locks(html)).toBe(0);
    expect(html).not.toContain("Requires a licence");
  });

  it("keeps the label on the icons-only menu", () => {
    const html = render(BOTH, "en", true);
    // Shadow AI is a step (not drawn when icons only); the catalogue is in the library.
    expect(locks(html)).toBe(1);
    expect(html).toContain("requires a licence");
  });
});
