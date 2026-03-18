export const metadata = {
  title: "Security & Trust — AI SENTINEL Docs",
  description:
    "How AI SENTINEL protects your organization's data with enterprise-grade security controls.",
};

export default function SecurityDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          Security & Trust
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          AI SENTINEL is built for organizations that manage sensitive AI governance data.
          Security is embedded in every layer of the platform — from how we isolate your data
          to how we control access and protect your information.
        </p>
      </section>

      {/* Data Isolation */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Data Isolation</h2>
        <p className="text-muted-foreground mb-6">
          Every organization on AI SENTINEL operates in a fully isolated environment.
          Your AI systems, assessments, policies, incidents, and vendor data are
          never accessible to other organizations.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            {
              title: "Organization-Scoped Queries",
              description:
                "Every database query is automatically scoped to your organization. There is no way to access another organization's data through the application.",
            },
            {
              title: "Verified Membership",
              description:
                "Before any operation, we verify that the requesting user is an active member of the organization. Membership is checked on every single request.",
            },
            {
              title: "Cross-Tenant Protection",
              description:
                "Operations that reference related entities (e.g., linking a policy to an AI system) verify that both entities belong to your organization.",
            },
            {
              title: "Shared Reference Data Only",
              description:
                "Only non-sensitive reference data (compliance frameworks, assessment templates) is shared across organizations. Your governance data is never shared.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Access Control */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Access Control</h2>
        <p className="text-muted-foreground mb-6">
          AI SENTINEL enforces role-based access control (RBAC) across the entire platform.
          Every action is checked against your role before it is executed.
        </p>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex flex-wrap gap-3 mb-4">
            {["Owner", "Admin", "AI Officer", "Member", "Viewer"].map(
              (role, i) => (
                <div key={role} className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {role}
                  </span>
                  {i < 4 && <span className="text-muted-foreground">›</span>}
                </div>
              )
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Read-Only Enforcement</h4>
              <p className="text-muted-foreground">
                Viewers have guaranteed read-only access. All write operations are blocked
                at the server level, not just the UI — preventing unauthorized modifications
                even through API calls.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Elevated Permissions</h4>
              <p className="text-muted-foreground">
                Sensitive operations like approving assessments, publishing policies, and
                making oversight decisions require AI Officer, Admin, or Owner roles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Authentication</h2>
        <p className="text-muted-foreground mb-6">
          We support industry-standard authentication methods with additional hardening
          for production environments.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            {
              title: "Google OAuth",
              description: "Enterprise SSO via Google with OAuth 2.0",
            },
            {
              title: "Magic Link",
              description: "Passwordless email authentication for secure sign-in",
            },
            {
              title: "Cross-Platform SSO",
              description: "Single sign-on across the TODO.LAW platform",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 mt-4">
          <h4 className="font-medium mb-3 text-sm">Session Security</h4>
          <div className="grid sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                HTTP-only cookies prevent client-side access to session tokens
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Secure cookie flag enforced in production (HTTPS only)
              </li>
            </ul>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                CSRF protection on all authenticated requests
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                SameSite cookie policy prevents cross-site request forgery
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Input Validation */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Input Validation</h2>
        <p className="text-muted-foreground mb-6">
          All user inputs are validated on the server before reaching business logic.
          This protects against injection attacks and ensures data integrity.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            {
              title: "Schema Validation",
              description:
                "Every API input is validated against a strict schema. Invalid data is rejected before it reaches the database.",
            },
            {
              title: "Parameterized Queries",
              description:
                "All database queries use parameterized inputs. Raw SQL is never used, eliminating SQL injection risk.",
            },
            {
              title: "Enum Enforcement",
              description:
                "Status fields, risk levels, and categories use strict enum validation. Only predefined values are accepted.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Audit Trail */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Audit Trail</h2>
        <p className="text-muted-foreground mb-6">
          Every create, update, delete, and significant business operation is logged
          to an immutable audit trail. This supports compliance requirements and
          provides a complete record of governance activities.
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">What We Log</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>• AI system lifecycle changes</li>
                <li>• Risk classification decisions</li>
                <li>• Assessment submissions and approvals</li>
                <li>• Oversight decisions</li>
                <li>• Policy changes and publications</li>
                <li>• Incident management actions</li>
                <li>• Organization membership changes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Retention</h4>
              <p className="text-muted-foreground">
                Audit records are preserved even if the associated user or organization
                is deleted. This ensures your compliance history remains intact
                regardless of personnel changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Transport & Infrastructure */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Transport & Infrastructure</h2>
        <p className="text-muted-foreground mb-6">
          Your data is protected in transit and at rest through industry-standard
          security measures.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            {
              title: "HTTPS Everywhere",
              description:
                "All connections are encrypted with TLS. HSTS headers ensure browsers always use secure connections.",
            },
            {
              title: "Clickjacking Protection",
              description:
                "Security headers prevent the application from being embedded in frames on other sites.",
            },
            {
              title: "Content Security",
              description:
                "MIME-type sniffing prevention and strict referrer policies protect against content-based attacks.",
            },
            {
              title: "Minimal Permissions",
              description:
                "Browser APIs (camera, microphone, geolocation) are explicitly disabled — the application never requests unnecessary access.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Webhook & API Security */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">API Security</h2>
        <p className="text-muted-foreground mb-6">
          All API endpoints require authentication. External integrations use
          signature verification and token-based authentication.
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">Endpoint Protection</h4>
              <p className="text-muted-foreground">
                Every governance API endpoint requires an authenticated session with
                verified organization membership. Unauthenticated requests are rejected.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Webhook Verification</h4>
              <p className="text-muted-foreground">
                Payment and integration webhooks use cryptographic signature
                verification. Unverified webhooks are discarded before processing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Standards */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Security Standards
        </h2>
        <p className="text-muted-foreground mb-6">
          AI SENTINEL&apos;s security controls are designed to address the OWASP Top 10
          web application security risks.
        </p>
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          {[
            { category: "Access Control", status: "Mitigated", description: "Multi-tenant isolation, RBAC, cross-entity verification" },
            { category: "Injection", status: "Mitigated", description: "Parameterized queries, strict input validation, no raw SQL" },
            { category: "Authentication", status: "Mitigated", description: "Industry-standard OAuth, secure sessions, CSRF protection" },
            { category: "Data Integrity", status: "Mitigated", description: "Webhook signature verification, schema validation" },
            { category: "Security Configuration", status: "Mitigated", description: "Security headers, environment-guarded configurations" },
            { category: "Logging & Monitoring", status: "Active", description: "Comprehensive audit trail for all governance operations" },
          ].map((item) => (
            <div key={item.category} className="flex items-start gap-3 text-sm">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                  item.status === "Mitigated"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {item.status}
              </span>
              <div>
                <span className="font-medium">{item.category}</span>
                <span className="text-muted-foreground"> — {item.description}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Security Contact
        </h2>
        <p className="text-muted-foreground">
          If you discover a security vulnerability or have questions about our security
          practices, please contact us at{" "}
          <a
            href="mailto:security@todo.law"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            security@todo.law
          </a>
          . We take all reports seriously and will respond promptly.
        </p>
      </section>
    </div>
  );
}
