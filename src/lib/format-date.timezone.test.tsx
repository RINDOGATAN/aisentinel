// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Date-only values (stored at 00:00 UTC) under a time zone west of UTC, where
 * reading them in local time moves them to the day before.
 */
process.env.TZ = "America/Los_Angeles";

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { formatCalendarDayIn, formatDateIn } from "./format-date";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ vendor: { getById: { invalidate: () => undefined } } }),
    vendor: { update: { useMutation: () => ({ mutate: () => undefined, isPending: false }) } },
  },
}));

import { VendorDisclosuresCard } from "@/components/governance/vendor-disclosures-card";

const STORED = new Date("2026-10-10T00:00:00.000Z");

describe("a calendar day under a US time zone", () => {
  it("runs west of UTC (local reading falls on the previous day)", () => {
    expect(STORED.getTimezoneOffset()).toBeGreaterThan(0);
    expect(formatDateIn("en", STORED)).toBe("Oct 9, 2026");
  });

  it("keeps the stored day, from a Date or from its ISO string, in both languages", () => {
    expect(formatCalendarDayIn("en", STORED)).toBe("Oct 10, 2026");
    expect(formatCalendarDayIn("en", STORED.toISOString())).toBe("Oct 10, 2026");
    expect(formatCalendarDayIn("es", STORED)).toBe("10 oct 2026");
    expect(formatCalendarDayIn("en", "2026-01-01")).toBe("Jan 1, 2026");
  });

  it("writes the missing-date mark for an empty value", () => {
    expect(formatCalendarDayIn("en", null)).toBe("N/A");
    expect(formatCalendarDayIn("es", undefined)).toBe("N/D");
  });

  it("shows the vendor's date last checked as the day that was entered", () => {
    const render = (locale: "en" | "es") =>
      renderToStaticMarkup(
        <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en} timeZone="America/Los_Angeles">
          <VendorDisclosuresCard
            organizationId="o"
            vendorId="v"
            canWrite={false}
            disclosures={{
              safetyFrameworkUrl: "https://example.com/safety",
              transparencyReportUrl: null,
              modelCardUrl: null,
              signedGpaiCode: "YES",
              frontierDeveloper: null,
              disclosuresCheckedAt: STORED,
            }}
          />
        </NextIntlClientProvider>,
      );
    const enHtml = render("en");
    expect(enHtml).toContain("Oct 10, 2026");
    expect(enHtml).not.toContain("Oct 9, 2026");
    expect(render("es")).toContain("10 oct 2026");
  });
});
