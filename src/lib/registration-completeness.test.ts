// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  isRegistrationComplete,
  missingRegistrationFields,
  REGISTRATION_FIELDS,
} from "./registration-completeness";

const complete = {
  description: "A tool that ranks CVs.",
  purpose: "Shortlisting candidates.",
  businessOwner: "Head of HR",
  technicalOwner: "ML lead",
  hasRiskClassification: true,
};

describe("registration completeness", () => {
  it("reports nothing missing on a complete system", () => {
    expect(missingRegistrationFields(complete)).toEqual([]);
    expect(isRegistrationComplete(complete)).toBe(true);
  });

  it("treats null, undefined and whitespace as missing", () => {
    expect(missingRegistrationFields({ ...complete, description: null })).toEqual(["description"]);
    expect(missingRegistrationFields({ ...complete, purpose: "   " })).toEqual(["purpose"]);
    expect(missingRegistrationFields({ ...complete, businessOwner: undefined })).toEqual([
      "businessOwner",
    ]);
  });

  it("counts a missing risk classification", () => {
    expect(missingRegistrationFields({ ...complete, hasRiskClassification: false })).toEqual([
      "riskClassification",
    ]);
  });

  it("lists every missing field in display order", () => {
    const missing = missingRegistrationFields({
      description: "",
      purpose: "",
      businessOwner: "",
      technicalOwner: "",
      hasRiskClassification: false,
    });
    expect(missing).toEqual(REGISTRATION_FIELDS);
    expect(isRegistrationComplete({
      description: "",
      purpose: "",
      businessOwner: "",
      technicalOwner: "",
      hasRiskClassification: false,
    })).toBe(false);
  });
});
