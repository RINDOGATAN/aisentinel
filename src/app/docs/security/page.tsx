// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";

export async function generateMetadata() {
  const t = await getTranslations("docs.security");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

// OWASP standards rows: which entries render as "Mitigated" vs "Active".
// Must stay aligned with the standards.items order in the message files.
const standardsMitigated = [true, true, true, true, true, false];

export default async function SecurityDocsPage() {
  const t = await getTranslations("docs.security");
  const isolationItems = t.raw("isolation.items") as { title: string; description: string }[];
  const roles = t.raw("accessControl.roles") as string[];
  const authMethods = t.raw("auth.methods") as { title: string; description: string }[];
  const sessionItems = t.raw("auth.sessionItems") as string[];
  const validationItems = t.raw("validation.items") as { title: string; description: string }[];
  const logItems = t.raw("audit.logItems") as string[];
  const transportItems = t.raw("transport.items") as { title: string; description: string }[];
  const standardsItems = t.raw("standards.items") as { category: string; description: string }[];

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          {t("intro")}
        </p>
      </section>

      {/* Data Isolation */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("isolation.title")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("isolation.intro")}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {isolationItems.map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Access Control */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("accessControl.title")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("accessControl.intro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex flex-wrap gap-3 mb-4">
            {roles.map((role, i) => (
              <div key={role} className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {role}
                </span>
                {i < roles.length - 1 && <span className="text-muted-foreground">›</span>}
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">{t("accessControl.readOnlyTitle")}</h4>
              <p className="text-muted-foreground">
                {t("accessControl.readOnlyBody")}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("accessControl.elevatedTitle")}</h4>
              <p className="text-muted-foreground">
                {t("accessControl.elevatedBody")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("auth.title")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("auth.intro")}
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {authMethods.map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 mt-4">
          <h4 className="font-medium mb-3 text-sm">{t("auth.sessionTitle")}</h4>
          <div className="grid sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <ul className="space-y-2">
              {sessionItems.slice(0, 2).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
            <ul className="space-y-2">
              {sessionItems.slice(2).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Input Validation */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("validation.title")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("validation.intro")}
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {validationItems.map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Audit Trail */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("audit.title")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("audit.intro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">{t("audit.whatWeLogTitle")}</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                {logItems.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("audit.retentionTitle")}</h4>
              <p className="text-muted-foreground">
                {t("audit.retentionBody")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Transport & Infrastructure */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("transport.title")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("transport.intro")}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {transportItems.map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Webhook & API Security */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("api.title")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("api.intro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">{t("api.endpointTitle")}</h4>
              <p className="text-muted-foreground">
                {t("api.endpointBody")}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("api.webhookTitle")}</h4>
              <p className="text-muted-foreground">
                {t("api.webhookBody")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Standards */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("standards.title")}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t("standards.intro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          {standardsItems.map((item, i) => (
            <div key={item.category} className="flex items-start gap-3 text-sm">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                  standardsMitigated[i]
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {standardsMitigated[i] ? t("standards.statusMitigated") : t("standards.statusActive")}
              </span>
              <div>
                <span className="font-medium">{item.category}</span>
                <span className="text-muted-foreground"> — {item.description}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("contact.title")}
        </h2>
        <p className="text-muted-foreground">
          {t.rich("contact.body", {
            email: brand.securityEmail,
            link: (chunks) => (
              <a
                href={`mailto:${brand.securityEmail}`}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </section>
    </div>
  );
}
