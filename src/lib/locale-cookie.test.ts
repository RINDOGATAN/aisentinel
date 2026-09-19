// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import {
  isHostedHost,
  localeCleanupSetCookies,
  localeCookieStrings,
  localeCookieValues,
  normalizeLocaleCookie,
  readLocale,
  writeLocaleCookie,
} from "./locale-cookie";

/** Records every assignment, as a browser would receive them. */
function fakeDocument(initial: string) {
  const writes: string[] = [];
  return {
    writes,
    get cookie() {
      return initial;
    },
    set cookie(value: string) {
      writes.push(value);
    },
  };
}

describe("isHostedHost", () => {
  it("accepts todo.law and its subdomains only", () => {
    expect(isHostedHost("aisentinel.todo.law")).toBe(true);
    expect(isHostedHost("todo.law")).toBe(true);
    expect(isHostedHost("AISENTINEL.TODO.LAW:443")).toBe(true);
    expect(isHostedHost("nottodo.law")).toBe(false);
    expect(isHostedHost("localhost")).toBe(false);
    expect(isHostedHost("app.vercel.app")).toBe(false);
    expect(isHostedHost(null)).toBe(false);
  });
});

describe("reader", () => {
  it("returns the last locale value", () => {
    expect(readLocale("locale=es; locale=en")).toBe("en");
    expect(readLocale("locale=en; other=1; locale=es")).toBe("es");
    expect(localeCookieValues("a=1; locale=es; locale=en")).toEqual(["es", "en"]);
  });

  it("renders English with no cookie or an unknown value", () => {
    expect(readLocale(undefined)).toBe("en");
    expect(readLocale("")).toBe("en");
    expect(readLocale("locale=fr")).toBe("en");
    expect(readLocale("mylocale=es")).toBe("en");
  });
});

describe("writer", () => {
  it("on a hosted host expires the host-only duplicate, then writes Domain=.todo.law", () => {
    const doc = fakeDocument("");
    writeLocaleCookie("es", doc, "aisentinel.todo.law");
    expect(doc.writes).toEqual([
      "locale=; Path=/; Max-Age=0",
      "locale=es; Path=/; Max-Age=31536000; SameSite=Lax; Domain=.todo.law",
    ]);
    expect(doc.writes[0]).not.toContain("Domain");
  });

  it("elsewhere writes a single host-only cookie", () => {
    const doc = fakeDocument("");
    writeLocaleCookie("en", doc, "localhost");
    expect(doc.writes).toEqual(["locale=en; Path=/; Max-Age=31536000; SameSite=Lax"]);
  });

  it("client clean-up collapses duplicates to the last value on a hosted host", () => {
    const doc = fakeDocument("locale=es; locale=en");
    expect(normalizeLocaleCookie(doc, "aisentinel.todo.law")).toBe("en");
    expect(doc.writes).toEqual(localeCookieStrings("en", "aisentinel.todo.law"));
  });

  it("client clean-up writes nothing when there is one value or none", () => {
    for (const cookie of ["locale=es", ""]) {
      const doc = fakeDocument(cookie);
      normalizeLocaleCookie(doc, "aisentinel.todo.law");
      expect(doc.writes).toEqual([]);
    }
  });
});

describe("server clean-up", () => {
  it("emits both Set-Cookie values when two locale values arrive", () => {
    expect(localeCleanupSetCookies("locale=en; locale=es", "aisentinel.todo.law")).toEqual([
      "locale=; Path=/; Max-Age=0",
      "locale=es; Path=/; Max-Age=31536000; SameSite=Lax; Domain=.todo.law",
    ]);
  });

  it("emits nothing for one value, no value, or a non-hosted host", () => {
    expect(localeCleanupSetCookies("locale=es", "aisentinel.todo.law")).toEqual([]);
    expect(localeCleanupSetCookies(null, "aisentinel.todo.law")).toEqual([]);
    expect(localeCleanupSetCookies("locale=en; locale=es", "localhost")).toEqual([]);
  });
});
