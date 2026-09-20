// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The artifact PDF, rendered for real.
 *
 * A document generator that only type-checks is a document generator that fails
 * the first time someone clicks the button: @react-pdf throws at render time on
 * an unsupported style, a missing font or an element nested where it cannot go.
 * So these tests call renderToBuffer and look at the bytes, in both languages
 * and with the awkward inputs (no answers at all, no classification, no named
 * preparer).
 */

import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildSystemScope } from "@/server/services/scope/system-scope";
import {
  buildAgenticAddendumArtifact,
  buildAssessmentArtifact,
  buildNoticeArtifact,
  buildProtocolArtifact,
} from "@/server/services/artifacts/build-artifacts";
import { ARTIFACT_CHROME, renderArtifactDocument } from "./artifact-doc";

const system = (over: Record<string, unknown> = {}) =>
  ({
    id: "sys1",
    name: "Applicant ranker",
    technique: "MACHINE_LEARNING",
    role: "DEPLOYER",
    status: "DEPLOYED",
    purpose: "Ranks applicants for a first sift",
    description: "A gradient-boosted ranker over CV text.",
    businessOwner: "Head of hiring",
    technicalOwner: "Platform team",
    processesPersonalData: true,
    jurisdictionOverride: [],
    metadata: null,
    riskClassification: { riskLevel: "HIGH", annexIIICategory: "employment_contracting" },
    admtProfile: null,
    agentProfile: null,
    transparencyProfile: null,
    ...over,
  }) as Parameters<typeof buildSystemScope>[0];

const org = () =>
  ({ name: "A firm", operatingJurisdictions: ["EU"], settings: null }) as Parameters<
    typeof buildSystemScope
  >[1];

const input = (over: Record<string, unknown> = {}) => ({
  scope: buildSystemScope(system(over.system as never), org()),
  answers:
    (over.answers as Record<string, unknown>) ??
    ({
      sys_description: "A gradient-boosted ranker over CV text, retrained quarterly.",
      people_categories: "Applicants for junior roles.",
    } as Record<string, unknown>),
  locale: (over.locale as "en" | "es") ?? ("en" as const),
  generatedAt: "2026-09-19",
  preparedBy:
    over.preparedBy === null
      ? null
      : ((over.preparedBy as never) ?? {
          name: "A. Reviewer",
          email: "reviewer@example.test",
          role: "AI_OFFICER",
        }),
});

/** A PDF, by its magic bytes, and big enough to hold more than a cover. */
async function render(artifact: Parameters<typeof renderArtifactDocument>[0]["artifact"], locale: "en" | "es") {
  const buffer = await renderToBuffer(
    renderArtifactDocument({ artifact, chrome: ARTIFACT_CHROME[locale], locale }),
  );
  expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  // More than a cover: the embedded fonts alone run to kilobytes, and a
  // document that silently rendered only its first page would still start
  // with %PDF-.
  expect(buffer.length).toBeGreaterThan(20_000);
  return buffer;
}

describe("the artifact PDF renders", () => {
  it.each(["en", "es"] as const)("%s: the impact assessment", async (locale) => {
    await render(buildAssessmentArtifact(input({ locale })), locale);
  }, 30_000);

  it("the notice, the protocol and the agentic addendum", async () => {
    for (const build of [buildNoticeArtifact, buildProtocolArtifact, buildAgenticAddendumArtifact]) {
      await render(build(input()), "en");
    }
  }, 60_000);

  it("with nothing answered, so every section is a gap block", async () => {
    await render(buildAssessmentArtifact(input({ answers: {} })), "en");
  }, 30_000);

  it("with no risk classification and no named preparer", async () => {
    await render(
      buildAssessmentArtifact(
        input({ system: { riskClassification: null }, preparedBy: null }),
      ),
      "en",
    );
  }, 30_000);
});

describe("the PDF chrome is complete in both languages", () => {
  it("has every label, and none of them is the English one in Spanish", () => {
    const keys = Object.keys(ARTIFACT_CHROME.en) as (keyof typeof ARTIFACT_CHROME.en)[];
    expect(Object.keys(ARTIFACT_CHROME.es).sort()).toEqual([...keys].sort());
    // Only "PDF"-like tokens could legitimately match across the two.
    const shared = keys.filter((k) => ARTIFACT_CHROME.en[k] === ARTIFACT_CHROME.es[k]);
    expect(shared).toEqual([]);
    for (const k of keys) {
      expect(ARTIFACT_CHROME.es[k]).not.toMatch(/[—–]/);
      expect(ARTIFACT_CHROME.es[k]).not.toMatch(/\busted\b/i);
    }
  });
});
