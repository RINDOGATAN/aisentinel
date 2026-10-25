// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "Move to the paid plan" in the pilot bar: shown only with the automatic
 * upgrade on (decided on the server and passed as `upgrade`), only to an owner
 * or administrator of the selected pilot organization, in both languages, and
 * pointing at the checkout route for that organization.
 */
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const selected = vi.hoisted(() => ({
  org: null as null | { id: string; name: string; slug: string; plan?: string; role?: string },
}));

vi.mock("@/lib/organization-context", () => ({
  useOrganization: () => ({ organization: selected.org }),
}));
// A pilot in its free window, as the Settings card's status reports it.
vi.mock("@/lib/trpc", () => ({
  trpc: {
    pilot: {
      status: {
        useQuery: (_input: unknown, opts: { enabled?: boolean }) => ({
          data: opts?.enabled
            ? {
                active: true,
                endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                readOnly: false,
                startedAt: new Date(),
              }
            : undefined,
        }),
      },
    },
  },
}));

import { PILOT_END_BAR_COPY } from "@/config/pilot";
import { OrganizationPilotEndBar } from "./pilot-banner";

const render = (locale: "en" | "es", upgrade: boolean, upgradeMonthly = false) =>
  renderToStaticMarkup(<OrganizationPilotEndBar locale={locale} upgrade={upgrade} upgradeMonthly={upgradeMonthly} />);

const pilotOrg = (role: string, plan = "PILOT") => ({ id: "org1", name: "Org", slug: "org", plan, role });

describe("pilot bar: move to the paid plan", () => {
  it("is offered to an owner and an admin when switched on, in both languages", () => {
    for (const role of ["OWNER", "ADMIN"]) {
      selected.org = pilotOrg(role);
      const html = render("en", true);
      expect(html).toContain('data-testid="pilot-upgrade-link"');
      expect(html).toContain('href="/api/plan/checkout?org=org1"');
      expect(html).toContain("Move to the paid plan");
    }
    expect(render("es", true)).toContain("Pasar al plan de pago");
  });

  it("is not offered when switched off, to other roles, or without an organization", () => {
    selected.org = pilotOrg("OWNER");
    expect(render("en", false)).toContain('data-testid="pilot-end-bar"');
    expect(render("en", false)).not.toContain("pilot-upgrade-link");
    for (const role of ["MEMBER", "VIEWER", "AUDITOR"]) {
      selected.org = pilotOrg(role);
      expect(render("en", true)).not.toContain("pilot-upgrade-link");
    }
    selected.org = null;
    expect(render("en", true)).toBe("");
  });

  it("is absent with the whole bar on the paid plan", () => {
    selected.org = pilotOrg("OWNER", "EU_CLOUD");
    expect(render("en", true)).toBe("");
  });

  it("states no price", () => {
    expect(PILOT_END_BAR_COPY.en.upgrade).not.toMatch(/\d|€|\$/);
    expect(PILOT_END_BAR_COPY.es.upgrade).not.toMatch(/\d|€|\$/);
  });
});

describe("pilot bar: monthly and yearly", () => {
  it("offers two links, monthly then yearly, once the monthly link is set", () => {
    selected.org = pilotOrg("OWNER");
    const html = render("en", true, true);
    expect(html).toContain('href="/api/plan/checkout?org=org1&amp;interval=month"');
    expect(html).toContain('data-testid="pilot-upgrade-monthly-link"');
    expect(html).toContain('href="/api/plan/checkout?org=org1"');
    expect(html.indexOf("Pay monthly")).toBeGreaterThan(-1);
    expect(html.indexOf("Pay monthly")).toBeLessThan(html.indexOf("Pay yearly"));
    expect(html).not.toContain("Move to the paid plan");
    const es = render("es", true, true);
    expect(es).toContain("Pago mensual");
    expect(es).toContain("Pago anual");
  });

  it("keeps the single link while monthly is not set, and shows neither to other roles", () => {
    selected.org = pilotOrg("OWNER");
    expect(render("en", true, false)).toContain("Move to the paid plan");
    expect(render("en", true, false)).not.toContain("pilot-upgrade-monthly-link");
    selected.org = pilotOrg("MEMBER");
    expect(render("en", true, true)).not.toContain("pilot-upgrade");
  });
});
