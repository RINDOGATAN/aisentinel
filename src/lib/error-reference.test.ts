// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { errorPageReference, newErrorReference } from "@/lib/error-reference";
import { ERROR_PAGE_COPY, errorLocaleFromCookie } from "@/config/error-copy";

describe("error references", () => {
  it("are short, unambiguous to read aloud, and distinct", () => {
    const refs = new Set(Array.from({ length: 500 }, newErrorReference));
    expect(refs.size).toBe(500);
    for (const ref of refs) expect(ref).toMatch(/^E-[2-9A-HJKMNP-Z]{8}$/);
  });

  it("use the server's digest when there is one, so the page matches the log", () => {
    expect(errorPageReference({ digest: "1234567890" })).toBe("D-1234567890");
    expect(errorPageReference({})).toMatch(/^E-/);
  });
});

describe("error page copy", () => {
  it("reads the locale cookie the rest of the app uses", () => {
    expect(errorLocaleFromCookie("currency=EUR; locale=es")).toBe("es");
    expect(errorLocaleFromCookie("locale=es")).toBe("es");
    expect(errorLocaleFromCookie("locale=en; x=1")).toBe("en");
    expect(errorLocaleFromCookie("xlocale=es")).toBe("en");
    expect(errorLocaleFromCookie("")).toBe("en");
  });

  it("has every sentence in both languages", () => {
    expect(Object.keys(ERROR_PAGE_COPY.es).sort()).toEqual(Object.keys(ERROR_PAGE_COPY.en).sort());
  });
});
