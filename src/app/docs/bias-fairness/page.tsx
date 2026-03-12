export const metadata = {
  title: "Bias & Fairness Assessment — AI SENTINEL Docs",
  description:
    "Structured bias and fairness evaluation for AI systems. Detect discrimination risks, assess protected attributes, and document mitigation measures.",
};

export default function BiasFairnessDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <div className="inline-block px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-4">
          Premium
        </div>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          Bias &amp; Fairness Assessment
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          AI systems can produce discriminatory outcomes — often unintentionally. The Bias &amp;
          Fairness Assessment provides a structured methodology to evaluate your AI systems for
          bias risks, document affected protected attributes, and track mitigation measures.
        </p>
      </section>

      {/* What is a Bias & Fairness Assessment */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          What is a Bias &amp; Fairness Assessment?
        </h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            A bias and fairness assessment is a systematic evaluation of an AI system&apos;s
            potential to produce outcomes that unfairly disadvantage individuals or groups based
            on protected characteristics — such as race, gender, age, disability, ethnicity, or
            socioeconomic status.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Under the EU AI Act, providers of high-risk AI systems must examine training data for
            possible biases (Art. 10) and implement measures to prevent discriminatory outcomes.
            The EU Charter of Fundamental Rights (Art. 21) explicitly prohibits discrimination,
            and AI systems that score, rank, or make decisions about people are particularly
            exposed to this risk.
          </p>
        </div>
      </section>

      {/* Why it matters */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Why it matters</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              title: "Legal obligation",
              description:
                "The EU AI Act requires bias examination of training data (Art. 10(2)(f)) and non-discrimination safeguards for high-risk systems. Failure to comply carries fines up to 3% of global turnover.",
            },
            {
              title: "Fundamental rights",
              description:
                "AI-driven discrimination can violate the right to non-discrimination (EU Charter Art. 21), equal treatment directives, and national equality legislation.",
            },
            {
              title: "Real-world impact",
              description:
                "Biased AI in hiring, credit scoring, healthcare triage, or law enforcement has documented consequences — rejected applicants, denied loans, missed diagnoses, and wrongful arrests.",
            },
            {
              title: "Reputational risk",
              description:
                "Public disclosure of biased AI outcomes causes lasting reputational damage. Proactive assessment demonstrates responsible AI governance to regulators, customers, and the public.",
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

      {/* Types of bias */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Types of AI bias</h2>
        <div className="space-y-4">
          {[
            {
              type: "Training data bias",
              description:
                "Historical data reflects past discrimination. A hiring model trained on historical decisions inherits biases in who was previously hired or promoted.",
            },
            {
              type: "Selection bias",
              description:
                "The training dataset does not represent the population the system will serve. Underrepresented groups receive less accurate predictions.",
            },
            {
              type: "Measurement bias",
              description:
                "The features or labels used as proxies are themselves biased. Using zip codes as a feature can encode racial segregation patterns.",
            },
            {
              type: "Aggregation bias",
              description:
                "A single model is applied to groups with different underlying distributions. Medical AI trained primarily on one demographic may underperform for others.",
            },
            {
              type: "Deployment bias",
              description:
                "The system is used in a context different from the one it was designed for, or its outputs are interpreted in a biased manner by human operators.",
            },
          ].map((item) => (
            <div
              key={item.type}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-semibold mb-1">{item.type}</h3>
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
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              area: "Protected attributes",
              description:
                "Identification of which protected characteristics (age, gender, race, disability, etc.) are relevant to the AI system's domain and affected population.",
            },
            {
              area: "Data representativeness",
              description:
                "Evaluation of whether training and testing data adequately represents all relevant groups, including historically underrepresented populations.",
            },
            {
              area: "Fairness metrics",
              description:
                "Selection and application of appropriate fairness metrics: demographic parity, equalized odds, predictive parity, or individual fairness measures.",
            },
            {
              area: "Proxy detection",
              description:
                "Analysis of whether ostensibly neutral features (location, language, education) serve as proxies for protected attributes.",
            },
            {
              area: "Mitigation measures",
              description:
                "Documentation of pre-processing, in-processing, or post-processing techniques used to reduce identified bias.",
            },
            {
              area: "Monitoring plan",
              description:
                "Ongoing monitoring strategy to detect bias drift after deployment, including thresholds and escalation procedures.",
            },
          ].map((item) => (
            <div
              key={item.area}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-semibold mb-2">{item.area}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">How it works</h2>
        <div className="space-y-4">
          {[
            {
              step: "1",
              title: "Create a new assessment",
              description:
                "Select the Bias & Fairness template and link it to a registered AI system. The template structures the evaluation around the system's specific use case and affected population.",
            },
            {
              step: "2",
              title: "Evaluate each dimension",
              description:
                "Work through the structured sections: identify relevant protected attributes, assess data representativeness, apply fairness metrics, and check for proxy variables.",
            },
            {
              step: "3",
              title: "Document findings and mitigations",
              description:
                "Record identified bias risks with severity ratings. For each risk, document the mitigation approach — whether technical (algorithmic debiasing) or procedural (human review).",
            },
            {
              step: "4",
              title: "Review and monitor",
              description:
                "Submit for approval, then establish ongoing monitoring. The assessment links to your AI system's record so bias findings inform risk classification and oversight decisions.",
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
