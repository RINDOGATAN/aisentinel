// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The band at the top of a step's page: the step's rule in one line, the
 * tick list, and, while the step is not done, what is left with "Finish
 * this step" first and "Continue anyway" second. The menu shows each stage's
 * count however few steps it holds, and the coming steps greyed in place.
 */

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { LayoutDashboard } from "lucide-react";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { AI_SENTINEL_PATH, EMPTY_PATH_COUNTS, type PathCounts } from "./path-config";
import { evaluateChecks, evaluatePath, type PathChecks } from "./path";

const state: { checks: PathChecks | null; pathname: string } = { checks: null, pathname: "/governance/other" };

vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));

vi.mock("./use-program-path", () => ({
  useProgramPathQuery: () => ({
    steps: null,
    checks: state.checks,
    screeningQuestionsOpen: 0,
    planStart: null,
    refreshing: false,
  }),
}));
vi.mock("@/lib/organization-context", () => ({
  useOrganization: () => ({ organization: null }),
}));

import { StepBand } from "./step-band";
import { PathMenu } from "./path-menu";

function band(stepId: string, counts: PathCounts, locale: "en" | "es" = "en") {
  const statuses = evaluatePath(AI_SENTINEL_PATH, counts);
  state.checks = evaluateChecks(AI_SENTINEL_PATH, counts);
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : es}>
      <StepBand stepId={stepId} statuses={statuses} />
    </NextIntlClientProvider>,
  );
}

describe("the step band", () => {
  it("says what is left and offers to finish the step before moving on", () => {
    const html = band("policies", { ...EMPTY_PATH_COUNTS, policies: 3 });
    expect(html).toContain('data-unfinished="true"');
    expect(html).toContain("Left here: approve an acceptable-use policy.");
    expect(html).toContain("Done when: an acceptable-use policy is approved or published.");
    const finish = html.indexOf("Finish this step");
    const anyway = html.indexOf("Continue anyway");
    expect(finish).toBeGreaterThan(-1);
    expect(anyway).toBeGreaterThan(finish);
    expect(html).not.toContain(">Next step<");
  });

  it("sends 'Finish this step' to where the first open condition is met", () => {
    const html = band("obligations", { ...EMPTY_PATH_COUNTS, jurisdictions: 1 });
    expect(html).toContain('href="/governance/obligations#questions"');
    expect(html).toContain("Answer the applicability check");
  });

  it("leaves out 'Finish this step' where it would lead to the page already open", () => {
    state.pathname = "/governance/policies";
    const html = band("policies", { ...EMPTY_PATH_COUNTS, policies: 3 });
    state.pathname = "/governance/other";
    expect(html).toContain("Left here:");
    expect(html).not.toContain("Finish this step");
    expect(html).toContain("Continue anyway");
  });

  it("offers only 'Next step' once the step is done", () => {
    const html = band("policies", { ...EMPTY_PATH_COUNTS, policies: 1, acceptableUsePolicyApproved: true });
    expect(html).not.toContain("data-unfinished");
    expect(html).not.toContain("Finish this step");
    expect(html).toContain("Next step");
    expect(html).toContain("Done when:");
  });

  it("says it in Spanish", () => {
    const html = band("policies", { ...EMPTY_PATH_COUNTS, policies: 3 }, "es");
    expect(html).toContain("Falta aquí: aprueba una política de uso aceptable.");
    expect(html).toContain("Terminar este paso");
    expect(html).toContain("Continuar de todos modos");
  });
});

describe("the stage count and the coming steps in the menu", () => {
  const interpolate = (text: string, values?: Record<string, string | number>) =>
    text.replace(/\{(\w+)\}/g, (_, k: string) => String(values?.[k] ?? `{${k}}`));
  const t = (key: string, values?: Record<string, string | number>) => {
    const value = key
      .split(".")
      .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en.guided);
    return typeof value === "string" ? interpolate(value, values) : key;
  };

  it("shows '0 of 1' for stage 2, and its coming steps greyed in place", () => {
    const html = renderToStaticMarkup(
      <PathMenu
        config={AI_SENTINEL_PATH}
        statuses={evaluatePath(AI_SENTINEL_PATH, EMPTY_PATH_COUNTS)}
        pathname="/governance/policies"
        stripeEnabled={false}
        variant="sidebar"
        t={t}
        overview={{ href: "/governance", icon: LayoutDashboard }}
      />,
    );
    const people = html.slice(html.indexOf('data-testid="stage-word-people"'));
    expect(people).toMatch(/^[^<]*>Not started · 0 of 1</);
    expect(html).toContain(en.guided.steps.prohibited.label);
    expect(html).toContain(en.guided.steps.literacy.label);
    expect(html).toContain('data-testid="step-rule-policies"');
  });
});
