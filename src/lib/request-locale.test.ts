// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The product follows the browser's language when no `locale` cookie was
 * chosen, as the landing does; a chosen cookie always wins.
 */

import { describe, it, expect } from "vitest";
import { requestLocale } from "./landing-locale";
import { exportLocale } from "@/server/services/export/pdf-labels";
import { displayCurrency } from "./currency";
import { slugFromName } from "@/components/governance/add-organization-dialog";

describe("requestLocale", () => {
  it("follows a Spanish browser when there is no cookie", () => {
    expect(requestLocale(null, "es-ES,es;q=0.9,en;q=0.8")).toBe("es");
    expect(requestLocale("currency=USD", "es-419")).toBe("es");
  });
  it("stays in English for an English or unknown browser", () => {
    expect(requestLocale(null, "en-US,en;q=0.9")).toBe("en");
    expect(requestLocale(null, "fr-FR")).toBe("en");
    expect(requestLocale(null, null)).toBe("en");
  });
  it("lets the chosen cookie win over the browser", () => {
    expect(requestLocale("locale=en", "es-ES")).toBe("en");
    expect(requestLocale("locale=es", "en-US")).toBe("es");
    expect(requestLocale("locale=es; locale=en", "es-ES")).toBe("en");
  });
  it("is the language of exports too, unless ?locale= says otherwise", () => {
    expect(exportLocale(null, null, "es-ES")).toBe("es");
    expect(exportLocale("en", null, "es-ES")).toBe("en");
  });
  it("keeps one currency per language on screen", () => {
    expect(displayCurrency(requestLocale(null, "es-ES"), "USD")).toBe("EUR");
  });
});

describe("the client's identifier is filled from the name", () => {
  it("uses the name, or a plain word when the name has no Latin letters", () => {
    expect(slugFromName("Acme Industries")).toBe("acme-industries");
    expect(slugFromName("Analítica del Puerto, S.L.")).toBe("analitica-del-puerto-s-l");
    expect(slugFromName("北京科技")).toBe("client");
  });
});
