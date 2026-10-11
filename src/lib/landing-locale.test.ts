// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { prefersSpanish, requestLandingLocale } from "./landing-locale";

describe("the landing language, decided on the server", () => {
  it("reads Accept-Language by quality, Spanish in any region", () => {
    expect(prefersSpanish("es-ES,es;q=0.9,en;q=0.8")).toBe(true);
    expect(prefersSpanish("es-419")).toBe(true);
    expect(prefersSpanish("en-US,en;q=0.9,es;q=0.8")).toBe(false);
    expect(prefersSpanish("fr-FR,es;q=0.7,en;q=0.5")).toBe(true);
    expect(prefersSpanish("en;q=0.5,es;q=0.9")).toBe(true);
    expect(prefersSpanish("de-DE")).toBe(false);
    expect(prefersSpanish(null)).toBe(false);
  });

  it("puts ?lang= first, then the cookie, then the browser", () => {
    expect(requestLandingLocale("en", "locale=es", "es-ES")).toBe("en");
    expect(requestLandingLocale("es", null, "en-US")).toBe("es");
    expect(requestLandingLocale(null, "locale=en", "es-ES")).toBe("en");
    expect(requestLandingLocale(null, "a=1; locale=es", "en-US")).toBe("es");
    expect(requestLandingLocale(null, null, "es-ES,es;q=0.9")).toBe("es");
    expect(requestLandingLocale(null, "", "en-US")).toBe("en");
    expect(requestLandingLocale(null, null, null)).toBe("en");
  });
});
