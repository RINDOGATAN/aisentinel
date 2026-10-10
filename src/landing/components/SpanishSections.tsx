// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The Spanish landing's middle (locale es only; the English page keeps its
 * "How it works" and "Features" sections), after DPO Central's landing:
 * the three tools and how they connect, the demo videos (only while the
 * configured list is not empty), the six stages of the programme as the
 * Guided path implements them with the 30/60/90-day plan beneath, the three
 * ways to run it that the storefront offers in Spain, then the customer logos
 * (only while the configured list is not empty). No prices, no hosting
 * location, no hardware and no installer kit.
 *
 * Nothing moves or plays on its own: the videos load nothing until the
 * visitor presses play.
 */

import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  Activity,
  Brain,
  Check,
  ClipboardCheck,
  Cloud,
  GraduationCap,
  Mail,
  Rocket,
  Server,
  ShieldCheck,
  Store,
  Users,
  Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { brand } from "@/config/brand";
import { LANDING_VIDEOS_ES, type LandingVideo } from "../config/landing-videos";
import CustomerLogos from "./CustomerLogos";

type T = (key: string) => string;

/** Keeps names such as "AIUC-1" whole: a line never breaks at their hyphen. */
function keepWhole(text: string) {
  return text.split(/(AIUC-1)/).map((part, i) =>
    part === "AIUC-1" ? <span key={i} className="whitespace-nowrap">{part}</span> : part
  );
}

