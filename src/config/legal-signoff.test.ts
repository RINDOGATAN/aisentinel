// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The sign-off record is the one place that says whether regulatory content
 * has been confirmed. These tests guard the property that matters: a marker
 * must never claim more than the record holds.
 */

import { describe, it, expect } from "vitest";
import { LEGAL_SIGNOFF, signoffMarker, allSignedOff, pendingPacks } from "./legal-signoff";

describe("legal sign-off record", () => {
  it("gives every pack a status and a review date", () => {
    for (const [id, record] of Object.entries(LEGAL_SIGNOFF)) {
      expect(["signed-off", "pending"], `${id} status`).toContain(record.status);
      expect(record.lawReviewedAsOf, `${id} review date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("requires a person and a date behind every sign-off", () => {
    for (const [id, record] of Object.entries(LEGAL_SIGNOFF)) {
      if (record.status !== "signed-off") continue;
      expect(record.confirmedBy?.trim(), `${id} needs a confirmer`).toBeTruthy();
      expect(record.confirmedAt, `${id} needs a date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(record.basis?.en.trim(), `${id} needs a stated basis`).toBeTruthy();
      expect(record.basis?.es.trim(), `${id} needs a Spanish basis`).toBeTruthy();
    }
  });

  it("never renders a signed-off marker for a pending pack, or the reverse", () => {
    for (const [id, record] of Object.entries(LEGAL_SIGNOFF)) {
      const marker = signoffMarker(id);
      if (record.status === "signed-off") {
        expect(marker.en, `${id}`).toMatch(/Signed off/);
        expect(marker.en, `${id}`).not.toMatch(/pending/);
        expect(marker.es, `${id}`).toMatch(/Validado/);
      } else {
        expect(marker.en, `${id}`).toMatch(/sign-off pending/);
        expect(marker.es, `${id}`).toMatch(/pendiente/);
      }
    }
  });

  it("states the basis in the marker, so a reader knows what the sign-off rests on", () => {
    const marker = signoffMarker("EU_GDPR");
    expect(marker.en).toContain("confirmed as a body");
    expect(marker.es).toContain("en bloque");
  });

  it("does not invent a status for content it has never heard of", () => {
    const marker = signoffMarker("NOT_A_PACK");
    expect(marker.en).toContain("not recorded");
    expect(marker.en).not.toContain("Signed off");
  });

  it("reports which packs are still pending", () => {
    expect(allSignedOff(["EU_GDPR", "TX_TRAIGA"])).toBe(true);
    expect(allSignedOff(["EU_GDPR", "CA_CCPA_ADMT"])).toBe(false);
    expect(pendingPacks(["EU_GDPR", "CA_CCPA_ADMT", "EU_AI_ACT"])).toEqual([
      "CA_CCPA_ADMT",
      "EU_AI_ACT",
    ]);
    // An unknown pack counts as not signed off: silence is not confirmation.
    expect(allSignedOff(["NOT_A_PACK"])).toBe(false);
  });
});
