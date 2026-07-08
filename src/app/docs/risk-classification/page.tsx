// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

export const metadata = {
  title: "Risk Classification — AI SENTINEL Docs",
  description: "EU AI Act four-tier risk classification with guided Annex III wizard.",
};

export default function RiskClassificationDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          Risk Classification
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Classify your AI systems using the EU AI Act four-tier risk framework. The guided wizard
          walks you through Annex III categories to determine the correct risk level, with full
          classification history for audit purposes.
        </p>
      </section>

      {/* Risk Tiers */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Risk Tiers</h2>
        <p className="text-muted-foreground mb-6">
          The EU AI Act defines four risk levels. Each level carries different compliance
          obligations, from outright prohibition to minimal transparency requirements.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              level: "Unacceptable",
              color: "bg-red-500/10 text-red-400 border-red-500/20",
              description:
                "AI systems that pose an unacceptable risk to safety or fundamental rights. These are prohibited under Art. 5.",
              examples: "Social scoring, real-time biometric identification in public spaces, manipulation techniques.",
            },
            {
              level: "High",
              color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
              description:
                "AI systems listed in Annex III or used as safety components. Subject to full compliance requirements (Art. 6-51).",
              examples: "Biometric identification, critical infrastructure, employment decisions, law enforcement.",
            },
            {
              level: "Limited",
              color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
              description:
                "AI systems with specific transparency obligations. Users must be informed they are interacting with AI (Art. 50).",
              examples: "Chatbots, deepfake generators, emotion recognition systems.",
            },
            {
              level: "Minimal",
              color: "bg-green-500/10 text-green-400 border-green-500/20",
              description:
                "AI systems posing minimal risk. No mandatory compliance requirements, though voluntary codes of conduct are encouraged.",
              examples: "Spam filters, AI-enabled video games, inventory management systems.",
            },
          ].map((tier) => (
            <div
              key={tier.level}
              className={`rounded-xl border p-5 ${tier.color}`}
            >
              <h3 className="text-lg font-semibold mb-2">{tier.level}</h3>
              <p className="text-sm opacity-90 leading-relaxed mb-3">{tier.description}</p>
              <p className="text-xs opacity-70">
                <span className="font-medium">Examples:</span> {tier.examples}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Annex III Categories */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Annex III Categories</h2>
        <p className="text-muted-foreground mb-6">
          The classification wizard guides you through the Annex III high-risk categories. If your
          AI system falls into any of these areas, it is likely classified as High Risk.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            "Biometrics",
            "Critical infrastructure",
            "Education & vocational training",
            "Employment & worker management",
            "Access to essential services",
            "Law enforcement",
            "Migration, asylum & border control",
            "Administration of justice",
          ].map((category) => (
            <div
              key={category}
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              {category}
            </div>
          ))}
        </div>
      </section>

      {/* Classification History */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Classification History</h2>
        <p className="text-muted-foreground mb-6">
          Every classification change is versioned with a timestamp, the author, the previous and
          new risk levels, and a rationale. This provides a complete audit trail for regulators.
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-4 text-sm">
            {[
              { date: "2026-02-15", author: "Maria G.", from: "—", to: "Limited", note: "Initial classification based on chatbot use case." },
              { date: "2026-02-20", author: "Jan K.", from: "Limited", to: "High", note: "Re-classified after scope change to include employment screening." },
            ].map((entry, i) => (
              <div key={i} className="flex gap-4 items-start">
                <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                  {entry.date}
                </span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-muted-foreground">{entry.author}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{entry.from}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-primary">{entry.to}</span>
                  </div>
                  <p className="text-muted-foreground">{entry.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Classify */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          How to Classify an AI System
        </h2>
        <div className="space-y-4">
          {[
            { step: "1", title: "Open the AI system", description: "Navigate to the AI Registry and select the system you want to classify." },
            { step: "2", title: "Start the classification wizard", description: "Go to AI Systems → Risk Classification and click Classify to launch the guided wizard." },
            { step: "3", title: "Answer the Annex III questions", description: "The wizard asks whether your system falls into any high-risk category. Answer honestly — the result determines compliance obligations." },
            { step: "4", title: "Review the suggested risk level", description: "Based on your answers, the system suggests a risk tier. You can accept or override with justification." },
            { step: "5", title: "Document the rationale", description: "Add a rationale explaining the classification decision. This is stored in the classification history for audit purposes." },
          ].map((item) => (
            <div key={item.step} className="rounded-xl border border-border bg-card p-5 flex gap-4">
              <div className="text-2xl font-display text-primary/40 shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mr-2">
                    AI Officer
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
