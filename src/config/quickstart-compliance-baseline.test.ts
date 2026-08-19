// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  QUICKSTART_COMPLIANCE_BASELINE,
  TRANSPARENCY_PROFILE_NOTES,
  baselineRuleKey,
} from "./quickstart-compliance-baseline";

describe("quickstart compliance baseline", () => {
  it("never auto-marks anything COMPLIANT", () => {
    for (const rule of QUICKSTART_COMPLIANCE_BASELINE) {
      expect(["PARTIALLY_COMPLIANT", "NOT_APPLICABLE"]).toContain(rule.status);
    }
  });

  it("rule keys are unique and frameworks valid", () => {
    const keys = QUICKSTART_COMPLIANCE_BASELINE.map(baselineRuleKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const rule of QUICKSTART_COMPLIANCE_BASELINE) {
      expect(["EU_AI_ACT", "NIST_AI_RMF", "ISO_42001"]).toContain(
        rule.framework,
      );
    }
  });

  it("every evidence text is bilingual, non-empty, and carries the review prompt", () => {
    for (const rule of QUICKSTART_COMPLIANCE_BASELINE) {
      expect(rule.evidence.en.trim()).not.toBe("");
      expect(rule.evidence.es.trim()).not.toBe("");
      expect(rule.evidence.en).toContain("review and confirm");
      expect(rule.evidence.es).toContain("revisar y confirmar");
    }
    expect(TRANSPARENCY_PROFILE_NOTES.en).toContain("review and confirm");
    expect(TRANSPARENCY_PROFILE_NOTES.es).toContain("revisar y confirmar");
  });

  it("policy-dependent claims are flagged requiresPolicies", () => {
    const policyCodes = ["Art. 4", "GOVERN", "GOVERN 1", "GOVERN 2", "5.2", "5.3"];
    for (const rule of QUICKSTART_COMPLIANCE_BASELINE) {
      if (policyCodes.includes(rule.code)) {
        expect(rule.requiresPolicies, rule.code).toBe(true);
      }
    }
  });

  it("provider-side Art. 50 duties are NOT_APPLICABLE, deployer-side transparency is only PARTIAL with a profile", () => {
    const byCode = new Map(
      QUICKSTART_COMPLIANCE_BASELINE.filter(
        (r) => r.framework === "EU_AI_ACT",
      ).map((r) => [r.code, r]),
    );
    expect(byCode.get("Art. 50(1)")!.status).toBe("NOT_APPLICABLE");
    expect(byCode.get("Art. 50(2)")!.status).toBe("NOT_APPLICABLE");
    expect(byCode.get("Art. 50")!.status).toBe("PARTIALLY_COMPLIANT");
    expect(byCode.get("Art. 50")!.requiresTransparencyProfile).toBe(true);
  });
});
