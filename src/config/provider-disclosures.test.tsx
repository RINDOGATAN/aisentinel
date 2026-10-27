// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { EvidenceType } from "@prisma/client";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { cleanDisclosureUrl, hasDisclosures, type ProviderDisclosures } from "./provider-disclosures";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ vendor: { getById: { invalidate: () => undefined } } }),
    vendor: { update: { useMutation: () => ({ mutate: () => undefined, isPending: false }) } },
  },
}));

import { VendorDisclosuresCard } from "@/components/governance/vendor-disclosures-card";

const NONE: ProviderDisclosures = {
  safetyFrameworkUrl: null,
  transparencyReportUrl: null,
  modelCardUrl: null,
  signedGpaiCode: null,
  frontierDeveloper: null,
  disclosuresCheckedAt: null,
};

describe("provider disclosure links", () => {
  it("keeps http and https links, clears an empty one, refuses anything else", () => {
    expect(cleanDisclosureUrl(" https://example.com/safety ")).toBe("https://example.com/safety");
    expect(cleanDisclosureUrl("http://example.com")).toBe("http://example.com");
    expect(cleanDisclosureUrl("")).toBeNull();
    expect(cleanDisclosureUrl(null)).toBeNull();
    expect(cleanDisclosureUrl("javascript:alert(1)")).toBeUndefined();
    expect(cleanDisclosureUrl("example.com")).toBeUndefined();
    expect(cleanDisclosureUrl(`https://example.com/${"a".repeat(2001)}`)).toBeUndefined();
  });

  it("counts an unknown answer as nothing recorded", () => {
    expect(hasDisclosures(NONE)).toBe(false);
    expect(hasDisclosures({ ...NONE, signedGpaiCode: "UNKNOWN" })).toBe(false);
    expect(hasDisclosures({ ...NONE, frontierDeveloper: "NO" })).toBe(true);
    expect(hasDisclosures({ ...NONE, modelCardUrl: "https://example.com" })).toBe(true);
  });
});

describe("the provider disclosure evidence type", () => {
  it("exists in the schema, in the evidence router and in both languages", () => {
    expect(Object.values(EvidenceType)).toContain("PROVIDER_DISCLOSURE");
    const router = readFileSync(join(process.cwd(), "src/server/routers/governance/compliance.ts"), "utf8");
    const listed = router.match(/type: z\.enum\(\[([^\]]+)\]\)/)?.[1] ?? "";
    for (const value of Object.values(EvidenceType)) expect(listed, value).toContain(`"${value}"`);
    expect(en.common.evidenceProviderDisclosure).toBe("Provider disclosure");
    expect(es.common.evidenceProviderDisclosure).toBeTruthy();
  });
});

describe("the vendor page section", () => {
  const render = (disclosures: ProviderDisclosures, locale: "en" | "es" = "en") =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en} timeZone="UTC">
        <VendorDisclosuresCard organizationId="o" vendorId="v" disclosures={disclosures} canWrite />
      </NextIntlClientProvider>,
    );

  it("says nothing is recorded, with the help line and the guide link", () => {
    const html = render(NONE);
    expect(html).toContain(en.vendorDetail.disclosures.empty);
    expect(html).toContain("These come from the provider");
    expect(html).toContain('href="/docs/guides/frontier-ai"');
  });

  it("shows the recorded links and answers, in Spanish too", () => {
    const html = render(
      { ...NONE, safetyFrameworkUrl: "https://example.com/safety", signedGpaiCode: "YES", frontierDeveloper: "NO" },
      "es",
    );
    expect(html).toContain('href="https://example.com/safety"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain(es.vendorDetail.disclosures.fields.signedGpaiCode);
    expect(html).toContain(es.vendorDetail.disclosures.notRecorded);
  });
});