function SectionHead({ t, k, sub = true }: { t: T; k: string; sub?: boolean }) {
  return (
    <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
      <span className="section-label">{t(`${k}.label`)}</span>
      <h2 id={`${k}-heading`} className="text-2xl md:text-4xl mt-2 mb-4">
        {t(`${k}.heading.prefix`)}
        <span className="text-accent">{t(`${k}.heading.accent`)}</span>
      </h2>
      {sub && <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-body">{t(`${k}.sub`)}</p>}
    </div>
  );
}

/* ── a. The three tools ─────────────────────────────────────────────── */

interface Tool {
  key: string;
  icon: LucideIcon;
  bullets: number;
  hub?: boolean;
}

const TOOLS: Record<"dpc" | "ais" | "vw", Tool> = {
  dpc: { key: "es.suite.dpc", icon: ShieldCheck, bullets: 3 },
  ais: { key: "es.suite.ais", icon: Bot, bullets: 5, hub: true },
  vw: { key: "es.suite.vw", icon: Store, bullets: 3 },
};

function ToolPanel({ t, tool }: { t: T; tool: Tool }) {
  const Icon = tool.icon;
  return (
    <article
      className={
        "relative h-full rounded-2xl border p-6 md:p-7 flex flex-col " +
        (tool.hub
          ? "bg-card border-accent/60 shadow-[0_0_0_1px_rgba(245,166,35,0.25),0_20px_60px_-20px_rgba(245,166,35,0.45)]"
          : "bg-card border-border")
      }
    >
      {tool.hub && (
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-32 w-48 rounded-full bg-accent/15 blur-3xl" />
      )}
      <div className="relative flex items-center gap-3 mb-4">
        <div className={"w-11 h-11 rounded-xl flex items-center justify-center " + (tool.hub ? "bg-accent text-[#1a1a1a]" : "bg-accent/10 text-accent")}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium font-body">
            {t(`${tool.key}.tag`)}
          </span>
          <h3 className="text-xl font-display leading-tight">{t(`${tool.key}.name`)}</h3>
        </div>
      </div>
      <p className="relative text-sm text-foreground/85 leading-relaxed font-body mb-5">{t(`${tool.key}.desc`)}</p>
      <ul className="relative space-y-2.5 mt-auto">
        {Array.from({ length: tool.bullets }, (_, n) => (
          <li key={n} className="flex items-start gap-2.5 text-sm font-body text-muted-foreground">
            <Check className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" aria-hidden="true" />
            <span>{keepWhole(t(`${tool.key}.b${n + 1}`))}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/**
 * The link between a neighbouring tool and AI Sentinel: vertical on a phone
 * (the panels stack), horizontal from the `lg` breakpoint. "both" is a
 * two-way link (AI Sentinel and DPO Central link to each other); "left"
 * points from VendorWatch, on the right, to AI Sentinel in the middle.
 */
function Connector({ t, labelKey, direction }: { t: T; labelKey: string; direction: "both" | "left" }) {
  const Wide = direction === "both" ? ArrowLeftRight : ArrowLeft;
  const Narrow = direction === "both" ? ArrowUpDown : ArrowUp;
  return (
    <div className="flex lg:flex-col items-center justify-center gap-3 py-3 lg:py-0 lg:px-1">
      <div className="flex lg:w-full flex-col lg:flex-row items-center" aria-hidden="true">
        <span className="block w-px h-6 lg:h-px lg:w-full lg:flex-1 bg-gradient-to-b lg:bg-gradient-to-r from-accent/10 via-accent/70 to-accent/10" />
        <span className="flex items-center justify-center w-8 h-8 rounded-full border border-accent/50 bg-background text-accent my-1 lg:my-0 lg:mx-1">
          <Narrow className="w-4 h-4 lg:hidden" />
          <Wide className="w-4 h-4 hidden lg:block" />
        </span>
        <span className="block w-px h-6 lg:h-px lg:w-full lg:flex-1 bg-gradient-to-b lg:bg-gradient-to-r from-accent/10 via-accent/70 to-accent/10" />
      </div>
      <span className="max-w-[14rem] lg:max-w-none text-xs leading-snug text-accent font-body font-medium lg:text-center">
        {t(labelKey)}
      </span>
    </div>
  );
}

function Suite({ t }: { t: T }) {
  return (
    <section className="py-20 md:py-28 bg-secondary/20 border-y border-border" aria-labelledby="es.suite-heading">
      <div className="container px-6">
        <SectionHead t={t} k="es.suite" />
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1.12fr)_7.5rem_minmax(0,1fr)] items-stretch">
          <ToolPanel t={t} tool={TOOLS.dpc} />
          <Connector t={t} labelKey="es.suite.link.dpc" direction="both" />
          <ToolPanel t={t} tool={TOOLS.ais} />
          <Connector t={t} labelKey="es.suite.link.vw" direction="left" />
          <ToolPanel t={t} tool={TOOLS.vw} />
        </div>
      </div>
    </section>
  );
}

/* ── b. Videos ──────────────────────────────────────────────────────── */

export function Videos({ t, videos = LANDING_VIDEOS_ES }: { t: T; videos?: readonly LandingVideo[] }) {
  if (videos.length === 0) return null;
  // A centred, wrapping row: three to a line on wide screens, two on tablets,
  // one on phones, with an incomplete last line centred (five videos: 3 + 2).
  const item = videos.length === 1 ? "w-full max-w-3xl" : "w-full md:w-[calc(50%-0.75rem)] lg:w-[calc((100%-3rem)/3)]";
  return (
    <section className="py-20 md:py-28" aria-labelledby="es.videos-heading" data-testid="es-videos">
      <div className="container px-6">
        <SectionHead t={t} k="es.videos" />
        <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
          {videos.map((video, i) => {
            const base = `/videos/es/${video.file}`;
            const captionId = `es-video-${i + 1}-caption`;
            return (
              <figure key={video.file} className={`${item} rounded-2xl border border-border bg-card overflow-hidden flex flex-col`}>
                <video
                  className="block w-full aspect-video bg-black"
                  controls
                  muted
                  playsInline
                  preload="none"
                  poster={`${base}.png`}
                  aria-label={video.title}
                  aria-describedby={captionId}
                >
                  <source src={`${base}.webm`} type="video/webm" />
                  <source src={`${base}.mp4`} type="video/mp4" />
                  <track kind="captions" srcLang="es" label={t("es.videos.captions")} src={`${base}.vtt`} />
                </video>
                <figcaption id={captionId} className="p-5">
                  <span className="block text-base font-display mb-1">{video.title}</span>
                  <span className="block text-sm text-muted-foreground font-body leading-relaxed">{video.caption}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── c. The six stages and the 30/60/90-day plan ────────────────────── */

// The six stages of AI_SENTINEL_PATH (src/components/guided/path-config.ts),
// in order, with the icons the menu uses for them.
const STAGE_ICONS: LucideIcon[] = [Rocket, Users, Brain, ClipboardCheck, ShieldCheck, Activity];

function Stages({ t }: { t: T }) {
  return (
    <section className="py-20 md:py-28 bg-secondary/20 border-y border-border" aria-labelledby="es.stages-heading">
      <div className="container px-6">
        <SectionHead t={t} k="es.stages" />
        <div className="max-w-6xl mx-auto">
          <div className="relative">
          {/* the path that joins the stages */}
          <div aria-hidden="true" className="hidden lg:block absolute top-7 left-[8%] right-[8%] h-px bg-gradient-to-r from-accent/20 via-accent/70 to-accent/20" />
          <div aria-hidden="true" className="lg:hidden absolute top-7 bottom-7 left-7 w-px bg-gradient-to-b from-accent/20 via-accent/70 to-accent/20" />
          <ol className="relative grid grid-cols-1 lg:grid-cols-6 gap-6 lg:gap-4">
            {STAGE_ICONS.map((Icon, i) => {
              const n = i + 1;
              return (
                <li key={n} className="flex lg:flex-col items-start lg:items-center gap-4 lg:text-center">
                  <div className="relative flex-shrink-0 w-14 h-14 rounded-full border border-accent/60 bg-background flex items-center justify-center text-accent">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent text-[#1a1a1a] text-xs font-display flex items-center justify-center" aria-hidden="true">
                      {n}
                    </span>
                  </div>
                  <div className="paper-card flex-1 lg:w-full !p-5">
                    <span className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium font-body mb-1">
                      {t("es.stages.stage")} {n}
                    </span>
                    <h3 className="text-base font-display mb-2 leading-snug">{t(`es.stages.s${n}.title`)}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-body">{keepWhole(t(`es.stages.s${n}.desc`))}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          </div>

          {/* The plan: each thirty days covers two stages (PLAN_WINDOWS). */}
          <div className="mt-10 lg:mt-12" aria-labelledby="es-plan-heading">
            <h3 id="es-plan-heading" className="text-center text-base font-display mb-4">
              {t("es.stages.plan.title")}
            </h3>
            <ol className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
              {[1, 2, 3].map((p) => (
                <li
                  key={p}
                  className="rounded-xl border border-accent/40 bg-accent/10 px-5 py-4 flex flex-col lg:items-center lg:text-center"
                >
                  <span className="text-sm font-display text-accent">{t(`es.stages.plan.p${p}.days`)}</span>
                  <span className="text-sm font-body text-foreground/85">{t(`es.stages.plan.p${p}.stages`)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-center text-sm text-muted-foreground font-body">{t("es.stages.plan.note")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── d. Where it runs ───────────────────────────────────────────────── */

const WAYS: Array<{ icon: LucideIcon; letter: string; request: boolean }> = [
  { icon: Cloud, letter: "a", request: false },
  { icon: Server, letter: "b", request: true },
  { icon: GraduationCap, letter: "c", request: true },
];

function Ways({ t }: { t: T }) {
  return (
    <section className="py-20 md:py-28" aria-labelledby="es.ways-heading">
      <div className="container px-6">
        <SectionHead t={t} k="es.ways" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {WAYS.map(({ icon: Icon, letter, request }, i) => {
            const n = i + 1;
            const mailto = `mailto:${brand.supportEmail}?subject=${encodeURIComponent(t(`es.ways.w${n}.subject`))}`;
            return (
              <article key={letter} className="paper-card flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <span className="text-3xl font-display text-muted-foreground" aria-hidden="true">{letter}</span>
                </div>
                <h3 className="text-lg font-display mb-2">{t(`es.ways.w${n}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-body mb-5">{t(`es.ways.w${n}.desc`)}</p>
                {request && (
                  <a
                    href={mailto}
                    className="mt-auto inline-flex items-center gap-2 self-start text-sm font-medium text-accent hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    <Mail className="w-4 h-4" aria-hidden="true" />
                    {t("es.ways.request")}
                    <span className="sr-only">: {t(`es.ways.w${n}.title`)}</span>
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function SpanishSections({ t, videos }: { t: T; videos?: readonly LandingVideo[] }) {
  return (
    <>
      <Suite t={t} />
      <Videos t={t} videos={videos} />
      <Stages t={t} />
      <Ways t={t} />
      <CustomerLogos t={t} />
    </>
  );
}

