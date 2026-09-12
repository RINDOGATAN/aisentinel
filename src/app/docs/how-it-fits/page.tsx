// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * How the parts fit together, in one picture and one table.
 *
 * The product has grown a lot of screens. This page exists so that nobody has
 * to hold the map in their head: what you put in, what the product derives,
 * what comes out, and which record answers which question.
 */

import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("docs.howItFits");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const AMBER = "#f5a623";
const LINE = "rgba(255,255,255,0.14)";

/** Three columns: what you say, what the product derives, what you hand over. */
function FlowDiagram({
  labels,
}: {
  labels: { inputs: string[]; derived: string[]; outputs: string[]; columns: string[] };
}) {
  const colX = [90, 360, 630];
  const rowY = (i: number) => 92 + i * 58;
  const height = 92 + Math.max(labels.inputs.length, labels.derived.length, labels.outputs.length) * 58;

  const box = (x: number, y: number, text: string, accent = false) => (
    <g key={`${x}-${y}-${text}`}>
      <rect
        x={x - 82}
        y={y - 19}
        width={164}
        height={38}
        rx={9}
        fill={accent ? "rgba(245,166,35,0.12)" : "rgba(255,255,255,0.03)"}
        stroke={accent ? AMBER : LINE}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize="11.5"
        fill={accent ? AMBER : "currentColor"}
      >
        {text.length > 26 ? `${text.slice(0, 25)}…` : text}
      </text>
    </g>
  );

  return (
    <svg
      viewBox={`0 0 760 ${height + 20}`}
      className="w-full h-auto text-foreground"
      role="img"
      aria-label={labels.columns.join(" → ")}
    >
      {labels.columns.map((c, i) => (
        <text
          key={c}
          x={colX[i]}
          y={44}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
          opacity={0.6}
        >
          {c.toUpperCase()}
        </text>
      ))}

      {/* The two arrows between columns */}
      {[0, 1].map((i) => (
        <g key={i}>
          <line
            x1={colX[i] + 86}
            y1={height / 2 + 20}
            x2={colX[i + 1] - 90}
            y2={height / 2 + 20}
            stroke={AMBER}
            strokeOpacity={0.35}
            strokeWidth={2}
          />
          <polygon
            points={`${colX[i + 1] - 90},${height / 2 + 20} ${colX[i + 1] - 98},${height / 2 + 15} ${colX[i + 1] - 98},${height / 2 + 25}`}
            fill={AMBER}
            fillOpacity={0.5}
          />
        </g>
      ))}

      {labels.inputs.map((label, i) => box(colX[0], rowY(i), label))}
      {labels.derived.map((label, i) => box(colX[1], rowY(i), label, true))}
      {labels.outputs.map((label, i) => box(colX[2], rowY(i), label))}
    </svg>
  );
}

export default async function HowItFitsPage() {
  const t = await getTranslations("docs.howItFits");
  const diagram = t.raw("diagram") as {
    columns: string[];
    inputs: string[];
    derived: string[];
    outputs: string[];
  };
  const questions = t.raw("questions") as { question: string; where: string; href: string }[];
  const paths = t.raw("paths") as { name: string; body: string }[];
  const rules = t.raw("rules") as string[];

  return (
    <div className="space-y-16">
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">{t("title")}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">{t("intro")}</p>
      </section>

      {/* The picture */}
      <section>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <FlowDiagram labels={diagram} />
        </div>
        <p className="text-xs text-muted-foreground mt-3 max-w-3xl">{t("diagramNote")}</p>
      </section>

      {/* Which record answers which question */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("questionsTitle")}</h2>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {questions.map((q) => (
            <div key={q.question} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm flex-1">{q.question}</span>
              <Link
                href={q.href}
                className="text-sm text-primary hover:underline shrink-0"
              >
                {q.where}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Where to start */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("pathsTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {paths.map((p) => (
            <div key={p.name} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-1">{p.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The rules that hold it together */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("rulesTitle")}</h2>
        <ul className="space-y-3 max-w-3xl">
          {rules.map((rule) => (
            <li key={rule} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
              <span className="text-primary shrink-0">·</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
