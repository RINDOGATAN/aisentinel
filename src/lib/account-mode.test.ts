// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { UserType } from "@prisma/client";
import {
  ADD_ORGANIZATION_HREF,
  CLIENTS_DASHBOARD_HREF,
  DEFAULT_USER_TYPE,
  PORTFOLIO_ADD_HREF,
  PORTFOLIO_HREF,
  accountMode,
  organizationSwitcherView,
} from "./account-mode";
import { readFileSync } from "node:fs";
import { buildNavGroups } from "@/components/nav-groups";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";

describe("account mode", () => {
  it("defaults a new account to own-organization mode", () => {
    expect(DEFAULT_USER_TYPE).toBe(UserType.BUSINESS_USER);
    expect(accountMode(DEFAULT_USER_TYPE)).toBe("own");
  });

  it("reads client mode only from the explicit setting", () => {
    expect(accountMode(UserType.AI_GOVERNANCE_CONSULTANT)).toBe("clients");
    expect(accountMode(UserType.BUSINESS_USER)).toBe("own");
    expect(accountMode(null)).toBe("own");
    expect(accountMode(undefined)).toBe("own");
    expect(accountMode("SOMETHING_ELSE")).toBe("own");
  });

  it("shows no switcher and no other companies in own-organization mode", () => {
    for (const value of [UserType.BUSINESS_USER, null, undefined]) {
      expect(organizationSwitcherView(value)).toEqual({
        show: false,
        listOrganizations: false,
        clientEntries: false,
      });
    }
  });

  it("shows the switcher with the client entries in client mode", () => {
    expect(organizationSwitcherView(UserType.AI_GOVERNANCE_CONSULTANT)).toEqual({
      show: true,
      listOrganizations: true,
      clientEntries: true,
    });
  });

  it("sends the client entries to the existing dashboard and create flow", () => {
    expect(CLIENTS_DASHBOARD_HREF).toBe("/governance/clients");
    expect(ADD_ORGANIZATION_HREF).toBe("/governance/clients?add=1");
  });

  it("keeps Guided's add flow on the portfolio, with the same dialog as the client cards", () => {
    expect(PORTFOLIO_HREF).toBe("/governance/portfolio");
    expect(PORTFOLIO_ADD_HREF).toBe("/governance/portfolio?add=1");
    const dialog = "<AddOrganizationDialog";
    for (const page of ["portfolio", "clients"]) {
      const src = readFileSync(`src/app/(dashboard)/governance/${page}/page.tsx`, "utf8");
      expect(src, page).toContain(dialog);
    }
    const layout = readFileSync("src/components/guided/guided-layout.tsx", "utf8");
    expect(layout).toContain("href={PORTFOLIO_ADD_HREF}");
    expect(layout).not.toContain("ADD_ORGANIZATION_HREF");
  });

  it("names both entries in English and Spanish", () => {
    expect(en.dashboard.switcherMyClients).toBe("My clients");
    expect(en.dashboard.switcherAddOrganization).toBe("+ Add organization");
    expect(es.dashboard.switcherMyClients).toBeTruthy();
    expect(es.dashboard.switcherAddOrganization).toBeTruthy();
  });
});

describe("top navigation", () => {
  const t = (key: string) => key;

  it("has four menus and no Consulting menu, whatever the store setting", () => {
    for (const stripeEnabled of [true, false]) {
      const groups = buildNavGroups(t, { stripeEnabled });
      expect(groups.map((g) => g.key)).toEqual([
        "getStarted",
        "aiSystemsGroup",
        "governanceGroup",
        "operationsGroup",
      ]);
      expect(groups.map((g) => g.label)).not.toContain("consulting");
      const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
      expect(hrefs).not.toContain(CLIENTS_DASHBOARD_HREF);
    }
  });

  it("lists billing only when the store is on", () => {
    const hrefs = (stripeEnabled: boolean) =>
      buildNavGroups(t, { stripeEnabled }).flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs(true)).toContain("/governance/billing");
    expect(hrefs(false)).not.toContain("/governance/billing");
  });

  it("has a label for every menu in both languages", () => {
    for (const messages of [en, es]) {
      const nav = messages.nav as Record<string, string>;
      for (const group of buildNavGroups(t, { stripeEnabled: true })) {
        expect(nav[group.key], group.key).toBeTruthy();
        for (const item of group.items) expect(nav[item.label], item.label).toBeTruthy();
      }
    }
  });
});
