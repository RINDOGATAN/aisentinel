// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LandingPage from "@/landing/LandingPage";
import { hostedPilotActive } from "@/config/pilot";
import { brand } from "@/config/brand";
import { OG_IMAGES, SEO, TWITTER_IMAGES } from "@/config/seo";
import { requestLandingLocale } from "@/lib/landing-locale";
import type { Locale } from "@/lib/locale-cookie";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * The landing's language: `?lang=`, then the `locale` cookie, then Accept-Language
 * (src/lib/landing-locale.ts). The middleware decides it for "/" and passes it on;
 * the search parameters and the request headers are read again here as a fallback.
 */
async function pageLocale(searchParams: SearchParams): Promise<Locale> {
  const h = await headers();
  const decided = h.get("x-landing-lang");
  if (decided === "es" || decided === "en") return decided;
  const { lang } = await searchParams;
  return requestLandingLocale(Array.isArray(lang) ? lang[0] : lang, h.get("cookie"), h.get("accept-language"));
}

/**
 * The landing's title and description in the language it shows. English keeps the
 * layout's metadata untouched; Spanish replaces the title, the description and their
 * Open Graph and Twitter copies.
 */
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const locale = await pageLocale(searchParams);
  if (locale === "en") return {};
  const { title, description, ogLocale } = SEO.es;
  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: brand.siteUrl,
      siteName: brand.name,
      title,
      description,
      images: OG_IMAGES,
    },
    twitter: { card: "summary", title, description, images: TWITTER_IMAGES },
  };
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/governance");
  }

  // Self-hosted / local-auth builds have no marketing landing. Send logged-out
  // visitors straight to the local sign-in.
  if (process.env.NEXT_PUBLIC_LOCAL_AUTH_ENABLED === "true") {
    redirect("/sign-in");
  }

  // Rendered in its language on the server, so the first paint is never in the other one.
  return <LandingPage hostedPilot={hostedPilotActive()} initialLocale={await pageLocale(searchParams)} />;
}
