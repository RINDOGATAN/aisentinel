"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import {
  Brain,
  ShieldAlert,
  ClipboardCheck,
  Scale,
  Eye,
  AlertTriangle,
  Search,
  LogOut,
  User,
  Menu,
  BookOpen,
  Lock,
  LayoutDashboard,
  Building2,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useOrganization } from "@/lib/organization-context";
import { OrganizationSetup } from "@/components/governance/organization-setup";

const navItems = [
  { href: "/governance", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/governance/ai-registry", label: "AI Registry", icon: Brain },
  { href: "/governance/risk-classification", label: "Risk", icon: ShieldAlert },
  { href: "/governance/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/governance/oversight", label: "Oversight", icon: Eye },
  { href: "/governance/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/governance/compliance", label: "Compliance", icon: Scale },
  { href: "/governance/vendors", label: "Vendors", icon: Building2 },
  { href: "/governance/policies", label: "Policies", icon: ScrollText },
  { href: "/governance/shadow-ai", label: "Shadow AI", icon: Search, premium: true },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { organization, organizations, isLoading: orgLoading } = useOrganization();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!organization && organizations.length === 0) {
    return <OrganizationSetup />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <span className="text-lg font-bold tracking-tight">AI SENTINEL</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(item.href + "/");

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        <Button
                          variant="ghost"
                          className={`w-full justify-start gap-3 h-12 text-base ${
                            isActive ? "bg-primary/20 text-primary hover:bg-primary/30 hover:text-primary" : ""
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {item.label}
                          {item.premium && (
                            <Lock className="w-3 h-3 ml-auto text-muted-foreground" />
                          )}
                        </Button>
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/governance" className="flex items-center shrink-0">
              <span className="text-sm font-bold tracking-tight text-muted-foreground">TODO.LAW<sup className="text-[8px] align-super">™</sup></span>
              <span className="text-lg font-bold tracking-tight ml-2">AI SENTINEL</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.filter(item => !item.exact).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 ${isActive ? "bg-primary/20 text-primary hover:bg-primary/30 hover:text-primary" : ""}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                    {item.premium && <Lock className="w-3 h-3" />}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="hidden lg:inline max-w-[150px] truncate">{session?.user?.email}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/sign-in" })}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {children}
      </main>

      <footer className="border-t border-border mt-auto py-4">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground space-y-1">
          <p>AI SENTINEL is a <a href="https://todo.law" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">TODO.LAW</a> service.</p>
          <div className="flex items-center justify-center gap-3">
            <a href="https://todo.law/terms" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Scale className="w-3.5 h-3.5" />
              Terms
            </a>
            <span className="text-border">&middot;</span>
            <a href="https://todo.law/privacy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <BookOpen className="w-3.5 h-3.5" />
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
