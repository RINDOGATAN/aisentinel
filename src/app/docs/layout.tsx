"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  ShieldAlert,
  ClipboardCheck,
  Eye,
  AlertTriangle,
  Scale,
  Building2,
  ScrollText,
  BookOpen,
  Menu,
  X,
  Search,
  BookMarked,
  FileCheck,
  Activity,
  Shield,
} from "lucide-react";
import { useState } from "react";

const sidebarItems = [
  { href: "/docs", label: "Getting Started", icon: BookOpen, exact: true },
  { href: "/docs/ai-registry", label: "AI Registry", icon: Brain },
  { href: "/docs/risk-classification", label: "Risk Classification", icon: ShieldAlert },
  { href: "/docs/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/docs/oversight", label: "Human Oversight", icon: Eye },
  { href: "/docs/incidents", label: "AI Incidents", icon: AlertTriangle },
  { href: "/docs/compliance", label: "Compliance", icon: Scale },
  { href: "/docs/vendors", label: "Vendor Risk", icon: Building2 },
  { href: "/docs/policies", label: "Policy Management", icon: ScrollText },
  { href: "/docs/shadow-ai", label: "Shadow AI Discovery", icon: Search, premium: true },
  { href: "/docs/vendor-catalog", label: "AI Vendor Catalog", icon: BookMarked, premium: true },
  { href: "/docs/conformity-assessment", label: "Conformity Assessment", icon: FileCheck, premium: true },
  { href: "/docs/bias-fairness", label: "Bias & Fairness", icon: Activity, premium: true },
  { href: "/docs/security", label: "Security & Trust", icon: Shield },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-md hover:bg-secondary transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/" className="flex items-center">
              <span className="text-lg font-bold tracking-tight text-muted-foreground">
                TODO.LAW<sup className="text-xs align-super">™</sup>
              </span>
              <span className="text-lg font-bold tracking-tight ml-2">AI SENTINEL</span>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/docs"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 py-8">
          {/* Sidebar */}
          <aside
            className={`md:col-span-1 ${
              sidebarOpen ? "block" : "hidden"
            } md:block`}
          >
            <nav className="sticky top-20 space-y-1">
              {sidebarItems.map((item, i) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                const showPremiumLabel =
                  item.premium && (i === 0 || !sidebarItems[i - 1].premium);

                return (
                  <div key={item.href}>
                    {showPremiumLabel && (
                      <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        Premium
                      </div>
                    )}
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-primary/15 text-primary border border-primary/20 font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </Link>
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <main className="md:col-span-4 min-w-0">{children}</main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-4">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground space-y-2">
          <p>
            AI SENTINEL is a{" "}
            <a
              href="https://todo.law"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              TODO.LAW
            </a>{" "}
            service.
          </p>
          <div className="flex items-center justify-center gap-1">
            <a
              href="https://todo.law/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-border">&middot;</span>
            <a
              href="https://todo.law/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors"
            >
              Terms of Service
            </a>
            <span className="text-border">&middot;</span>
            <Link
              href="/docs"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors"
            >
              How It Works
            </Link>
            <span className="text-border">&middot;</span>
            <Link
              href="/docs/security"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors"
            >
              Security
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
