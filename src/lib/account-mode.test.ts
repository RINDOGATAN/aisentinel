// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { UserType } from "@prisma/client";
import {
  DEFAULT_USER_TYPE,
  PORTFOLIO_ADD_HREF,
  PORTFOLIO_HREF,
  accountMode,
  organizationSwitcherView,
} from "./account-mode";
import { readFileSync } from "node:fs";
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

  it("keeps the add flow on All clients (the portfolio)", () => {
    expect(PORTFOLIO_HREF).toBe("/governance/portfolio");
    expect(PORTFOLIO_ADD_HREF).toBe("/governance/portfolio?add=1");
    const src = readFileSync("src/app/(dashboard)/governance/portfolio/page.tsx", "utf8");
    expect(src).toContain("<AddOrganizationDialog");
    const layout = readFileSync("src/components/guided/guided-layout.tsx", "utf8");
    expect(layout).toContain("href={PORTFOLIO_ADD_HREF}");
    expect(layout).toContain("href={PORTFOLIO_HREF}");
  });

  it("names the client entries in English and Spanish", () => {
    for (const messages of [en, es]) {
      expect(messages.guided.allClients).toBeTruthy();
      expect(messages.guided.addOrganization).toBeTruthy();
      expect(messages.guided.switchClient).toBeTruthy();
    }
  });
});
