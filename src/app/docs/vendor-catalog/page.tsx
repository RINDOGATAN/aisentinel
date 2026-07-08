// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

export const metadata = {
  title: "AI Vendor Catalog — AI SENTINEL Docs",
  description:
    "Pre-audited catalog of 665+ AI vendors with risk profiles, compliance data, and governance metadata powered by Vendor.Watch.",
};

export default function VendorCatalogDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <div className="inline-block px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-4">
          Premium
        </div>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          AI Vendor Catalog
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Evaluating AI vendors from scratch is time-consuming and error-prone. The AI Vendor
          Catalog gives your governance team a head start with pre-audited profiles for 665+
          AI vendors — complete with risk indicators, compliance certifications, and
          deployment metadata.
        </p>
      </section>

      {/* What is the Vendor Catalog */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          What is the AI Vendor Catalog?
        </h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            The AI Vendor Catalog is a searchable, pre-populated directory of AI tool and
            service providers. Each vendor profile includes structured governance data: what
            the vendor does, where data is processed, what certifications they hold, whether
            they train on customer data, and their EU AI Act risk classification.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The catalog is powered by{" "}
            <strong className="text-foreground">Vendor.Watch</strong>, an independent AI vendor
            intelligence service that continuously audits and updates vendor profiles. Data syncs
            automatically, so your catalog stays current without manual research.
          </p>
        </div>
      </section>

      {/* Why it matters */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Why it matters</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              title: "Due diligence at scale",
              description:
                "Manually researching each AI vendor's data practices, certifications, and risk posture is impractical. The catalog provides a standardized baseline for every vendor evaluation.",
            },
            {
              title: "Faster procurement",
              description:
                "When a team requests a new AI tool, governance can check the catalog immediately — no weeks-long vendor questionnaire cycle needed for initial assessment.",
            },
            {
              title: "Regulatory compliance",
              description:
                "The EU AI Act requires deployers to understand the AI systems they use. Pre-classified vendor risk levels and compliance indicators help meet Art. 6 and Art. 26 obligations.",
            },
            {
              title: "Continuous updates",
              description:
                "Vendor risk profiles change as companies update their terms, certifications expire, or data practices evolve. Automated sync ensures your catalog reflects current reality.",
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

      {/* Vendor Catalog vs Vendor Risk */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          Vendor Catalog vs Vendor Risk
        </h2>
        <p className="text-muted-foreground mb-6">
          The AI Vendor Catalog and the Vendor Risk module serve different purposes in the
          governance lifecycle. They complement each other.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-3 text-primary">Vendor Catalog</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Pre-populated directory of 665+ AI vendors</li>
              <li>External intelligence — data from Vendor.Watch</li>
              <li>Read-only reference for initial due diligence</li>
              <li>Core question: &ldquo;What do we know about this vendor?&rdquo;</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-3 text-primary">Vendor Risk</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Your organization&apos;s vendor records</li>
              <li>Internal assessments — your team&apos;s risk evaluations</li>
              <li>Full CRUD with status tracking and contract management</li>
              <li>Core question: &ldquo;How risky is this vendor for us?&rdquo;</li>
            </ul>
          </div>
        </div>
      </section>

      {/* What's in a profile */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          What&apos;s in a vendor profile
        </h2>
        <div className="space-y-4">
          {[
            {
              category: "Identity",
              fields: "Name, slug, logo, website, description, category, headquarters country",
            },
            {
              category: "AI Model Information",
              fields: "Model names, model types (proprietary, open-source, fine-tuned), training data transparency",
            },
            {
              category: "Data & Privacy",
              fields: "Data processing locations, data retention policy, trains on customer data (yes/no), sub-processors disclosed",
            },
            {
              category: "Compliance & Certifications",
              fields: "SOC 2, ISO 27001, GDPR compliance status, EU AI Act risk classification, HIPAA eligibility",
            },
            {
              category: "Governance Metadata",
              fields: "Last audit date, Vendor.Watch risk score, catalog sync timestamp, source URL",
            },
          ].map((item) => (
            <div
              key={item.category}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-semibold mb-1">{item.category}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.fields}
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
              title: "Browse or search",
              description:
                "Search the catalog by vendor name, category, or compliance attribute. Filter by risk level, certification status, or data processing location.",
            },
            {
              step: "2",
              title: "Review the profile",
              description:
                "Each vendor has a detailed profile page with structured governance data — risk indicators, compliance certifications, data practices, and AI model information.",
            },
            {
              step: "3",
              title: "Inform your decision",
              description:
                "Use the catalog data to accelerate vendor assessments, support procurement decisions, or evaluate shadow AI tools that employees have reported.",
            },
            {
              step: "4",
              title: "Automatic sync",
              description:
                "The catalog syncs with Vendor.Watch on a regular schedule. New vendors are added and existing profiles are updated automatically as intelligence becomes available.",
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
