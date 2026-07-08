// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

export const metadata = {
  title: "Conformity Assessment — AI SENTINEL Docs",
  description:
    "EU AI Act Art. 43 conformity assessment template for high-risk AI systems. Structured evaluation of technical documentation, quality management, and post-market monitoring.",
};

export default function ConformityAssessmentDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <div className="inline-block px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-4">
          Premium
        </div>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          Conformity Assessment
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          High-risk AI systems under the EU AI Act must undergo a conformity assessment before
          being placed on the market. AI SENTINEL provides a structured template that walks
          your team through every requirement — from technical documentation to post-market
          monitoring — so nothing falls through the cracks.
        </p>
      </section>

      {/* What is a Conformity Assessment */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          What is a Conformity Assessment?
        </h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            A conformity assessment is a formal evaluation process required by Art. 43 of the
            EU AI Act for high-risk AI systems. It verifies that the AI system meets all
            applicable requirements before deployment — covering data governance, transparency,
            human oversight, accuracy, robustness, and cybersecurity.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Depending on the use case, conformity assessments may be conducted internally by the
            provider or through a third-party notified body. In either case, the assessment must
            follow a structured methodology and produce documented evidence of compliance.
          </p>
        </div>
      </section>

      {/* Who needs it */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Who needs it?</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              title: "AI Providers",
              description:
                "Organizations that develop or place high-risk AI systems on the EU market must complete a conformity assessment before deployment (Art. 16).",
            },
            {
              title: "AI Deployers",
              description:
                "Organizations deploying high-risk AI systems must verify that the provider has completed the conformity assessment and that the CE marking is in place (Art. 26).",
            },
            {
              title: "Annex III systems",
              description:
                "AI systems used in biometrics, critical infrastructure, education, employment, essential services, law enforcement, migration, or administration of justice (Art. 6(2)).",
            },
            {
              title: "Internal compliance teams",
              description:
                "Even when a notified body is involved, internal teams need a structured process to prepare documentation, gather evidence, and track remediation of gaps.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What the template covers */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          What the template covers
        </h2>
        <div className="space-y-4">
          {[
            {
              area: "Risk Management System",
              description:
                "Verification that a risk management system is established and maintained throughout the AI system lifecycle (Art. 9).",
            },
            {
              area: "Data Governance",
              description:
                "Assessment of training, validation, and testing data — including relevance, representativeness, and bias examination (Art. 10).",
            },
            {
              area: "Technical Documentation",
              description:
                "Review of technical documentation completeness: system description, design specifications, development process, and performance metrics (Art. 11, Annex IV).",
            },
            {
              area: "Record-keeping & Logging",
              description:
                "Evaluation of automatic logging capabilities for traceability, including input/output records and system events (Art. 12).",
            },
            {
              area: "Transparency",
              description:
                "Assessment of instructions for use, disclosure of AI nature, and interpretability measures for deployers and affected persons (Art. 13).",
            },
            {
              area: "Human Oversight",
              description:
                "Verification that appropriate human oversight measures are designed into the system and documented (Art. 14).",
            },
            {
              area: "Accuracy, Robustness & Cybersecurity",
              description:
                "Testing and validation of accuracy levels, resilience to errors and adversarial attacks, and cybersecurity measures (Art. 15).",
            },
            {
              area: "Quality Management System",
              description:
                "Review of the provider's quality management system covering development processes, testing, and post-market obligations (Art. 17).",
            },
            {
              area: "Post-market Monitoring",
              description:
                "Verification that a post-market monitoring plan is in place to detect and address issues after deployment (Art. 72).",
            },
          ].map((item) => (
            <div
              key={item.area}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-semibold mb-1">{item.area}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works in AI SENTINEL */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">How it works</h2>
        <div className="space-y-4">
          {[
            {
              step: "1",
              title: "Create a new assessment",
              description:
                "Select the Conformity Assessment template and link it to a registered AI system. The template pre-populates all required evaluation areas.",
            },
            {
              step: "2",
              title: "Work through each section",
              description:
                "Each section presents structured questions aligned to the EU AI Act requirements. Record findings, attach evidence, and note any gaps.",
            },
            {
              step: "3",
              title: "Submit for review",
              description:
                "Once complete, submit the assessment for review by the AI Officer or governance lead. The approval workflow tracks sign-off and any requested changes.",
            },
            {
              step: "4",
              title: "Document and maintain",
              description:
                "The completed assessment becomes part of your compliance record. Link it to the AI system's compliance mapping and revisit it when material changes occur.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-border bg-card p-5 flex gap-4"
            >
              <div className="text-2xl font-display text-primary/40 shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
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
