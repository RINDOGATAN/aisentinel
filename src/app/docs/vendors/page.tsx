export const metadata = {
  title: "Vendor Risk — AI SENTINEL Docs",
  description:
    "Third-party AI vendor management with risk assessment, contract tracking, and due diligence.",
};

export default function VendorsDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          Vendor Risk
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Manage third-party AI vendors with risk assessment, contract lifecycle tracking, and due
          diligence documentation. Maintain a complete registry of every AI vendor your organization
          relies on.
        </p>
      </section>

      {/* Risk Levels */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Vendor Risk Levels</h2>
        <p className="text-muted-foreground mb-6">
          Each vendor is assigned a risk level based on the criticality of the AI services they
          provide. Risk level determines review frequency and due diligence requirements.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { level: "Critical", color: "bg-red-500/10 text-red-400 border-red-500/20", description: "Core AI infrastructure, irreplaceable" },
            { level: "High", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", description: "Significant dependency, limited alternatives" },
            { level: "Medium", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", description: "Moderate dependency, alternatives exist" },
            { level: "Low", color: "bg-green-500/10 text-green-400 border-green-500/20", description: "Minimal dependency, easily replaceable" },
          ].map((risk) => (
            <div key={risk.level} className={`rounded-xl border p-4 ${risk.color}`}>
              <h3 className="font-semibold mb-1">{risk.level}</h3>
              <p className="text-xs opacity-80">{risk.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vendor Status */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Vendor Status Workflow</h2>
        <p className="text-muted-foreground mb-6">
          Vendors progress through a review and approval workflow before being cleared for use.
        </p>
        <div className="flex flex-wrap gap-3">
          {["Under Review", "Active", "Approved", "Suspended", "Terminated"].map(
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

      {/* Vendor Record */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Vendor Record</h2>
        <p className="text-muted-foreground mb-6">
          Each vendor record captures the information needed for risk management and contract
          oversight.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              title: "Company Details",
              items: ["Vendor name and website", "Primary contact", "Country and jurisdiction", "Services provided"],
            },
            {
              title: "Risk & Compliance",
              items: ["Risk level (Critical/High/Medium/Low)", "CCPA compliant flag", "Subprocessors list", "DPO Central vendor cross-reference"],
            },
            {
              title: "Contract",
              items: ["Contract start and expiry dates", "Renewal alerts", "Contract value", "SLA terms"],
            },
            {
              title: "Assessments",
              items: ["Vendor risk assessments", "Due diligence documentation", "Review schedule", "Findings and remediation"],
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

      {/* AI Vendor Catalog */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          AI Vendor Catalog
          <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium align-middle">
            Premium
          </span>
        </h2>
        <p className="text-muted-foreground mb-6">
          The AI Vendor Catalog (powered by Vendor.Watch) provides a pre-audited database of AI
          vendors. Search the catalog, view vendor profiles, and add vendors directly to your
          registry with auto-filled details.
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">Search & Browse</h4>
              <p className="text-muted-foreground">
                Search by vendor name or browse by category. Each catalog entry includes a
                description, website, and compliance flags.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Auto-fill</h4>
              <p className="text-muted-foreground">
                When adding a vendor from the catalog, the form is auto-filled with the vendor&apos;s
                details — saving time and ensuring accuracy.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Register as AI System</h4>
              <p className="text-muted-foreground">
                Optionally register the vendor&apos;s product as an AI system in your registry at the
                same time, linking the vendor and system records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Add */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Adding a Vendor
        </h2>
        <div className="space-y-4">
          {[
            { step: "1", role: "AI Officer", title: "Navigate to Vendors", description: "Go to Operations → Vendors from the top navigation." },
            { step: "2", role: "AI Officer", title: "Click Add Vendor", description: "Use the button in the top-right corner. Optionally search the AI Vendor Catalog to auto-fill details." },
            { step: "3", role: "AI Officer", title: "Complete vendor details", description: "Enter the vendor name, website, contact, services, and assign a risk level." },
            { step: "4", role: "AI Officer", title: "Add contract information", description: "Document contract dates, renewal terms, and SLA details." },
            { step: "5", role: "AI Officer", title: "Schedule risk assessments", description: "From the vendor detail page, create vendor risk assessments and set review schedules." },
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
