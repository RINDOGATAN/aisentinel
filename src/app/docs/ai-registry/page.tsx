// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

export const metadata = {
  title: "AI Registry — AI SENTINEL Docs",
  description: "Register and manage all AI systems, models, and agents with lifecycle tracking.",
};

export default function AIRegistryDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          AI Registry
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          The central inventory of all AI systems within your organization. Every other module —
          risk classification, assessments, oversight, incidents — references back to an AI system
          record. Build a complete picture of your AI landscape.
        </p>
      </section>

      {/* System Status Lifecycle */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">System Lifecycle</h2>
        <p className="text-muted-foreground mb-6">
          Every AI system progresses through a defined lifecycle. Status transitions are tracked
          with timestamps for audit purposes.
        </p>
        <div className="flex flex-wrap gap-3">
          {["Draft", "Development", "Testing", "Deployed", "Retired"].map((status, i) => (
            <div key={status} className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {status}
              </span>
              {i < 4 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* AI System Fields */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">AI System Record</h2>
        <p className="text-muted-foreground mb-6">
          Each AI system record captures the information needed for governance and regulatory
          compliance.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              title: "Identity",
              items: ["System name and description", "Purpose and use case", "AI technique (ML, deep learning, NLP, etc.)"],
            },
            {
              title: "Ownership",
              items: ["Business owner", "Technical owner", "EU AI Act role (Provider, Deployer, Importer, etc.)"],
            },
            {
              title: "Data",
              items: ["Processes personal data flag", "Data sources (training, fine-tuning, input)", "DPO Central cross-references"],
            },
            {
              title: "Lifecycle",
              items: ["Status (Draft → Deployed → Retired)", "Deployment and retirement dates", "Version history"],
            },
          ].map((group) => (
            <div key={group.title} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-3">{group.title}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-primary mt-1">›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* AI Models */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">AI Models</h2>
        <p className="text-muted-foreground mb-6">
          Each AI system can have one or more linked model cards. Model cards document the
          provider, type, training data, known limitations, and performance metrics.
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">Model Identity</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>Name and version</li>
                <li>Provider (OpenAI, Anthropic, etc.)</li>
                <li>Model type (LLM, classifier, etc.)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Training Data</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>Training data summary</li>
                <li>Fine-tuning datasets</li>
                <li>Validation methodology</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Performance</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>Known limitations</li>
                <li>Performance metrics</li>
                <li>Bias evaluation results</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* EU AI Act Roles */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">EU AI Act Roles</h2>
        <p className="text-muted-foreground mb-6">
          The EU AI Act assigns different obligations based on your role in the AI value chain
          (Art. 3). Assign the correct role to each system to determine applicable requirements.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { role: "Provider", description: "Develops or places an AI system on the market" },
            { role: "Deployer", description: "Uses an AI system under its authority" },
            { role: "Importer", description: "Places a third-country AI system on the EU market" },
            { role: "Distributor", description: "Makes an AI system available in the supply chain" },
            { role: "User", description: "Uses an AI system in a professional capacity" },
          ].map((item) => (
            <div key={item.role} className="rounded-xl border border-border bg-card p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-primary">
                {item.role}
              </span>
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to Register */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          How to Register an AI System
        </h2>
        <div className="space-y-4">
          {[
            { step: "1", title: "Navigate to AI Registry", description: "Go to AI Systems → AI Registry from the top navigation." },
            { step: "2", title: "Click Register AI System", description: "Use the button in the top-right corner to open the registration form." },
            { step: "3", title: "Fill in system details", description: "Enter the system name, description, purpose, AI technique, and EU AI Act role. Set the status to Draft." },
            { step: "4", title: "Add models and data sources", description: "From the system detail page, add model cards and document data sources used for training and input." },
            { step: "5", title: "Link related records", description: "Optionally link to DPO Central assets, assign risk classification, and associate assessments." },
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
