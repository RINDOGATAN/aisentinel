// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { grantableRoles } from "./team-card";
import { ownerFields } from "./departments-card";
import { ownerSuggestions } from "./owner-input";
import { panelPhase } from "@/components/guided/panel-state";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";

describe("roles offered when inviting", () => {
  it("never above the inviter's own role", () => {
    expect(grantableRoles("OWNER")).toEqual(["OWNER", "ADMIN", "AI_OFFICER", "MEMBER", "VIEWER"]);
    expect(grantableRoles("ADMIN")).toEqual(["ADMIN", "AI_OFFICER", "MEMBER", "VIEWER"]);
    expect(grantableRoles("AI_OFFICER")).toEqual([]);
    expect(grantableRoles(null)).toEqual([]);
  });

  it("every role has its plain description in both languages", () => {
    for (const role of ["OWNER", "ADMIN", "AI_OFFICER", "MEMBER", "VIEWER"] as const) {
      expect(en.team.roleHelp[role]).toBeTruthy();
      expect(es.team.roleHelp[role]).toBeTruthy();
    }
  });
});

describe("owner pickers", () => {
  it("encode a member or a pending invitee", () => {
    expect(ownerFields("m:abc", "owner")).toEqual({ ownerId: "abc", ownerInvitationId: null });
    expect(ownerFields("i:xyz", "deputy")).toEqual({ deputyOwnerId: null, deputyInvitationId: "xyz" });
    expect(ownerFields("__none__", "owner")).toEqual({ ownerId: null, ownerInvitationId: null });
  });

  it("offer members first, then invitees, without repeats", () => {
    expect(
      ownerSuggestions([
        { kind: "invitation", name: "new@acme.test", email: "new@acme.test" },
        { kind: "member", name: "Ana", email: "ana@acme.test" },
        { kind: "member", name: "ana", email: "ana2@acme.test" },
      ]),
    ).toEqual([
      { value: "Ana", pending: false },
      { value: "new@acme.test", pending: true },
    ]);
  });
});

describe("dashboard panel phases", () => {
  it("a failure is shown instead of an endless loading shape", () => {
    expect(panelPhase({ failed: true, loaded: false, empty: false })).toBe("failed");
    expect(panelPhase({ failed: false, loaded: false, empty: false })).toBe("loading");
  });

  it("an empty reading says so; data held after a failed refresh stays shown", () => {
    expect(panelPhase({ failed: false, loaded: true, empty: true })).toBe("empty");
    expect(panelPhase({ failed: true, loaded: true, empty: false })).toBe("ready");
  });
});
