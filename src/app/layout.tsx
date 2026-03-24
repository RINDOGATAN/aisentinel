import type { Metadata, Viewport } from "next";
import { Jost, Archivo_Black } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { brand } from "@/config/brand";

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  weight: ["400", "500", "600", "700"],
});

const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const siteUrl = "https://aisentinel.todo.law";
const seoTitle = "AI SENTINEL — AI Governance Software for EU AI Act, NIST AI RMF & ISO 42001 Compliance";
const seoDescription =
  "Open-source AI governance platform. AI system registry, EU AI Act risk classification, FRIA assessments, compliance mapping across EU AI Act, NIST AI RMF and ISO 42001, human oversight, and incident management. Responsible AI made accountable.";

export const metadata: Metadata = {
  title: seoTitle,
  description: seoDescription,
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  keywords: [
    "AI governance software",
    "EU AI Act compliance",
    "AI compliance management",
    "NIST AI RMF",
    "ISO 42001",
    "responsible AI",
    "AI risk management",
    "AI registry",
    "AI Act compliance tool",
    "AI governance platform",
    "FRIA assessment",
    "AI incident management",
    "human oversight AI",
    "AI system inventory",
    "AI audit",
  ],
  authors: [{ name: brand.companyName, url: brand.companyWebsite }],
  creator: brand.companyName,
  publisher: brand.companyName,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: brand.name,
    title: seoTitle,
    description: seoDescription,
    images: [{ url: "/favicon.png", width: 512, height: 512, alt: "AI SENTINEL logo" }],
  },
  twitter: {
    card: "summary",
    title: seoTitle,
    description: seoDescription,
    images: ["/favicon.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/favicon.png",
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://t.sealmetrics.com" />
        <script async src="https://t.sealmetrics.com/t.js?id=todolaw" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "AI SENTINEL",
              url: siteUrl,
              description: seoDescription,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "EUR",
                description: "Free open-source core. Premium add-ons from \u20ac9/mo.",
              },
              featureList: [
                "AI System Registry",
                "EU AI Act Risk Classification",
                "FRIA & Conformity Assessments",
                "Compliance Mapping (EU AI Act, NIST AI RMF, ISO 42001)",
                "Cross-Framework Compliance Propagation",
                "Human Oversight Gates",
                "AI Incident Management",
                "Shadow AI Discovery",
                "AI Vendor Catalog",
                "Policy Management",
              ],
              author: {
                "@type": "Organization",
                name: "TODO.LAW",
                url: "https://todo.law",
              },
            }),
          }}
        />
      </head>
      <body className={`${jost.variable} ${archivoBlack.variable} font-sans antialiased`}>
        <Providers session={session}>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
