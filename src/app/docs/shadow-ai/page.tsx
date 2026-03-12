export const metadata = {
  title: "Shadow AI Discovery — AI SENTINEL Docs",
  description:
    "Discover unauthorized AI tools in your organization. Self-reporting portal, triage workflow, and promotion to formal governance.",
};

export default function ShadowAIDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <div className="inline-block px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-4">
          Premium
        </div>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          Shadow AI Discovery
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Shadow AI refers to AI tools adopted by employees without the knowledge or approval
          of the organization. Research suggests that around 60% of employees use unapproved
          AI tools at work — from ChatGPT and Copilot to image generators and AI-powered
          analytics. Organizations cannot govern AI systems they do not know about.
        </p>
      </section>

      {/* What is Shadow AI */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">What is Shadow AI?</h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Shadow AI is the AI equivalent of Shadow IT — the use of AI-powered tools, services,
            and applications by employees without explicit organizational authorization. Unlike
            formally procured vendors that go through risk assessment and contract review, shadow
            AI tools enter the organization through individual adoption: an engineer installs a
            code assistant, a lawyer uses ChatGPT for contract review, a marketing team signs up
            for an AI copywriting tool.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Under the EU AI Act, organizations that deploy AI systems have specific obligations
            as deployers — regardless of whether the deployment was sanctioned or not. Shadow AI
            creates blind spots in compliance, data protection, and risk management programs.
          </p>
        </div>
      </section>

      {/* Why it matters */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Why it matters</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              title: "Compliance risk",
              description:
                "Unregistered AI systems may fall under high-risk categories without appropriate conformity assessments, human oversight, or risk documentation.",
            },
            {
              title: "Data protection",
              description:
                "Employees may input personal data, trade secrets, or client information into AI tools that train on user inputs or store data in non-compliant jurisdictions.",
            },
            {
              title: "Regulatory exposure",
              description:
                "Under the EU AI Act, deployers are responsible for AI systems used within their organization — even those adopted informally by staff.",
            },
            {
              title: "Governance gap",
              description:
                "You cannot classify risk, run assessments, or set oversight gates for AI systems you do not know exist. Shadow AI is the missing first step.",
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

      {/* Shadow AI vs Vendor Risk */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Shadow AI vs Vendor Risk
        </h2>
        <p className="text-muted-foreground mb-6">
          Shadow AI Discovery and Vendor Risk Management solve fundamentally different problems
          in opposite directions. They are complementary, not overlapping.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-3 text-primary">Vendor Risk</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Organization procures a vendor through formal channels</li>
              <li>Known from day one — the org chose the vendor</li>
              <li>Core question: &ldquo;Is this vendor we selected risky?&rdquo;</li>
              <li>Lifecycle: Procurement → Assessment → Monitoring</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-3 text-primary">Shadow AI</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Employees adopt AI tools on their own, outside procurement</li>
              <li>Unknown until reported or discovered</li>
              <li>Core question: &ldquo;What AI tools are people actually using?&rdquo;</li>
              <li>Lifecycle: Discovery → Triage → Approve or Prohibit</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">How it works</h2>
        <div className="space-y-4">
          {[
            {
              step: "1",
              title: "Employees self-report",
              description:
                "Staff search a pre-loaded catalog of 36 known AI tools across 8 categories (LLM Chat, Code Assistants, Image Generation, Video/Audio, Writing, Business Tools, Data Analytics, Search) or enter a custom tool. They specify their department, usage description, and how they use the tool.",
            },
            {
              step: "2",
              title: "Triage and review",
              description:
                "Reported tools enter the review queue with status DISCOVERED. The AI Officer or governance team reviews each tool, assessing risk indicators: Does it process personal data? Does it train on input? Is it cloud-hosted? SOC2 certified? GDPR compliant?",
            },
            {
              step: "3",
              title: "Approve or prohibit",
              description:
                "Each tool is either APPROVED for continued use (with conditions) or PROHIBITED and flagged for removal. Prohibited tools trigger a clear organizational signal that the tool is not sanctioned.",
            },
            {
              step: "4",
              title: "Promote to formal governance",
              description:
                "Approved shadow tools can be promoted into the AI Registry as a formal AI System — and optionally into a Vendor record — in a single step. This bridges informal discovery into your full governance program.",
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

      {/* Status Workflow */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Status Workflow</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { status: "Discovered", description: "Reported by employee" },
            { status: "Under Review", description: "Being assessed by governance team" },
            { status: "Approved", description: "Sanctioned for use" },
            { status: "Prohibited", description: "Banned — must be removed" },
            { status: "Registered", description: "Promoted to AI Registry" },
          ].map((stage, i) => (
            <div key={stage.status} className="flex items-center gap-2">
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <span className="font-semibold text-sm">{stage.status}</span>
                <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
              </div>
              {i < 4 && (
                <span className="text-muted-foreground hidden sm:inline">→</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
