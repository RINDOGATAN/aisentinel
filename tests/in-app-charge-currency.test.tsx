// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Inside the product, every price hint shows the currency the customer will
 * actually be charged: euros only in the 27 EU member states, US dollars
 * everywhere else, whatever the interface language. The pilot bar's price
 * and its "Move to the paid plan" button come from one decision
 * (inAppPlanOffer, src/server/services/plan-eu/offer.ts), so they always
 * agree. The public Spanish landing keeps its own rule (always euros).
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { createElement, isValidElement, Children, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";

const EUR_LINK = "https://pay.example.test/eur";
const USD_LINK = "https://pay.example.test/usd";

const mocks = vi.hoisted(() => ({
  locale: "en" as "en" | "es",
  country: null as string | null,
  acceptLanguage: null as string | null,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
  headers: vi.fn(async () => requestHeaders()),
}));
vi.mock("next-intl/server", () => ({ getLocale: vi.fn(async () => mocks.locale) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => ({ user: { id: "user-1", email: "owner@example.test" } })),
}));
vi.mock("@/components/dashboard-shell", () => ({
  DashboardShell: ({ children }: { children: ReactNode }) => createElement("main", null, children),
}));
vi.mock("@/lib/organization-context", () => ({
  useOrganization: () => ({ organization: { id: "org1", name: "Org", slug: "org", plan: "PILOT", role: "OWNER" } }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    pilot: {
      status: {
        useQuery: (_input: unknown, opts: { enabled?: boolean }) => ({
          data: opts?.enabled
            ? {
                active: true,
                endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                readOnly: false,
                startedAt: new Date(),
              }
            : undefined,
        }),
      },
    },
  },
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    organizationMember: {
      findMany: vi.fn(async () => [{ organizationId: "org1", role: "OWNER", organization: { plan: null } }]),
    },
  },
}));

import DashboardLayout from "@/app/(dashboard)/layout";
import { GET as planCheckoutRoute } from "@/app/api/plan/checkout/route";
import { useChargeCurrency } from "@/components/charge-currency";
import { formatPrice, PREMIUM_KIT_PRICE_PER_YEAR } from "@/lib/currency";
import { CLOUD_PLAN_PRICE_EN, CLOUD_PLAN_PRICE_ES } from "@/config/pilot";
import { inAppPlanOffer } from "@/server/services/plan-eu/offer";

function requestHeaders(): Headers {
  const h = new Headers();
  if (mocks.country) h.set("x-vercel-ip-country", mocks.country);
  if (mocks.acceptLanguage) h.set("accept-language", mocks.acceptLanguage);
  return h;
}

/** A signed-in page with the add-on and kit price hints, written as the app writes them. */
function InAppHints() {
  const currency = useChargeCurrency();
  return createElement(
    "p",
    null,
    createElement("span", { "data-hint": "addon" }, formatPrice(9, currency)),
    createElement("span", { "data-hint": "kit" }, formatPrice(PREMIUM_KIT_PRICE_PER_YEAR, currency, mocks.locale)),
  );
}

/** Resolves the async server components (the pilot bar's gate) so the tree renders statically. */
async function resolve(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolve));
  if (!isValidElement(node)) return node;
  const el = node as ReactElement<{ children?: ReactNode }>;
  if (typeof el.type === "function" && el.type.constructor.name === "AsyncFunction") {
    return resolve(await (el.type as (p: unknown) => Promise<ReactNode>)(el.props));
  }
  const children = el.props.children;
  if (children === undefined) return el;
  const resolved = await resolve(Children.toArray(children).length === 1 ? children : Children.toArray(children));
  return { ...el, props: { ...el.props, children: resolved } } as ReactElement;
}

async function renderSignedIn(locale: "en" | "es"): Promise<string> {
  mocks.locale = locale;
  const tree = await DashboardLayout({ children: createElement(InAppHints) });
  return renderToStaticMarkup((await resolve(tree)) as ReactElement);
}

/** Where "Move to the paid plan" sends this request. */
async function buttonTarget(): Promise<string | null> {
  const res = await planCheckoutRoute(
    new NextRequest("https://app.example.test/api/plan/checkout?org=org1", { headers: requestHeaders() }),
  );
  return res.status === 303 ? res.headers.get("location") : null;
}

const hint = (html: string, name: string) => new RegExp(`data-hint="${name}">([^<]*)<`).exec(html)?.[1];

function switchOn() {
  vi.stubEnv("NEXT_PUBLIC_HOSTED_PILOT", "true");
  vi.stubEnv("AUTO_UPGRADE_ENABLED", "true");
  vi.stubEnv("PLAN_SYNC_SECRET", "test-secret-of-sixteen-plus");
  vi.stubEnv("PLAN_CLOUD_EUR_LINK", EUR_LINK);
  vi.stubEnv("PLAN_CLOUD_USD_LINK", USD_LINK);
}

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.country = null;
  mocks.acceptLanguage = null;
});

const CASES = [
  { name: "Spanish interface outside the EU", locale: "es", country: "US", currency: "USD", addon: "$9", kit: "60 US$", link: USD_LINK },
  { name: "Spanish interface in the EU", locale: "es", country: "ES", currency: "EUR", addon: "€9", kit: "60 €", link: EUR_LINK },
  { name: "English interface in the EU", locale: "en", country: "DE", currency: "EUR", addon: "€9", kit: "€60", link: EUR_LINK },
  { name: "English interface in the US", locale: "en", country: "US", currency: "USD", addon: "$9", kit: "$60", link: USD_LINK },
] as const;

const barPrice = (locale: "en" | "es", currency: "USD" | "EUR") =>
  (locale === "es" ? CLOUD_PLAN_PRICE_ES : CLOUD_PLAN_PRICE_EN)[currency];

describe("in-app prices follow the charge currency, not the language", () => {
  it.each(CASES)("$name: hints in $currency, button to the $currency link", async (c) => {
    switchOn();
    mocks.country = c.country;
    const html = await renderSignedIn(c.locale);

    expect(html).toContain('data-testid="pilot-end-bar"');
    expect(html).toContain(barPrice(c.locale, c.currency));
    expect(hint(html, "addon")).toBe(c.addon);
    expect(hint(html, "kit")).toBe(c.kit);
    expect(html).toContain('data-testid="pilot-upgrade-link"');

    expect(inAppPlanOffer(requestHeaders()).currency).toBe(c.currency);
    expect(await buttonTarget()).toMatch(new RegExp(`^${c.link}\\?`));

    const other = c.currency === "USD" ? /€/ : /\$/;
    expect(html.replace(/<[^>]+>/g, " ")).not.toMatch(other);
  });

  it("the hint and the button always agree, for every country and language", async () => {
    switchOn();
    const countries = [null, "US", "MX", "AR", "GB", "CH", "NO", "ES", "DE", "FR", "IE", "GR", "XX"];
    const languages = [null, "es-ES,es;q=0.9", "es-MX", "en-GB", "en-US"];
    for (const locale of ["en", "es"] as const) {
      for (const country of countries) {
        for (const acceptLanguage of languages) {
          mocks.country = country;
          mocks.acceptLanguage = acceptLanguage;
          const html = await renderSignedIn(locale);
          const target = await buttonTarget();
          const charged = target?.startsWith(EUR_LINK) ? "EUR" : target?.startsWith(USD_LINK) ? "USD" : null;
          const label = `${locale} ${country} ${acceptLanguage}`;
          expect(charged, label).not.toBeNull();
          expect(html, label).toContain(barPrice(locale, charged!));
        }
      }
    }
  });
});
