// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

export const metadata = {
  title: "Transparency (Art. 50) — AI SENTINEL Docs",
  description:
    "Track EU AI Act Art. 50 transparency obligations per AI system: AI interaction disclosure, synthetic-content marking, emotion recognition, and deepfake labelling.",
};

const obligations = [
  {
    article: "Art. 50(1)",
    actor: "Provider",
    title: "AI interaction disclosure",
    description:
      "Systems that interact directly with people must make clear they are AI, unless that is obvious to a reasonably well-informed person. Chatbots and voice agents are the typical case.",
  },
  {
    article: "Art. 50(2)",
    actor: "Provider",
    title: "Machine-readable marking of synthetic content",
    description:
      "Systems generating synthetic audio, image, video, or text must mark their output in a machine-readable format detectable as artificially generated. This is the obligation with a transitional deadline — see below.",
  },
  {
    article: "Art. 50(3)",
    actor: "Deployer",
    title: "Emotion recognition and biometric categorisation",
    description:
      "Deployers must inform the people exposed to an emotion-recognition or biometric-categorisation system that it is in use. Note that several such uses are prohibited outright under Art. 5 — the module flags that overlap rather than letting you record a disclosure for a practice you cannot lawfully run.",
  },
  {
    article: "Art. 50(4)",
    actor: "Deployer",
    title: "Deepfake and public-interest text labelling",
    description:
      "Deployers publishing deepfakes must disclose that the content is artificially generated or manipulated. The same applies to AI-generated text published to inform the public on matters of public interest.",
  },
];

const statuses = [
  {
    name: "Not applicable",
    description:
      "This obligation does not apply to the system. The default for every obligation until you decide otherwise.",
  },
  {
    name: "Required",
    description:
      "The obligation applies and is not yet satisfied. Systems in this state drive the deadline counters on the executive dashboard.",
  },
  {
    name: "Implemented",
    description:
      "The obligation applies and the disclosure or marking is in place. Record how in the AI statement so the evidence survives staff turnover.",
  },
];

export default function TransparencyDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          Transparency (Art. 50)
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Article 50 of the EU AI Act imposes transparency duties that cut across risk
          tiers: even a minimal-risk chatbot owes a disclosure. AI SENTINEL tracks the
          four Art. 50 obligations per AI system, splits them by who actually owes them,
          and counts down the one deadline that has a transitional period.
        </p>
      </section>

      {/* Applicability */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">When it applies</h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Art. 50 has applied since <strong className="text-foreground">2 August 2026</strong>{" "}
            (Art. 113). Regulation (EU) 2026/1744 — the Digital Omnibus on AI, OJ L of
            24 July 2026 — grants systems placed on the market{" "}
            <em>before</em> that date a transitional period for the machine-readable
            marking duty in Art. 50(2), running to{" "}
            <strong className="text-foreground">2 December 2026</strong>.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            That grace period is the reason the AI Registry asks whether a system was
            placed on the market before 2 August 2026. Answer it accurately: it is the
            only input that moves the marking deadline, and the dashboard&apos;s
            &ldquo;marking overdue&rdquo; counter is derived from it.
          </p>
        </div>
      </section>

      {/* The four obligations */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          The four obligations
        </h2>
        <p className="text-muted-foreground mb-6">
          Two are owed by the provider and two by the deployer. A single organization
          often holds both roles, but recording them separately is what lets you answer
          a regulator asking which hat you were wearing.
        </p>
        <div className="space-y-4">
          {obligations.map((o) => (
            <div key={o.article} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {o.article}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                  {o.actor} obligation
                </span>
                <h3 className="font-semibold">{o.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {o.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Statuses */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Recording status</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {statuses.map((s) => (
            <div key={s.name} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-2 text-primary">{s.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How to use it */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Working through it</h2>
        <ol className="space-y-4">
          {[
            {
              step: "Open the system's Transparency tab",
              body: "Every AI system in the registry has a Transparency (Art. 50) tab alongside Models, Data Sources, and Risk Classification.",
            },
            {
              step: "Review the suggested obligations",
              body: "The module screens the system's purpose and technique and suggests which of the four obligations look applicable. Treat these as prompts, not conclusions — you confirm each one.",
            },
            {
              step: "Set a status per obligation",
              body: "Mark each as Not applicable, Required, or Implemented. Anything left Required appears in the dashboard's transparency counters.",
            },
            {
              step: "Write the AI statement",
              body: "Record the disclosure wording and the marking method you actually use. This is the artifact a market surveillance authority will ask for; a status field alone will not satisfy them.",
            },
          ].map((s, i) => (
            <li key={s.step} className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold mb-1">{s.step}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Caveat */}
      <section>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-2">A note on scope</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This module records your Art. 50 position; it does not mark content for you.
            Machine-readable marking is implemented in the generating system itself.
            AI SENTINEL is where you document which systems owe the duty, whether it is
            satisfied, and how — so the answer exists before someone asks for it.
          </p>
        </div>
      </section>
    </div>
  );
}
