// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { GRACE_DAYS, planGrace, type OrgForGrace } from "./paywall-grace";

const NOW = new Date("2026-09-20T09:00:00Z");
const SHADOW = "com.todolaw.aisentinel.shadow-ai";
const CONFORMITY = "com.todolaw.aisentinel.conformity";

const org = (over: Partial<OrgForGrace>): OrgForGrace => ({
  organizationId: "org-1",
  organizationName: "Org one",
  usedSkillIds: [SHADOW],
  linkedCustomers: [],
  owner: { email: "owner@one.example", name: "Owner" },
  ownerCustomer: null,
  ...over,
});

describe("planGrace", () => {
  it("defaults to 30 days from now", () => {
    expect(GRACE_DAYS).toBe(30);
    expect(planGrace([], NOW).expiresAt).toEqual(new Date("2026-10-20T09:00:00Z"));
  });

  it("grants only modules the organisation has written data with", () => {
    const plan = planGrace([org({ usedSkillIds: [SHADOW, "com.other.app.skill"] }), org({ organizationId: "org-2", usedSkillIds: [] })], NOW);
    expect(plan.organizations).toHaveLength(1);
    expect(plan.organizations[0]).toMatchObject({
      grant: [SHADOW],
      customer: { kind: "create", email: "owner@one.example" },
    });
    expect(plan.totals).toEqual({ organizations: 1, grants: 1, customersToCreate: 1, skippedOrganizations: 0 });
  });

  it("uses the linked customer, else the owner's existing customer", () => {
    const linked = planGrace([org({ linkedCustomers: [{ customerId: "cust-L", rows: [] }] })], NOW);
    expect(linked.organizations[0].customer).toEqual({ kind: "linked", customerId: "cust-L" });

    const byEmail = planGrace([org({ ownerCustomer: { customerId: "cust-E", rows: [] } })], NOW);
    expect(byEmail.organizations[0].customer).toEqual({ kind: "link-existing", customerId: "cust-E" });
  });

  it("never overwrites an existing row of any kind, live or not", () => {
    const plan = planGrace(
      [
        org({
          usedSkillIds: [SHADOW, CONFORMITY],
          linkedCustomers: [
            {
              customerId: "cust-L",
              rows: [{ skillId: SHADOW, licenseType: "SUBSCRIPTION", status: "SUSPENDED", expiresAt: null }],
            },
          ],
        }),
      ],
      NOW,
    );
    expect(plan.organizations[0].grant).toEqual([CONFORMITY]);
    expect(plan.organizations[0].skipped[0]).toMatchObject({ skillId: SHADOW });
  });

  it("skips an organisation linked to several customers (the held duplicate-link case)", () => {
    const plan = planGrace(
      [org({ linkedCustomers: [{ customerId: "a", rows: [] }, { customerId: "b", rows: [] }] })],
      NOW,
    );
    expect(plan.organizations[0]).toMatchObject({ grant: [], customer: null });
    expect(plan.organizations[0].skipReason).toMatch(/2 customers/);
    expect(plan.totals.skippedOrganizations).toBe(1);
  });

  it("skips an organisation with no owner e-mail rather than inventing a customer", () => {
    const plan = planGrace([org({ owner: null })], NOW);
    expect(plan.organizations[0].skipReason).toMatch(/no owner/);
    expect(plan.totals.grants).toBe(0);
  });

  it("grants a module once per customer when one customer holds several organisations", () => {
    const shared = { customerId: "cust-S", rows: [] };
    const plan = planGrace(
      [org({ linkedCustomers: [shared] }), org({ organizationId: "org-2", linkedCustomers: [shared] })],
      NOW,
    );
    expect(plan.totals.grants).toBe(1);
    expect(plan.organizations[1].skipped[0].reason).toMatch(/another organisation/);
  });

  it("counts one customer to create when two organisations share an owner e-mail", () => {
    const plan = planGrace([org({}), org({ organizationId: "org-2", owner: { email: "OWNER@one.example", name: null } })], NOW);
    expect(plan.totals.customersToCreate).toBe(1);
    expect(plan.totals.grants).toBe(1);
    // The second organisation gets no row of its own but is still linked,
    // or the shared grace row would never reach it.
    expect(plan.organizations[1]).toMatchObject({ grant: [], customer: { kind: "create" } });
  });

  it("rejects a nonsensical window", () => {
    expect(() => planGrace([], NOW, 0)).toThrow();
    expect(() => planGrace([], NOW, 12.5)).toThrow();
  });
});
