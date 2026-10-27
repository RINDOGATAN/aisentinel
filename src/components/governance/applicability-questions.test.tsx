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

import { ApplicabilityQuestions, FrameworksQuestion } from "./applicability-check";

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

  it("asks only the questions that matter for the declared places", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <ApplicabilityQuestions answers={EMPTY_APPLICABILITY_ANSWERS} onChange={() => {}} jurisdictions={["US_TX"]} />
      </NextIntlClientProvider>,
    );
    expect(html).not.toContain(en.applicability.questions.generalPurposeModel.label);
    expect(html).not.toContain(en.applicability.questions.decidesAboutPeople.label);
    expect(html).toContain(en.applicability.questions.usesAi.label);
  });

  it("offers the frameworks unticked, with a hint and a neutral line for a law the places point to", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="es" messages={es}>
        <FrameworksQuestion
          answers={EMPTY_APPLICABILITY_ANSWERS}
          jurisdictions={["EU", "US_CO"]}
          frameworks={["NIST_AI_RMF"]}
          onChange={() => {}}
          idPrefix="t"
        />
      </NextIntlClientProvider>,
    );
    // Only the chosen one is ticked.
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toContain(es.applicability.frameworks.options.EU_AI_ACT.hint);
    expect(html).toContain("pueden aplicarse por ley");
    expect(html).toContain("Colorado: SB 26-189");
  });

  it("asks for at least one framework while none is chosen", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <FrameworksQuestion answers={EMPTY_APPLICABILITY_ANSWERS} jurisdictions={[]} frameworks={[]} onChange={() => {}} idPrefix="t" />
      </NextIntlClientProvider>,
    );
    expect(html).not.toContain('aria-checked="true"');
    expect(html).toContain(en.applicability.frameworks.required);
  });

  it("says on the band what counts, in both languages", () => {
    expect(en.guided.checks.screeningApplicability).toBe("answer at least one of these questions yes or no");
    expect(es.guided.checks.screeningApplicability).toBe("responde sí o no al menos a una de estas preguntas");
    expect(render(EMPTY_APPLICABILITY_ANSWERS, "es")).toContain("Todavía no lo sé");
  });
});
