// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { ownerColumns } from "./owners";

describe("department owner and deputy columns", () => {
  it("writes nothing when neither pair is sent", () => {
    expect(ownerColumns({})).toEqual({});
  });

  it("a member owner clears a pending invitee owner, and the other way round", () => {
    expect(ownerColumns({ ownerId: "m1" })).toEqual({ ownerId: "m1", ownerInvitationId: null });
    expect(ownerColumns({ ownerId: null, ownerInvitationId: "i1" })).toEqual({
      ownerId: null,
      ownerInvitationId: "i1",
    });
    // Both sent: the member wins, so a department never has two owners.
    expect(ownerColumns({ ownerId: "m1", ownerInvitationId: "i1" })).toEqual({
      ownerId: "m1",
      ownerInvitationId: null,
    });
  });

  it("handles the deputy pair on its own", () => {
    expect(ownerColumns({ deputyInvitationId: "i2" })).toEqual({
      deputyOwnerId: null,
      deputyInvitationId: "i2",
    });
  });

  it("refuses the same person as owner and deputy", () => {
    expect(() => ownerColumns({ ownerId: "m1", deputyOwnerId: "m1" })).toThrow(/different person/);
    expect(() => ownerColumns({ ownerInvitationId: "i1", deputyInvitationId: "i1" })).toThrow(/different person/);
  });
});
