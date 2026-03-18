import Link from "next/link";
import {
  Crown,
  ShieldCheck,
  Gavel,
  Users,
  Eye,
  Check,
  X,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Roles & Permissions — AI SENTINEL Docs",
  description:
    "Understand the five user roles in AI SENTINEL and what each role can do across all governance modules.",
};

const roles = [
  {
    key: "OWNER",
    name: "Owner",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    summary: "Full platform control. Billing, team management, and all governance operations.",
    capabilities: [
      "Manage billing & subscription",
      "Invite and remove members",
      "Change member roles",
      "All Admin capabilities",
    ],
  },
  {
    key: "ADMIN",
    name: "Admin",
    icon: ShieldCheck,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    summary: "Organization management and full governance access without billing control.",
    capabilities: [
      "Invite and remove members",
      "Configure organization settings",
      "All AI Officer capabilities",
    ],
  },
  {
    key: "AI_OFFICER",
    name: "AI Officer",
    icon: Gavel,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    summary: "Governance authority. Approves assessments, publishes policies, and makes oversight decisions.",
    capabilities: [
      "Approve or reject assessments",
      "Publish policy versions",
      "Make oversight gate decisions",
      "Approve policies",
      "All Member capabilities",
    ],
  },
  {
    key: "MEMBER",
    name: "Member",
    icon: Users,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
    summary: "Day-to-day governance work. Creates records, submits assessments, reports incidents.",
    capabilities: [
      "Register AI systems",
      "Create assessments & submit for review",
      "Report incidents",
      "Create oversight gates",
      "Manage vendors & policies",
      "Report shadow AI usage",
    ],
  },
  {
    key: "VIEWER",
    name: "Viewer",
    icon: Eye,
    color: "text-gray-400",
    bg: "bg-gray-400/10",
    border: "border-gray-400/20",
    summary: "Read-only access. Can view all dashboards, records, and reports but cannot make changes.",
    capabilities: [
      "View executive dashboard",
      "Browse AI registry & risk classifications",
      "View assessments, incidents, policies",
      "Access compliance mapping reports",
      "View vendor & oversight information",
    ],
  },
];

const permissionMatrix = [
  { action: "View dashboards & records", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: true, VIEWER: true },
  { action: "Create & edit records", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: true, VIEWER: false },
  { action: "Delete records", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: true, VIEWER: false },
  { action: "Approve assessments", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: false, VIEWER: false },
  { action: "Publish policies", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: false, VIEWER: false },
  { action: "Make oversight decisions", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: false, VIEWER: false },
  { action: "Invite & remove members", OWNER: true, ADMIN: true, AI_OFFICER: false, MEMBER: false, VIEWER: false },
  { action: "Change member roles", OWNER: true, ADMIN: false, AI_OFFICER: false, MEMBER: false, VIEWER: false },
  { action: "Manage billing", OWNER: true, ADMIN: false, AI_OFFICER: false, MEMBER: false, VIEWER: false },
];

export default function RolesDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl sm:text-4xl font-display tracking-tight">
            Roles & Permissions
          </h1>
          <Link
            href="/docs/roles/es"
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            Espa&ntilde;ol <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          AI SENTINEL uses five roles to control access to governance operations.
          Every action is enforced at the server level — the interface adapts to show
          only what your role allows.
        </p>
      </section>

      {/* Role Hierarchy */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Role Hierarchy</h2>
        <div className="flex flex-col items-center gap-0">
          {roles.map((role, i) => {
            const Icon = role.icon;
            return (
              <div key={role.key} className="w-full max-w-xl">
                <div
                  className={`rounded-xl border ${role.border} bg-card p-5 flex items-start gap-4 relative`}
                  style={{ marginLeft: `${i * 16}px` }}
                >
                  <div className={`w-10 h-10 rounded-lg ${role.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${role.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{role.name}</h3>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${role.bg} ${role.color}`}>
                        {role.key === "AI_OFFICER" ? "AI Officer" : role.key}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{role.summary}</p>
                  </div>
                </div>
                {i < roles.length - 1 && (
                  <div className="flex justify-center py-1" style={{ marginLeft: `${i * 16 + 20}px` }}>
                    <div className="w-px h-4 bg-border" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Each role inherits all capabilities from the roles below it.
        </p>
      </section>

      {/* What Each Role Can Do */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">What Each Role Can Do</h2>
        <div className="grid gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div key={role.key} className={`rounded-xl border ${role.border} bg-card p-5`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${role.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${role.color}`} />
                  </div>
                  <h3 className="font-semibold">{role.name}</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {role.capabilities.map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className={`w-3.5 h-3.5 shrink-0 ${role.color}`} />
                      {cap}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Permissions Matrix */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Permissions Matrix</h2>
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                {roles.map((r) => (
                  <th key={r.key} className="p-3 text-center font-medium whitespace-nowrap">
                    <span className={r.color}>{r.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((row) => (
                <tr key={row.action} className="border-b border-border last:border-0">
                  <td className="p-3 text-muted-foreground">{row.action}</td>
                  {roles.map((r) => (
                    <td key={r.key} className="p-3 text-center">
                      {row[r.key as keyof typeof row] ? (
                        <Check className="w-4 h-4 text-emerald-400 inline-block" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/30 inline-block" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Default Role */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">How Roles Are Assigned</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-2">Organization Creator</h3>
            <p className="text-sm text-muted-foreground">
              The user who creates an organization is automatically assigned the
              <span className="text-amber-400 font-medium"> Owner</span> role.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-2">Invited or Auto-Joined Users</h3>
            <p className="text-sm text-muted-foreground">
              Users who are invited or who join via email domain matching receive the
              <span className="text-violet-400 font-medium"> Member</span> role by default. An Owner can change their role at any time.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-2">Viewer Access</h3>
            <p className="text-sm text-muted-foreground">
              The Viewer role is assigned explicitly by an Owner or Admin. Viewers see a clean
              read-only interface — create and edit buttons are hidden, not just disabled.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-2">Role Changes</h3>
            <p className="text-sm text-muted-foreground">
              Only the organization Owner can change member roles. All role changes are
              recorded in the audit trail.
            </p>
          </div>
        </div>
      </section>

      {/* Server-Side Enforcement */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Server-Side Enforcement</h2>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            All permissions are enforced at the API level, not just the interface.
            Even if a user crafts a direct API request, the server verifies their role
            and organization membership before processing any operation. This means
            security does not depend on what the browser shows or hides.
          </p>
        </div>
      </section>
    </div>
  );
}
