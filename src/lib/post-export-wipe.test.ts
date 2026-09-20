// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * When the offer to empty a test account appears, and what it says.
 *
 * The offer must not appear on a kit installation (the data is already the
 * customer's), must not appear to anyone who cannot act on it, and must lead to
 * the confirmation rather than delete anything itself.
 */

import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { shouldOfferWipe, WIPE_ANCHOR, WIPE_TARGET } from "./post-export-wipe";

const ROLES = ["OWNER", "ADMIN", "AI_OFFICER", "MEMBER", "VIEWER"] as const;

describe("offering to empty the account after an export", () => {
  it("is offered to an owner on the hosted pilot", () => {
    expect(shouldOfferWipe({ hostedPilot: true, role: "OWNER" })).toBe(true);
  });

  it("is never offered off the hosted pilot, whatever the role", () => {
    for (const role of ROLES) {
      expect(shouldOfferWipe({ hostedPilot: false, role })).toBe(false);
    }
  });

  it("is not offered to anyone who cannot delete an organisation", () => {
    for (const role of ROLES.filter((r) => r !== "OWNER")) {
      expect(shouldOfferWipe({ hostedPilot: true, role })).toBe(false);
    }
    expect(shouldOfferWipe({ hostedPilot: true, role: null })).toBe(false);
    expect(shouldOfferWipe({ hostedPilot: true, role: undefined })).toBe(false);
  });

  it("leads to the settings card, which carries the anchor", () => {
    expect(WIPE_TARGET).toBe(`/governance/settings#${WIPE_ANCHOR}`);
  });
});

describe("what the offer and the confirmation say", () => {
  const pilotEn = (en as { pilot: Record<string, string> }).pilot;
  const pilotEs = (es as { pilot: Record<string, string> }).pilot;
  const delEn = (en as { deleteOrganization: Record<string, string> }).deleteOrganization;
  const delEs = (es as { deleteOrganization: Record<string, string> }).deleteOrganization;

  it("the offer is one line, with no alarm and no sales tone", () => {
    for (const line of [pilotEn.afterExportBody, pilotEs.afterExportBody]) {
      expect(line.split(". ").length).toBeLessThanOrEqual(2);
      expect(line).not.toMatch(/!/);
      expect(line).not.toMatch(/warning|careful|atención|cuidado/i);
      expect(line).not.toMatch(/upgrade|subscribe|suscríbete|mejora tu plan/i);
    }
  });

  it("the confirmation says it cannot be undone and that export is the only way to keep anything", () => {
    expect(delEn.description).toMatch(/cannot be undone/);
    expect(delEn.description).toMatch(/only way to keep anything/);
    expect(delEn.description).toMatch(/removed from the database, not hidden/);
    expect(delEs.description).toMatch(/No se puede deshacer/);
    expect(delEs.description).toMatch(/única forma de conservar algo/);
    expect(delEs.description).toMatch(/se borran de la base de datos, no se ocultan/);
  });

  it("the Spanish addresses the reader as tú, with no long dashes", () => {
    for (const s of [
      pilotEs.afterExportBody,
      pilotEs.afterExportAction,
      delEs.description,
      delEs.exportFirst,
    ]) {
      expect(s).not.toMatch(/\busted\b/i);
      expect(s).not.toMatch(/\bescriba\b|\bexporte\b|\bpuede vaciar\b|\bsu cuenta\b/);
      expect(s).not.toMatch(/[—–]/);
    }
    for (const s of [pilotEn.afterExportBody, pilotEn.afterExportAction, delEn.description]) {
      expect(s).not.toMatch(/[—–]/);
    }
  });
});
