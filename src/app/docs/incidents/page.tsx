export const metadata = {
  title: "AI Incidents — AI SENTINEL Docs",
  description:
    "Track AI-specific failures, coordinate response tasks, and manage Art. 73 authority notifications.",
};

export default function IncidentsDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          AI Incidents
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Track AI-specific incidents from initial report through resolution. Manage response
          timelines, coordinate tasks, and handle Art. 73 authority notifications for serious
          incidents involving high-risk AI systems.
        </p>
      </section>

      {/* Incident Types */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Incident Types</h2>
        <p className="text-muted-foreground mb-6">
          AI SENTINEL tracks incident types specific to AI systems, distinct from data protection
          incidents handled in DPO Central.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            "Hallucination",
            "Bias / Discrimination",
            "Model Drift",
            "Adversarial Attack",
            "Prompt Injection",
            "Unauthorized Access",
            "Safety Failure",
            "Performance Degradation",
            "Data Poisoning",
            "Privacy Violation",
          ].map((type) => (
            <div
              key={type}
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              {type}
            </div>
          ))}
        </div>
      </section>

      {/* Incident Lifecycle */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Incident Lifecycle</h2>
        <p className="text-muted-foreground mb-6">
          Every incident follows a structured workflow. Status transitions and timestamps are
          tracked for compliance evidence.
        </p>
        <div className="flex flex-wrap gap-3">
          {["Reported", "Investigating", "Mitigating", "Resolved", "Closed"].map(
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

      {/* Severity */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Severity Classification</h2>
        <p className="text-muted-foreground mb-6">
          Severity levels prioritize response efforts and determine notification requirements.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              level: "Low",
              color: "bg-green-500/10 text-green-400 border-green-500/20",
              description: "Minor incident, limited impact. No regulatory notification required.",
            },
            {
              level: "Medium",
              color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
              description: "Moderate impact, contained quickly. Internal review recommended.",
            },
            {
              level: "High",
              color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
              description: "Significant impact. Likely requires authority notification under Art. 73.",
            },
            {
              level: "Critical",
              color: "bg-red-500/10 text-red-400 border-red-500/20",
              description: "Large-scale failure or safety risk. Immediate Art. 73 notification required.",
            },
          ].map((sev) => (
            <div
              key={sev.level}
              className={`rounded-xl border p-5 ${sev.color}`}
            >
              <h3 className="text-lg font-semibold mb-2">{sev.level}</h3>
              <p className="text-sm opacity-90 leading-relaxed">{sev.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Art. 73 Notifications */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Art. 73 Authority Notifications
        </h2>
        <p className="text-muted-foreground mb-6">
          Under EU AI Act Article 73, providers of high-risk AI systems must report serious
          incidents to the relevant market surveillance authority. AI SENTINEL tracks notification
          deadlines, recipient authorities, and submission status.
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">When to notify</h4>
              <p className="text-muted-foreground">
                Serious incidents involving death, serious damage to health, property, or the
                environment, or serious and irreversible disruption of critical infrastructure.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Timeline</h4>
              <p className="text-muted-foreground">
                Report immediately after establishing a causal link (or its reasonable
                likelihood) and no later than 15 days after awareness — 10 days if the
                incident involves a death, 2 days for widespread infringements or serious
                and irreversible disruption of critical infrastructure. The system tracks
                elapsed time from the incident report date.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">What to include</h4>
              <p className="text-muted-foreground">
                Description of the incident, affected AI system, severity, root cause analysis (if
                available), and corrective measures taken or planned.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Incident Timeline */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Incident Timeline</h2>
        <p className="text-muted-foreground mb-6">
          Each incident maintains a detailed timeline recording all events, status changes, task
          assignments, and communications.
        </p>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-sm">
          {[
            { time: "09:15", event: "Incident reported", badge: "CREATED" },
            { time: "09:45", event: "Assigned to investigation team", badge: "INVESTIGATING" },
            { time: "11:00", event: "Root cause identified — model drift detected", badge: "UPDATE" },
            { time: "14:00", event: "Art. 73 notification sent to authority", badge: "NOTIFICATION" },
            { time: "16:30", event: "Mitigation deployed — model rolled back", badge: "MITIGATING" },
            { time: "18:00", event: "Incident resolved and closed", badge: "RESOLVED" },
          ].map((entry) => (
            <div key={entry.time} className="flex items-start gap-4">
              <span className="text-muted-foreground whitespace-nowrap font-mono">
                {entry.time}
              </span>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium shrink-0">
                {entry.badge}
              </span>
              <span className="text-muted-foreground">{entry.event}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How to Report */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Reporting an Incident
        </h2>
        <div className="space-y-4">
          {[
            { step: "1", role: "Reporter", title: "Report the incident", description: "Navigate to Operations → Incidents and click Report Incident. Provide initial details: affected AI system, incident type, and description." },
            { step: "2", role: "AI Officer", title: "Triage and assign severity", description: "Review the report, assign a severity level, and determine the response scope." },
            { step: "3", role: "IT Team", title: "Investigate and contain", description: "Gather evidence, identify the root cause, and implement immediate containment measures." },
            { step: "4", role: "AI Officer", title: "Notify authorities if required", description: "For high-risk systems with serious incidents, prepare and submit the Art. 73 notification." },
            { step: "5", role: "AI Officer", title: "Resolve and close", description: "Document the resolution, lessons learned, and any corrective actions. Close the incident." },
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
