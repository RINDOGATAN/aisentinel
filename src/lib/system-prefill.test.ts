// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What the form may and may not suggest.
 *
 * The suggestions go into a regulated record, so the test that matters is the
 * negative one: nothing is offered that the account does not actually hold.
 * A supply-chain role with no vendor to justify it, a personal-data answer from
 * a partial pattern, an owner from a single previous system, or a value with no
 * basis attached are each a defect, and each is a case below.
 */

import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { suggestSystemFields, type PrefillContext } from "./system-prefill";

const base: PrefillContext = {
  currentUser: { name: "A. Officer", email: "officer@example.test" },
  existingBusinessOwners: [],
  existingTechnicalOwners: [],
  systemsTotal: 0,
  systemsProcessingPersonalData: 0,
  selectedVendor: null,
};

const ctx = (over: Partial<PrefillContext> = {}): PrefillContext => ({ ...base, ...over });
const find = (result: ReturnType<typeof suggestSystemFields>, field: string) =>
  result.find((s) => s.field === field);

describe("owners", () => {
  it("suggests the person registering the system when the registry names nobody", () => {
    const result = suggestSystemFields(ctx());
    expect(find(result, "businessOwner")).toMatchObject({
      value: "A. Officer",
      basis: "you-are-registering-it",
    });
    expect(find(result, "technicalOwner")?.basis).toBe("you-are-registering-it");
  });

  it("falls back to the email when the account holds no name", () => {
    const result = suggestSystemFields(ctx({ currentUser: { name: null, email: "officer@example.test" } }));
    expect(find(result, "businessOwner")?.value).toBe("officer@example.test");
  });

  it("suggests nothing when the account knows neither a name nor an email", () => {
    const result = suggestSystemFields(ctx({ currentUser: null }));
    expect(find(result, "businessOwner")).toBeUndefined();
    expect(find(result, "technicalOwner")).toBeUndefined();
  });

  it("prefers the owner the rest of the registry already names", () => {
    const result = suggestSystemFields(
      ctx({ existingBusinessOwners: ["Head of hiring", "Head of hiring", "Someone else"] }),
    );
    expect(find(result, "businessOwner")).toMatchObject({
      value: "Head of hiring",
      basis: "most-of-your-systems",
    });
  });

  it("does not call one previous system a pattern", () => {
    const result = suggestSystemFields(ctx({ existingBusinessOwners: ["Head of hiring"] }));
    // Falls back to the person registering it, not to the single prior value.
    expect(find(result, "businessOwner")?.basis).toBe("you-are-registering-it");
  });

  it("does not pick a plurality that is not a majority", () => {
    const result = suggestSystemFields(
      ctx({ existingBusinessOwners: ["A", "A", "B", "B", "C"] }),
    );
    expect(find(result, "businessOwner")?.basis).toBe("you-are-registering-it");
  });

  it("ignores blank owner values rather than counting them", () => {
    const result = suggestSystemFields(
      ctx({ existingTechnicalOwners: ["", "  ", "Platform team", "Platform team"] }),
    );
    expect(find(result, "technicalOwner")).toMatchObject({
      value: "Platform team",
      basis: "most-of-your-systems",
    });
  });

  it("offers at most one suggestion per field", () => {
    const result = suggestSystemFields(
      ctx({ existingBusinessOwners: ["Head of hiring", "Head of hiring"] }),
    );
    expect(result.filter((s) => s.field === "businessOwner")).toHaveLength(1);
  });
});

describe("the supply-chain role", () => {
  it("is suggested only when a vendor supplies the system, and names it", () => {
    expect(find(suggestSystemFields(ctx()), "role")).toBeUndefined();
    const withVendor = suggestSystemFields(ctx({ selectedVendor: { name: "Example Screening Ltd" } }));
    expect(find(withVendor, "role")).toMatchObject({
      value: "DEPLOYER",
      basis: "this-vendor-supplies-it",
      subject: "Example Screening Ltd",
    });
  });

  it("is never guessed from what the other systems say", () => {
    // Nothing in the context can produce a role suggestion except a vendor.
    const result = suggestSystemFields(
      ctx({ systemsTotal: 20, systemsProcessingPersonalData: 20, existingBusinessOwners: ["X", "X"] }),
    );
    expect(find(result, "role")).toBeUndefined();
  });
});

describe("personal data", () => {
  it("is suggested only where every system so far processes it, and there are enough of them", () => {
    expect(
      find(suggestSystemFields(ctx({ systemsTotal: 4, systemsProcessingPersonalData: 4 })), "processesPersonalData"),
    ).toMatchObject({ value: "true", basis: "every-system-so-far" });
  });

  it("is not suggested from a partial pattern", () => {
    expect(
      find(suggestSystemFields(ctx({ systemsTotal: 4, systemsProcessingPersonalData: 3 })), "processesPersonalData"),
    ).toBeUndefined();
  });

  it("is not suggested from too few systems to mean anything", () => {
    expect(
      find(suggestSystemFields(ctx({ systemsTotal: 2, systemsProcessingPersonalData: 2 })), "processesPersonalData"),
    ).toBeUndefined();
  });

  it("is never suggested as false: an absence of evidence is not evidence", () => {
    const result = suggestSystemFields(ctx({ systemsTotal: 5, systemsProcessingPersonalData: 0 }));
    expect(find(result, "processesPersonalData")).toBeUndefined();
  });
});

describe("every suggestion carries a basis the interface can render", () => {
  it("names a basis string that exists in both languages", () => {
    const result = suggestSystemFields(
      ctx({
        selectedVendor: { name: "Example Screening Ltd" },
        systemsTotal: 3,
        systemsProcessingPersonalData: 3,
        existingBusinessOwners: ["Head of hiring", "Head of hiring"],
      }),
    );
    expect(result.length).toBeGreaterThanOrEqual(4);
    const enBasis = (en as { aiRegistryNew: { suggestionBasis: Record<string, string> } }).aiRegistryNew
      .suggestionBasis;
    const esBasis = (es as { aiRegistryNew: { suggestionBasis: Record<string, string> } }).aiRegistryNew
      .suggestionBasis;
    for (const s of result) {
      expect(enBasis[s.basis], s.basis).toBeTruthy();
      expect(esBasis[s.basis], s.basis).toBeTruthy();
      expect(s.value.trim()).not.toBe("");
    }
  });

  it("the Spanish bases address the reader as tú, with no long dashes", () => {
    const esBasis = (es as { aiRegistryNew: { suggestionBasis: Record<string, string> } }).aiRegistryNew
      .suggestionBasis;
    for (const [key, value] of Object.entries(esBasis)) {
      expect(value, key).not.toMatch(/\busted\b/i);
      expect(value, key).not.toMatch(/\bsus\b|\bregistra usted\b/);
      expect(value, key).not.toMatch(/[—–]/);
    }
  });

  it("a basis that names something has a subject to name", () => {
    const result = suggestSystemFields(ctx({ selectedVendor: { name: "Example Screening Ltd" } }));
    const role = find(result, "role")!;
    const template = (en as { aiRegistryNew: { suggestionBasis: Record<string, string> } }).aiRegistryNew
      .suggestionBasis[role.basis];
    // The template interpolates {subject}, so the suggestion must carry one.
    expect(template).toContain("{subject}");
    expect(role.subject).toBeTruthy();
  });
});
