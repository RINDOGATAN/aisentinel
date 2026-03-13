export const metadata = {
  title: "Compliance — AI SENTINEL Docs",
  description:
    "Framework mapping for EU AI Act, NIST AI RMF, and ISO 42001 with evidence management and export.",
};

export default function ComplianceDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          Compliance
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Map your AI systems against leading regulatory frameworks. Track compliance status at the
          requirement level, attach evidence, and export compliance packages for regulators and
          auditors.
        </p>
      </section>

      {/* Frameworks */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Supported Frameworks</h2>
        <p className="text-muted-foreground mb-6">
          AI SENTINEL ships with three pre-loaded frameworks. Each framework is broken down into
          articles, clauses, or functions with individual compliance tracking.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              name: "EU AI Act",
              description: "Full article mapping covering Art. 5-62 and relevant annexes. The primary regulatory framework for AI systems in the European Union.",
              items: "Articles, Annexes, Recitals",
            },
            {
              name: "NIST AI RMF",
              description: "The US National Institute of Standards and Technology AI Risk Management Framework. Four core functions with sub-categories.",
              items: "GOVERN, MAP, MEASURE, MANAGE",
            },
            {
              name: "ISO 42001",
              description: "International standard for AI Management Systems. Covers organizational context, leadership, planning, support, and operations.",
              items: "Clauses 4-10, Annex A Controls",
            },
          ].map((fw) => (
            <div key={fw.name} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-lg font-semibold mb-2 text-primary">{fw.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {fw.description}
              </p>
              <span className="text-xs text-muted-foreground">{fw.items}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance Statuses */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Compliance Statuses</h2>
        <p className="text-muted-foreground mb-6">
          Each requirement can be independently assessed for every AI system. The status reflects
          the current compliance posture for that specific requirement.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            { status: "Compliant", color: "bg-green-500/10 text-green-400 border-green-500/20" },
            { status: "Partially Compliant", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
            { status: "Non-Compliant", color: "bg-red-500/10 text-red-400 border-red-500/20" },
            { status: "Not Applicable", color: "bg-muted text-muted-foreground border-border" },
            { status: "Not Assessed", color: "bg-muted text-muted-foreground border-border" },
          ].map((item) => (
            <span
              key={item.status}
              className={`px-4 py-2 rounded-full text-sm font-medium border ${item.color}`}
            >
              {item.status}
            </span>
          ))}
        </div>
      </section>

      {/* Compliance Matrix */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Compliance Matrix</h2>
        <p className="text-muted-foreground mb-6">
          The compliance matrix provides a per-AI-system view of all requirements within a chosen
          framework. For each requirement, you can set the compliance status, add notes, and attach
          evidence documents.
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">Per-requirement tracking</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Compliance status (5 levels)</li>
                <li>• Evidence attachments and notes</li>
                <li>• Applicability filtering by risk level</li>
                <li>• Responsible person assignment</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Export capabilities</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• CSV export for spreadsheet analysis</li>
                <li>• PDF export for regulatory submissions</li>
                <li>• Technical documentation packages (Art. 11 / Annex IV)</li>
                <li>• Audit-ready compliance reports</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cross-Framework Mapping */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Cross-Framework Mapping
        </h2>
        <p className="text-muted-foreground mb-6">
          Many requirements across the EU AI Act, NIST AI RMF, and ISO 42001 overlap
          conceptually. AI SENTINEL includes 41 pre-built cross-framework mappings so
          that one compliance effort can satisfy requirements across multiple frameworks
          simultaneously.
        </p>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              When you mark a requirement as <strong className="text-foreground">Compliant</strong> or{" "}
              <strong className="text-foreground">Partially Compliant</strong>, AI SENTINEL shows
              linked requirements from other frameworks and offers to propagate the status
              automatically.
            </p>
            <p>
              For example, marking EU AI Act Art. 9 (Risk Management) as compliant can
              automatically update NIST GOVERN 1 (Risk Management Policies) and ISO 42001
              Clause 6.1 (Actions to Address Risks) — because they cover the same obligation.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
              <p className="text-2xl font-display text-primary">28</p>
              <p className="text-xs text-muted-foreground">Equivalent mappings</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-display">12</p>
              <p className="text-xs text-muted-foreground">Partial mappings</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-display">1</p>
              <p className="text-xs text-muted-foreground">Related mapping</p>
            </div>
          </div>
        </div>
      </section>

      {/* Auto-Generated Compliance Snapshot */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Auto-Generated Compliance Snapshot
        </h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            When you classify an AI system&apos;s risk level (e.g., High Risk under the EU AI Act),
            AI SENTINEL automatically creates compliance mapping records for every applicable
            requirement across all three frameworks. You arrive at the compliance matrix with
            all relevant controls pre-populated — no manual setup needed.
          </p>
          <p className="text-sm text-muted-foreground">
            For a High Risk system, this means 80+ requirements are instantly initialized across
            EU AI Act (Art. 6-62), NIST AI RMF (all 23 practices), and ISO 42001 (all 31 clauses),
            each set to &ldquo;Not Assessed&rdquo; and ready for evaluation.
          </p>
        </div>
      </section>

      {/* How to Map Compliance */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Mapping Compliance
        </h2>
        <div className="space-y-4">
          {[
            { step: "1", role: "AI Officer", title: "Navigate to Compliance", description: "Go to Governance → Compliance from the top navigation." },
            { step: "2", role: "AI Officer", title: "Select framework and AI system", description: "Choose the framework (EU AI Act, NIST AI RMF, or ISO 42001) and the AI system to assess." },
            { step: "3", role: "AI Officer", title: "Assess each requirement", description: "Work through the requirements list. For each, set the compliance status and add notes or evidence." },
            { step: "4", role: "AI Officer", title: "Filter by applicability", description: "Use risk-level filtering to focus on requirements that apply to your system's classification (e.g., high-risk only)." },
            { step: "5", role: "AI Officer", title: "Export documentation", description: "Generate CSV or PDF reports for regulatory submissions, audits, or internal stakeholders." },
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
