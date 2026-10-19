// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { registrationChecklist } from "./registration-checklist";
import { isRegistrationComplete } from "./registration-completeness";

const empty = {
  description: null,
  purpose: null,
  businessOwner: null,
  technicalOwner: null,
  hasRiskClassification: false,
  models: 0,
  dataSources: 0,
  dataRecipients: 0,
};

const required = {
  ...empty,
  description: "Ranks CVs.",
  purpose: "Shortlisting.",
  businessOwner: "Head of HR",
  technicalOwner: "ML lead",
  hasRiskClassification: true,
};

describe("registration checklist", () => {
  it("lists five required items and three recommended ones", () => {
    const list = registrationChecklist(empty);
    expect(list.total).toBe(8);
    expect(list.requiredTotal).toBe(5);
    expect(list.items.filter((i) => !i.required).map((i) => i.id)).toEqual([
      "models",
      "dataSources",
      "dataFlow",
    ]);
    expect(list.done).toBe(0);
    expect(list.complete).toBe(false);
  });

  it("marks the risk level as required but set in a later step", () => {
    const risk = registrationChecklist(empty).items.find((i) => i.id === "riskClassification")!;
    expect(risk).toMatchObject({ required: true, later: true, target: "risk" });
  });

  it("is complete exactly when the completeness rule holds, whatever the recommended items", () => {
    const list = registrationChecklist(required);
    expect(list.complete).toBe(true);
    expect(isRegistrationComplete(required)).toBe(true);
    expect(list.done).toBe(5);
    expect(list.requiredDone).toBe(5);

    const partial = { ...required, technicalOwner: "  " };
    expect(registrationChecklist(partial).complete).toBe(false);
    expect(isRegistrationComplete(partial)).toBe(false);
  });

  it("counts the recommended items from the system's records", () => {
    const list = registrationChecklist({ ...required, models: 2, dataSources: 1, dataRecipients: 0 });
    expect(list.done).toBe(7);
    expect(list.items.find((i) => i.id === "dataFlow")).toMatchObject({ done: false, target: "data-flow" });
  });

  it("sends each missing item to the place where it is filled in", () => {
    const targets = Object.fromEntries(registrationChecklist(empty).items.map((i) => [i.id, i.target]));
    expect(targets).toEqual({
      description: "edit",
      purpose: "edit",
      businessOwner: "edit",
      technicalOwner: "edit",
      riskClassification: "risk",
      models: "models",
      dataSources: "data-sources",
      dataFlow: "data-flow",
    });
  });
});
