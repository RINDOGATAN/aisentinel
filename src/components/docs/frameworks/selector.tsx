"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { TierMarker } from "@/components/governance/risk-tier-badge";
import {
  defaultAnswers,
  frameworksData,
  REQUIRED_STACK_SLOTS,
  runSelector,
  STACK_SLOTS,
  whenMatches,
  type Answers,
  type When,
} from "@/lib/frameworks/model";

export function FrameworksSelector({ initial }: { initial?: Answers }) {
  const t = useTranslations("docs.frameworks");
  const P = frameworksData.picker;
  const byId = useMemo(() => new Map(frameworksData.frameworks.map((f) => [f.id, f])), []);
  const [answers, setAnswers] = useState<Answers>(() => initial ?? defaultAnswers());
  const result = runSelector(answers);

  // Interface labels come from the message files; the data's English label is the fallback.
  const inputLabel = (id: string) => {
    const k = `inputs.${id}.label`;
    return t.has(k) ? t(k) : (P.inputs.find((i) => i.id === id)?.label ?? id);
  };
  const optionLabel = (input: string, option: string) => {
    const k = `inputs.${input}.options.${option}`;
    return t.has(k)
      ? t(k)
      : (P.inputs.find((i) => i.id === input)?.options.find((o) => o.id === option)?.label ?? option);
  };
  const describe = (when: When) => {
    const parts = Object.keys(when || {}).map((key) =>
      t("selector.condition", {
        input: inputLabel(key).toLowerCase(),
        values: when[key].map((v) => optionLabel(key, v)).join(t("selector.or")),
      }),
    );
    return parts.length ? t("selector.when", { conditions: parts.join(t("selector.and")) }) : t("selector.always");
  };

  const set = (input: string, option: string, multiple: boolean) =>
    setAnswers((a) => {
      if (!multiple) return { ...a, [input]: [option] };
      const cur = a[input] ?? [];
      return { ...a, [input]: cur.includes(option) ? cur.filter((x) => x !== option) : [...cur, option] };
    });


  return (
    <div className="space-y-6">
      <p className="text-muted-foreground max-w-3xl">{t("selector.intro")}</p>

      <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
        {P.inputs.map((inp) => (
          <fieldset key={inp.id} className="rounded-xl border border-border bg-card p-4">
            <legend className="px-1 text-sm font-semibold">{inputLabel(inp.id)}</legend>
            <div className="space-y-1.5">
              {inp.options.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm">
                  <input
                    type={inp.multiple ? "checkbox" : "radio"}
                    name={inp.id}
                    value={o.id}
                    className="h-4 w-4 accent-[var(--primary)]"
                    checked={(answers[inp.id] ?? []).includes(o.id)}
                    onChange={() => set(inp.id, o.id, !!inp.multiple)}
                  />
                  {optionLabel(inp.id, o.id)}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </form>

      <section className="rounded-xl border border-border bg-card p-5 space-y-5" aria-live="polite" data-testid="selector-result">
        {!result.ready ? (
          <p className="text-sm">{t("selector.needJurisdiction")}</p>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-display tracking-tight mb-3">{t("selector.resultsTitle")}</h2>
              {result.ranked.length === 0 ? (
                <p className="text-sm">{t("selector.noMatch")}</p>
              ) : (
                <ol className="space-y-3 list-decimal pl-5">
                  {result.ranked.map((r) => {
                    const f = byId.get(r.id)!;
                    return (
                      <li key={r.id} className="text-sm" data-framework={r.id}>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{f.name}</strong>
                          {/* Binding law: neutral chip, body-colour text, and the
                              red tier marker as the signal (never coloured text). */}
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${
                              r.binding
                                ? "border-border bg-tier-chip text-foreground"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {r.binding && <TierMarker level="UNACCEPTABLE" />}
                            {r.binding ? t("selector.bindingTag") : f.nature}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{t("selector.points", { score: r.score })}</span>
                        </div>
                        <p className="mt-1">{r.reasons[0]}</p>
                        {r.reasons.length > 1 && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {t("selector.also", { reasons: r.reasons.slice(1).join(" ") })}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <div className="border-l-4 border-primary pl-4 space-y-1.5 text-sm" data-testid="selector-stack">
              <h3 className="font-semibold">{t("selector.stackTitle")}</h3>
              <p>
                <strong>{t("selector.bindingLaws")}: </strong>
                {result.binding.length
                  ? result.binding.map((id) => byId.get(id)!.short).join(", ")
                  : t("selector.noBinding")}
              </p>
              {STACK_SLOTS.map((slot) => {
                const rule = result.stack[slot];
                // The agent slot speaks only when it applies; the other two always answer.
                if (!rule && !(REQUIRED_STACK_SLOTS as readonly string[]).includes(slot)) return null;
                return (
                  <p key={slot}>
                    <strong>{t(`selector.${slot}`)}: </strong>
                    {rule ? `${byId.get(rule.pick)!.short}. ${rule.reason}` : t("selector.noSuggestion")}
                  </p>
                );
              })}
            </div>
          </>
        )}
        <p className="text-xs text-muted-foreground">{t("selector.caveat")}</p>
      </section>

      <details className="rounded-xl border border-border bg-card p-5">
        <summary className="cursor-pointer font-semibold">{t("selector.whyTitle")}</summary>
        <p className="mt-2 text-xs text-muted-foreground">{t("selector.whyIntro")}</p>
        <ul className="mt-3 space-y-1.5 text-xs" data-testid="selector-rules">
          {P.rules.map((rule, i) => {
            const hit = result.ready && whenMatches(rule.when, answers);
            return (
              <li key={i} className={hit ? "text-foreground" : "text-muted-foreground"}>
                {hit && (
                  <span className="mr-1.5 rounded bg-primary/15 px-1 text-[10px] font-semibold uppercase text-primary">
                    {t("selector.matched")}
                  </span>
                )}
                <strong>{byId.get(rule.framework)?.short}</strong> +{rule.score}
                {rule.binding ? ` (${t("selector.binding")})` : ""} {describe(rule.when)}: {rule.reason}
              </li>
            );
          })}
          {STACK_SLOTS.flatMap((slot) =>
            (P.stack[slot] ?? []).map((rule, i) => {
              const hit = result.ready && result.stack[slot] === rule;
              return (
                <li key={`${slot}-${i}`} className={hit ? "text-foreground" : "text-muted-foreground"}>
                  {hit && (
                    <span className="mr-1.5 rounded bg-primary/15 px-1 text-[10px] font-semibold uppercase text-primary">
                      {t("selector.matched")}
                    </span>
                  )}
                  <strong>{t("selector.stackRule", { slot: t(`selector.${slot}`), n: i + 1 })}</strong>{" "}
                  {byId.get(rule.pick)?.short} {describe(rule.when)}: {rule.reason}
                </li>
              );
            }),
          )}
        </ul>
      </details>

      <p className="text-sm">
        <Link href="/docs/cross-border" className="text-primary hover:underline">
          {t("detail.relatedDocs")}: {frameworksData.modules.regimes.label}
        </Link>
      </p>
    </div>
  );
}
