// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { suggestRole } from "./role-decider";

describe("Help me decide: the role", () => {
  it("suggests nothing until the three questions are answered", () => {
    expect(suggestRole({})).toEqual({ outcome: "incomplete", role: null });
    expect(suggestRole({ developed: "yes", ownName: "yes" })).toEqual({ outcome: "incomplete", role: null });
  });

  it("developed and offered under its own name: provider (Art. 3(3))", () => {
    expect(suggestRole({ developed: "yes", ownName: "yes", usesIt: "no" })).toEqual({
      outcome: "provider",
      role: "PROVIDER",
    });
  });

  it("built in house and used in its own work: provider, with the deployer duties too", () => {
    expect(suggestRole({ developed: "yes", ownName: "yes", usesIt: "yes" })).toEqual({
      outcome: "providerAndDeployer",
      role: "PROVIDER",
    });
  });

  it("bought in and used under its authority: deployer (Art. 3(4))", () => {
    expect(suggestRole({ developed: "no", ownName: "no", usesIt: "yes" })).toEqual({
      outcome: "deployer",
      role: "DEPLOYER",
    });
    // Developed for a client who puts it out under the client's name, and used: deployer only.
    expect(suggestRole({ developed: "yes", ownName: "no", usesIt: "yes" }).role).toBe("DEPLOYER");
  });

  it("neither developed under its name nor used: no role suggested", () => {
    expect(suggestRole({ developed: "no", ownName: "no", usesIt: "no" })).toEqual({
      outcome: "neither",
      role: null,
    });
    expect(suggestRole({ developed: "no", ownName: "yes", usesIt: "no" }).role).toBeNull();
  });
});
