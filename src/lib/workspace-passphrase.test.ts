// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { verifyWorkspacePassphrase } from "./workspace-passphrase";

describe("verifyWorkspacePassphrase", () => {
  it("allows everything when no passphrase is configured (existing installs)", () => {
    expect(verifyWorkspacePassphrase(undefined, "")).toBe(true);
    expect(verifyWorkspacePassphrase(null, "")).toBe(true);
    expect(verifyWorkspacePassphrase("", "")).toBe(true);
    expect(verifyWorkspacePassphrase("anything", "")).toBe(true);
  });

  it("accepts the exact passphrase", () => {
    expect(verifyWorkspacePassphrase("correct horse", "correct horse")).toBe(true);
  });

  it("rejects a wrong passphrase", () => {
    expect(verifyWorkspacePassphrase("battery staple", "correct horse")).toBe(false);
  });

  it("rejects a missing/empty input when a passphrase is required", () => {
    expect(verifyWorkspacePassphrase(undefined, "secret")).toBe(false);
    expect(verifyWorkspacePassphrase(null, "secret")).toBe(false);
    expect(verifyWorkspacePassphrase("", "secret")).toBe(false);
  });

  it("rejects length mismatches (prefix/suffix) without throwing", () => {
    expect(verifyWorkspacePassphrase("secre", "secret")).toBe(false);
    expect(verifyWorkspacePassphrase("secrets", "secret")).toBe(false);
  });

  it("is byte-exact: no trimming of the user input", () => {
    expect(verifyWorkspacePassphrase(" secret", "secret")).toBe(false);
    expect(verifyWorkspacePassphrase("secret ", "secret")).toBe(false);
  });

  it("handles multibyte UTF-8 correctly", () => {
    expect(verifyWorkspacePassphrase("contraseña", "contraseña")).toBe(true);
    expect(verifyWorkspacePassphrase("contrasena", "contraseña")).toBe(false);
  });
});
