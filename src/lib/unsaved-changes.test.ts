// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { afterEach, describe, expect, it } from "vitest";
import {
  hasUnsaved,
  isLeavingClick,
  resetUnsaved,
  setUnsaved,
  type ClickFacts,
} from "./unsaved-changes";

const HERE = "https://app.example/governance/settings";

const click = (href: string | null, over: Partial<ClickFacts> = {}): ClickFacts => ({
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
  link: href === null ? null : { href, target: null, download: false },
  ...over,
});

describe("unsaved changes registry", () => {
  afterEach(() => resetUnsaved());

  it("is clean until a form registers unsaved text", () => {
    expect(hasUnsaved()).toBe(false);
    setUnsaved("team", true);
    expect(hasUnsaved()).toBe(true);
  });

  it("stays dirty while any one form is dirty", () => {
    setUnsaved("team", true);
    setUnsaved("departments", true);
    setUnsaved("team", false);
    expect(hasUnsaved()).toBe(true);
    setUnsaved("departments", false);
    expect(hasUnsaved()).toBe(false);
  });
});

describe("isLeavingClick", () => {
  it("asks when a link goes to another page of the app", () => {
    expect(isLeavingClick(click("/governance"), HERE)).toBe(true);
    expect(isLeavingClick(click("/governance/settings?tab=x"), HERE)).toBe(true);
  });

  it("asks when a link leaves the site in the same tab", () => {
    expect(isLeavingClick(click("https://todo.law/deploy"), HERE)).toBe(true);
  });

  it("does not ask for a jump within the same page", () => {
    expect(isLeavingClick(click("#screening"), HERE)).toBe(false);
    expect(isLeavingClick(click("/governance/settings#delete-organization"), HERE)).toBe(false);
  });

  it("does not ask when the page stays open", () => {
    expect(isLeavingClick(click("/governance", { metaKey: true }), HERE)).toBe(false);
    expect(isLeavingClick(click("/governance", { ctrlKey: true }), HERE)).toBe(false);
    expect(isLeavingClick(click("/governance", { button: 1 }), HERE)).toBe(false);
    expect(
      isLeavingClick(
        { ...click(null), link: { href: "/governance", target: "_blank", download: false } },
        HERE,
      ),
    ).toBe(false);
    expect(
      isLeavingClick(
        { ...click(null), link: { href: "/api/export/x", target: null, download: true } },
        HERE,
      ),
    ).toBe(false);
  });

  it("does not ask for clicks that are not on a link, or already handled", () => {
    expect(isLeavingClick(click(null), HERE)).toBe(false);
    expect(isLeavingClick(click("/governance", { defaultPrevented: true }), HERE)).toBe(false);
  });

  it("does not ask for mail links", () => {
    expect(isLeavingClick(click("mailto:someone@example.com"), HERE)).toBe(false);
  });
});
