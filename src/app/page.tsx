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
import { OG_IMAGES, SEO, TWITTER_IMAGES, landingLocale } from "@/config/seo";
import { readLocale } from "@/lib/locale-cookie";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * The landing's title and description in the language it shows: `?lang=` first, then
 * the `locale` cookie (the same rule as the landing in the browser). English keeps the
 * layout's metadata untouched; Spanish replaces the title, the description and their
 * Open Graph and Twitter copies.
 */
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { lang } = await searchParams;
  const locale = landingLocale(lang, readLocale((await headers()).get("cookie")));
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

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/governance");
  }

  // Self-hosted / local-auth builds have no marketing landing. Send logged-out
  // visitors straight to the local sign-in.
  if (process.env.NEXT_PUBLIC_LOCAL_AUTH_ENABLED === "true") {
    redirect("/sign-in");
  }

  return <LandingPage hostedPilot={hostedPilotActive()} />;
}
