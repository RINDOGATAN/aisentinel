"use client";

import Link from "next/link";
import { brand } from "@/config/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-negative.svg" alt="TODO.LAW" style={{ height: "28px", width: "auto" }} />
            <span className="text-lg tracking-tight text-muted-foreground" style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", fontWeight: 600 }}>AI SENTINEL</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        {children}
      </main>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
          <a href={brand.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
            Privacy Policy
          </a>
          <span className="hidden sm:inline">&middot;</span>
          <a href={brand.termsOfUseUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
            Terms of Service
          </a>
        </div>
      </footer>
    </div>
  );
}
