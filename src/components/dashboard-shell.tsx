"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
  ChevronDown,
  CreditCard,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  { href: "/governance/vendor-catalog", label: "Vendor Catalog", icon: Database, premium: true },
  { href: "/governance/policies", label: "Policies", icon: ScrollText },
  { href: "/governance/shadow-ai", label: "Shadow AI", icon: Search, premium: true },
];

const navGroups = [
  {
    label: "AI Systems",
    icon: Brain,
    items: [
      { href: "/governance/ai-registry", label: "AI Registry", icon: Brain },
      { href: "/governance/risk-classification", label: "Risk Classification", icon: ShieldAlert },
    ],
  },
  {
    label: "Governance",
    icon: Scale,
    items: [
      { href: "/governance/assessments", label: "Assessments", icon: ClipboardCheck },
      { href: "/governance/oversight", label: "Oversight", icon: Eye },
      { href: "/governance/compliance", label: "Compliance", icon: Scale },
      { href: "/governance/policies", label: "Policies", icon: ScrollText },
    ],
  },
  {
    label: "Operations",
    icon: AlertTriangle,
    items: [
      { href: "/governance/incidents", label: "Incidents", icon: AlertTriangle },
      { href: "/governance/vendors", label: "Vendors", icon: Building2 },
      { href: "/governance/vendor-catalog", label: "Vendor Catalog", icon: Database, premium: true },
      { href: "/governance/shadow-ai", label: "Shadow AI", icon: Search, premium: true },
      { href: "/governance/billing", label: "Billing", icon: CreditCard },
    ],
  },
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
              <SheetContent side="left" className="w-[300px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <span className="text-lg font-bold tracking-tight">AI SENTINEL</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-0.5">
                  {/* Dashboard link */}
                  <Link
                    href="/governance"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={`w-full justify-start gap-3 min-h-[48px] text-base rounded-lg ${
                        pathname === "/governance"
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : ""
                      }`}
                    >
                      <LayoutDashboard className="w-5 h-5 shrink-0" />
                      Dashboard
                    </Button>
                  </Link>

                  <div className="h-px bg-border my-2" />

                  {/* Grouped nav items */}
                  {navGroups.map((group) => (
                    <div key={group.label} className="mb-2">
                      <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </p>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileNavOpen(false)}
                          >
                            <Button
                              variant="ghost"
                              className={`w-full justify-start gap-3 min-h-[48px] text-base rounded-lg ${
                                isActive
                                  ? "bg-primary/15 text-primary border border-primary/20"
                                  : ""
                              }`}
                            >
                              <Icon className="w-5 h-5 shrink-0" />
                              {item.label}
                              {item.premium && (
                                <Lock className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
                              )}
                            </Button>
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/governance" className="flex items-center shrink-0">
              <span className="text-lg font-bold tracking-tight text-muted-foreground">TODO.LAW<sup className="text-xs align-super">™</sup></span>
              <span className="text-lg font-bold tracking-tight ml-2">AI SENTINEL</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navGroups.map((group) => {
              const GroupIcon = group.icon;
              const isGroupActive = group.items.some(
                (item) => pathname === item.href || pathname.startsWith(item.href + "/")
              );

              return (
                <DropdownMenu key={group.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-1.5 ${
                        isGroupActive
                          ? "bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 hover:text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <GroupIcon className="w-4 h-4" />
                      <span className="hidden lg:inline">{group.label}</span>
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[180px]">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">{group.label}</DropdownMenuLabel>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-2 ${
                              isActive ? "bg-primary/10 text-primary" : ""
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {item.label}
                            {item.premium && <Lock className="w-3 h-3 ml-auto text-muted-foreground" />}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
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
              onClick={async () => {
                await fetch("/api/auth/cross-logout", { method: "POST" });
                window.location.href = "/sign-in";
              }}
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
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground space-y-2">
          <p>AI SENTINEL is a <a href="https://todo.law" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">TODO.LAW</a> service.</p>
          <div className="flex items-center justify-center gap-1">
            <a href="https://todo.law/terms" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
              <Scale className="w-3.5 h-3.5" />
              Terms
            </a>
            <span className="text-border">&middot;</span>
            <a href="https://todo.law/privacy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
              <BookOpen className="w-3.5 h-3.5" />
              Privacy
            </a>
            <span className="text-border">&middot;</span>
            <Link href="/docs" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
              <BookOpen className="w-3.5 h-3.5" />
              Docs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
