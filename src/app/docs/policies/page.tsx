// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

export const metadata = {
  title: "Policy Management — AI SENTINEL Docs",
  description:
    "AI governance policies with versioning, approval workflow, and system linking.",
};

export default function PoliciesDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          Policy Management
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Author, version, and manage AI governance policies. Link policies to specific AI systems,
          track approval workflows, and maintain a living policy library that evolves with your
          organization.
        </p>
      </section>

      {/* Policy Types */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Policy Types</h2>
        <p className="text-muted-foreground mb-6">
          AI SENTINEL supports a range of policy types covering the full scope of AI governance.
          Each type addresses a specific governance domain.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { type: "AI Usage", description: "Rules for how AI systems may be used within the organization" },
            { type: "AI Governance", description: "Overarching governance structure, roles, and responsibilities" },
            { type: "AI Ethics", description: "Ethical principles and guidelines for AI development and deployment" },
            { type: "AI Risk Management", description: "Risk identification, assessment, and mitigation procedures" },
            { type: "AI Data Governance", description: "Data quality, provenance, and handling requirements for AI" },
            { type: "AI Procurement", description: "Standards for evaluating and acquiring AI systems and services" },
            { type: "AI Incident Response", description: "Procedures for responding to AI-related incidents" },
            { type: "AI Transparency", description: "Disclosure and explainability requirements for AI decisions" },
            { type: "Custom", description: "User-defined policy type for organization-specific needs" },
          ].map((policy) => (
            <div key={policy.type} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-sm mb-1">{policy.type}</h3>
              <p className="text-xs text-muted-foreground">{policy.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Approval Workflow */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Approval Workflow</h2>
        <p className="text-muted-foreground mb-6">
          Policies follow a structured lifecycle from drafting through publication. Each stage
          transition is logged for audit purposes.
        </p>
        <div className="flex flex-wrap gap-3">
          {["Draft", "Under Review", "Approved", "Published", "Archived"].map(
            (status, i) => (
              <div key={status} className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {status}
                </span>
                {i < 4 && <span className="text-muted-foreground">→</span>}
              </div>
            )
          )}
        </div>
      </section>

      {/* Version History */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Version History</h2>
        <p className="text-muted-foreground mb-6">
          Every content change to a policy creates a new version. The system automatically tracks
          the version number, change notes, author, and timestamp. Previous versions remain
          accessible for comparison.
        </p>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-sm">
          {[
            { version: "v3.0", date: "2026-02-20", author: "Maria G.", note: "Updated transparency requirements for generative AI systems" },
            { version: "v2.0", date: "2026-01-15", author: "Jan K.", note: "Added procurement guidelines for third-party AI vendors" },
            { version: "v1.0", date: "2025-12-01", author: "Maria G.", note: "Initial policy draft covering AI usage rules" },
          ].map((entry) => (
            <div key={entry.version} className="flex items-start gap-4">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium font-mono shrink-0">
                {entry.version}
              </span>
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-0.5">
                  <span>{entry.date}</span>
                  <span>·</span>
                  <span>{entry.author}</span>
                </div>
                <p className="text-muted-foreground">{entry.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* System Linking */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">System Linking</h2>
        <p className="text-muted-foreground mb-6">
          Policies can be linked to specific AI systems in the registry. This creates traceability
          between governance policies and the systems they apply to, making it easy to see which
          policies govern a particular AI system.
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">From the policy</h4>
              <p className="text-muted-foreground">
                View and manage which AI systems are covered by the policy. Add or remove system
                links from the policy detail page.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">From the AI system</h4>
              <p className="text-muted-foreground">
                View all policies that apply to a specific AI system. This helps AI officers
                understand the full governance context.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Create */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Creating a Policy
        </h2>
        <div className="space-y-4">
          {[
            { step: "1", role: "AI Officer", title: "Navigate to Policies", description: "Go to Governance → Policies from the top navigation." },
            { step: "2", role: "AI Officer", title: "Click New Policy", description: "Choose the policy type and enter a title and description." },
            { step: "3", role: "AI Officer", title: "Author the content", description: "Write the policy content. Each save creates a new version automatically." },
            { step: "4", role: "AI Officer", title: "Link AI systems", description: "Associate the policy with the AI systems it applies to." },
            { step: "5", role: "AI Officer", title: "Submit for review", description: "Change the status to Under Review. Approvers will review and either approve or request changes." },
            { step: "6", role: "Approver", title: "Publish", description: "Once approved, publish the policy to make it visible organization-wide. Set an effective date and review schedule." },
          ].map((item) => (
            <div key={item.step} className="rounded-xl border border-border bg-card p-5 flex gap-4">
              <div className="text-2xl font-display text-primary/40 shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mr-2">
                    {item.role}
                  </span>
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
