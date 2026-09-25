// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The account setting "for my own organization" versus "for client
 * organizations", and what the interface shows in each.
 *
 * The setting is `User.userType`: `BUSINESS_USER` is own-organization mode,
 * `AI_GOVERNANCE_CONSULTANT` is client mode (the enum names predate the
 * wording). It reaches the browser through the session token, which
 * Settings refreshes after saving, so the header follows without a reload.
 *
 * Anything that is not explicitly client mode (including an account that has
 * not chosen yet) is treated as own-organization mode: it is the default for
 * a new account, and the one that shows no other companies.
 *
 * Pure leaf module: no Prisma, no Next, no React.
 */

export type AccountMode = "own" | "clients";

/** The setting value a new account starts from. */
export const DEFAULT_USER_TYPE = "BUSINESS_USER" as const;

export function accountMode(userType: string | null | undefined): AccountMode {
  return userType === "AI_GOVERNANCE_CONSULTANT" ? "clients" : "own";
}

export interface OrganizationSwitcherView {
  /** Show the switcher at all. */
  show: boolean;
  /** List the other organizations the person belongs to. */
  listOrganizations: boolean;
  /** Offer "My clients" and "+ Add organization". */
  clientEntries: boolean;
}

/**
 * Own-organization mode shows no switcher: the page title already names the
 * organization, and other companies are not offered. Client mode always shows
 * it, even with one organization, because it carries the entries for the
 * client dashboard and for adding an organization.
 */
export function organizationSwitcherView(
  userType: string | null | undefined,
): OrganizationSwitcherView {
  const clients = accountMode(userType) === "clients";
  return { show: clients, listOrganizations: clients, clientEntries: clients };
}

/** Where the switcher's two client entries lead. */
export const CLIENTS_DASHBOARD_HREF = "/governance/clients";
export const ADD_ORGANIZATION_HREF = "/governance/clients?add=1";

/**
 * The Guided layout's equivalents: "All clients" is the portfolio, and adding
 * an organisation opens the same dialog on it.
 */
export const PORTFOLIO_HREF = "/governance/portfolio";
export const PORTFOLIO_ADD_HREF = "/governance/portfolio?add=1";
