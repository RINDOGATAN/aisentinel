// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

export const metadata = {
  title: "Human Oversight — AI SENTINEL Docs",
  description:
    "Approval gates, review scheduling, and decision logging for EU AI Act Art. 14 compliance.",
};

export default function OversightDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          Human Oversight
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Implement Art. 14 human oversight requirements for high-risk AI systems. Configure
          approval gates at key lifecycle stages, schedule periodic reviews, and maintain a complete
          decision log for regulators.
        </p>
      </section>

      {/* Gate Types */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Oversight Gate Types</h2>
        <p className="text-muted-foreground mb-6">
          Oversight gates are checkpoints that require human review and approval before an AI
          system can proceed. Each gate is linked to a specific AI system and assigned to a
          reviewer.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              type: "Pre-deployment",
              description: "Required before an AI system moves from Testing to Deployed status. Ensures all compliance requirements are met.",
            },
            {
              type: "Post-deployment",
              description: "Triggered after deployment to verify the system performs as expected in production. Monitors for unexpected behavior.",
            },
            {
              type: "Periodic Review",
              description: "Scheduled at regular intervals (e.g., quarterly). Reviews ongoing performance, drift, and continued compliance.",
            },
            {
              type: "Incident-triggered",
              description: "Automatically requested when an AI incident is reported against the system. Requires review before continued operation.",
            },
            {
              type: "Material Change",
              description: "Required when significant changes are made to the AI system (new model, different data sources, expanded scope).",
            },
          ].map((gate) => (
            <div key={gate.type} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-2 text-primary">{gate.type}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {gate.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Decision Logging */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Decision Logging</h2>
        <p className="text-muted-foreground mb-6">
          Every oversight decision is logged with the reviewer, timestamp, decision outcome, and
          rationale. This forms the Art. 14 audit trail required for high-risk AI systems.
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="inline-block px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium mb-2">
                Approve
              </span>
              <p className="text-muted-foreground">
                System is cleared to proceed. The reviewer confirms all requirements are satisfied.
              </p>
            </div>
            <div>
              <span className="inline-block px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium mb-2">
                Reject
              </span>
              <p className="text-muted-foreground">
                System is not cleared. The reviewer documents the reasons and required
                remediation steps.
              </p>
            </div>
            <div>
              <span className="inline-block px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium mb-2">
                Defer
              </span>
              <p className="text-muted-foreground">
                Decision is postponed pending additional information. A follow-up date is set.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Set Up */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Setting Up an Oversight Gate
        </h2>
        <div className="space-y-4">
          {[
            { step: "1", role: "AI Officer", title: "Navigate to Oversight", description: "Go to Governance → Oversight from the top navigation." },
            { step: "2", role: "AI Officer", title: "Create a new gate", description: "Click New Oversight Gate. Select the AI system and gate type (pre-deployment, periodic, etc.)." },
            { step: "3", role: "AI Officer", title: "Assign a reviewer", description: "Select the team member responsible for the review. They will be notified when the gate is triggered." },
            { step: "4", role: "AI Officer", title: "Set the schedule", description: "For periodic reviews, configure the review cadence (e.g., quarterly, annually)." },
            { step: "5", role: "Reviewer", title: "Conduct the review", description: "When the gate is triggered, review the system documentation, evidence, and current status. Log your decision with a rationale." },
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
