export const metadata = {
  title: "Assessments — AI SENTINEL Docs",
  description:
    "Run FRIA, conformity, AI risk, and bias/fairness assessments with templates and approval workflows.",
};

export default function AssessmentsDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          Assessments
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Conduct AI-specific impact assessments using configurable templates. Score risks, document
          mitigations, and manage approval workflows for FRIA, conformity, AI risk, and
          bias/fairness assessments.
        </p>
      </section>

      {/* Assessment Templates */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Assessment Templates</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              type: "FRIA",
              label: "Fundamental Rights Impact Assessment",
              description: "Required under Art. 27 for high-risk AI deployed by public bodies or certain private entities.",
              premium: false,
            },
            {
              type: "AI_RISK",
              label: "AI Risk Assessment",
              description: "General-purpose risk assessment for any AI system. Evaluates operational, ethical, and compliance risks.",
              premium: false,
            },
            {
              type: "CUSTOM",
              label: "Custom Assessment",
              description: "Create your own assessment template with custom questions and scoring criteria.",
              premium: false,
            },
            {
              type: "CONFORMITY",
              label: "Conformity Assessment",
              description: "Art. 43, Annex VI/VII conformity assessment for high-risk AI systems. Required before market placement.",
              premium: true,
            },
            {
              type: "BIAS_FAIRNESS",
              label: "Bias & Fairness Assessment",
              description: "Structured evaluation of bias, fairness metrics, and discrimination risk across protected categories.",
              premium: true,
            },
          ].map((template) => (
            <div
              key={template.type}
              className="rounded-xl border border-border bg-card p-5 relative"
            >
              {template.premium && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  Premium
                </div>
              )}
              <span className="inline-block px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                {template.type}
              </span>
              <h3 className="font-semibold mb-2">{template.label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {template.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Approval Workflow */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Approval Workflow</h2>
        <p className="text-muted-foreground mb-6">
          Every assessment follows a structured approval workflow. Status transitions are logged
          with timestamps and the acting user for full auditability.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            { status: "Draft", description: "Author creates assessment" },
            { status: "In Progress", description: "Completing questions and scoring" },
            { status: "Under Review", description: "Submitted for approval" },
            { status: "Approved", description: "Assessment signed off" },
          ].map((stage, i) => (
            <div key={stage.status} className="flex items-center gap-2">
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-wider text-primary block mb-1">
                  Stage {i + 1}
                </span>
                <span className="font-semibold text-sm">{stage.status}</span>
                <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
              </div>
              {i < 3 && (
                <span className="text-muted-foreground hidden sm:inline">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Risk Scoring */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Risk Scoring</h2>
        <p className="text-muted-foreground mb-6">
          Assessments generate risk scores based on question responses. Scores can be manually
          overridden with justification. The overall risk level determines review requirements and
          mitigation priorities.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            { level: "Low", color: "bg-green-500/10 text-green-400 border-green-500/20" },
            { level: "Medium", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
            { level: "High", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
            { level: "Critical", color: "bg-red-500/10 text-red-400 border-red-500/20" },
          ].map((risk) => (
            <span
              key={risk.level}
              className={`px-4 py-2 rounded-full text-sm font-medium border ${risk.color}`}
            >
              {risk.level}
            </span>
          ))}
        </div>
      </section>

      {/* How to Create */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Creating an Assessment
        </h2>
        <div className="space-y-4">
          {[
            { step: "1", role: "AI Officer", title: "Select template", description: "Choose from FRIA, AI Risk, Conformity, Bias/Fairness, or Custom templates." },
            { step: "2", role: "AI Officer", title: "Set scope and link AI system", description: "Define the assessment scope and link it to the AI system being assessed." },
            { step: "3", role: "AI Officer", title: "Complete questions", description: "Answer template questions. The system calculates risk scores as you go." },
            { step: "4", role: "AI Officer", title: "Document mitigations", description: "Record mitigation measures, assign owners, and set implementation deadlines." },
            { step: "5", role: "AI Officer", title: "Submit for review", description: "Submit the assessment for approval. Reviewers can approve, reject, or request changes." },
            { step: "6", role: "Approver", title: "Final approval", description: "Approved assessments are locked and stored as compliance records." },
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
