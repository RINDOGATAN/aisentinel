// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Step 1.2's questions: an unanswered question is stored as "Not sure yet",
 * so it must not look chosen until someone picks it; a yes or a no shows.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { EMPTY_APPLICABILITY_ANSWERS } from "@/config/applicability";

vi.mock("@/lib/trpc", () => ({ trpc: {} }));
vi.mock("@/components/guided/use-program-path", () => ({ useProgramPath: () => null }));

import { ApplicabilityQuestions } from "./applicability-check";

function render(answers = EMPTY_APPLICABILITY_ANSWERS, locale: "en" | "es" = "en") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en}>
      <ApplicabilityQuestions answers={answers} onChange={() => {}} />
    </NextIntlClientProvider>,
  );
}

describe("applicability questions", () => {
  it("shows no option as chosen while nothing is answered", () => {
    const html = render();
    expect(html).not.toMatch(/checked=""/);
    expect(html).not.toContain("bg-primary/10");
  });

  it("shows a yes or a no as chosen", () => {
    const html = render({ ...EMPTY_APPLICABILITY_ANSWERS, usesAi: "YES", meetsPeople: "NO" });
    expect(html.match(/checked=""/g)).toHaveLength(2);
  });

  it("says on the band what counts, in both languages", () => {
    expect(en.guided.checks.screeningApplicability).toBe("answer at least one of these questions yes or no");
    expect(es.guided.checks.screeningApplicability).toBe("responde sí o no al menos a una de estas preguntas");
    expect(render(EMPTY_APPLICABILITY_ANSWERS, "es")).toContain("Todavía no lo sé");
  });
});
