// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The landing's middle, the same sections in both languages, after DPO
 * Central's landing: the three tools and how they connect, the demo videos
 * (only while a video of that language is published), the six stages of the
 * program as the Guided path implements them with the 30/60/90-day plan
 * beneath, and the ways to host it. The Spanish page then shows the customer
 * logos (only while the configured list is not empty); the English page
 * shows none. No prices and no hosting location.
 *
 * Each language has its own copy under `<locale>.*` in the landing
 * dictionary, and its own list of ways: three in Spanish (as the storefront
 * offers in Spain: no hardware, no installer kit), five in English (as on
 * the English storefront).
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
  ExternalLink,
  GraduationCap,
  HardDrive,
  Mail,
  Package,
  Rocket,
  Server,
  ShieldCheck,
  Store,
  Users,
  Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { brand } from "@/config/brand";
import { LANDING_VIDEOS, type LandingLocale, type LandingVideo } from "../config/landing-videos";
import CustomerLogos from "./CustomerLogos";

type T = (key: string) => string;

/** The public kit that installs the suite with Docker. */
export const KIT_URL = "https://github.com/RINDOGATAN/todolaw-suite";

type WayAction = "none" | "mail" | "link";

interface Way {
  icon: LucideIcon;
  action: WayAction;
  href?: string;
}

interface LocaleSetup {
  bullets: { dpc: number; ais: number; vw: number };
  ways: Way[];
  captionsLang: string;
  logos: boolean;
}

const SETUP: Record<LandingLocale, LocaleSetup> = {
  es: {
    bullets: { dpc: 3, ais: 5, vw: 3 },
    ways: [
      { icon: Cloud, action: "none" },
      { icon: Server, action: "mail" },
      { icon: GraduationCap, action: "mail" },
    ],
    captionsLang: "es",
    logos: true,
  },
  en: {
    bullets: { dpc: 3, ais: 5, vw: 3 },
    ways: [
      { icon: Cloud, action: "none" },
      { icon: Package, action: "link", href: KIT_URL },
      { icon: HardDrive, action: "mail" },
      { icon: Server, action: "mail" },
      { icon: GraduationCap, action: "mail" },
    ],
    captionsLang: "en",
    // No customer logos on the English page.
    logos: false,
  },
};

/** Keeps names such as "AIUC-1" whole: a line never breaks at their hyphen. */
function keepWhole(text: string) {
  return text.split(/(AIUC-1)/).map((part, i) =>
    part === "AIUC-1" ? <span key={i} className="whitespace-nowrap">{part}</span> : part
  );
}

/**
 * Widths for the cards of a centred, wrapping row (gap-6 = 1.5rem): three
 * to a line on wide screens, two on tablets, one on phones, with an
 * incomplete last line centred (five cards: 3 + 2).
 */
function cardWidth(count: number): string {
  return count === 1 ? "w-full max-w-3xl" : "w-full md:w-[calc(50%-0.75rem)] lg:w-[calc((100%-3rem)/3)]";
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

function Suite({ t, p, setup }: { t: T; p: LandingLocale; setup: LocaleSetup }) {
  const k = `${p}.suite`;
  const tool = (id: "dpc" | "ais" | "vw", icon: LucideIcon, hub = false): Tool => ({
    key: `${k}.${id}`,
    icon,
    bullets: setup.bullets[id],
    hub,
  });
  return (
    <section className="py-20 md:py-28 bg-secondary/20 border-y border-border" aria-labelledby={`${k}-heading`}>
      <div className="container px-6">
        <SectionHead t={t} k={k} />
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1.12fr)_7.5rem_minmax(0,1fr)] items-stretch">
          <ToolPanel t={t} tool={tool("dpc", ShieldCheck)} />
          <Connector t={t} labelKey={`${k}.link.dpc`} direction="both" />
          <ToolPanel t={t} tool={tool("ais", Bot, true)} />
          <Connector t={t} labelKey={`${k}.link.vw`} direction="left" />
          <ToolPanel t={t} tool={tool("vw", Store)} />
        </div>
      </div>
    </section>
  );
}

/* ── b. Videos ──────────────────────────────────────────────────────── */

export function Videos({
  t,
  locale = "es",
  videos = LANDING_VIDEOS[locale],
}: {
  t: T;
  locale?: LandingLocale;
  videos?: readonly LandingVideo[];
}) {
  const p = locale;
  const k = `${p}.videos`;
  const cards = videos.filter((v) => v.published);
  if (cards.length === 0) return null;
  const item = cardWidth(cards.length);
  return (
    <section className="py-20 md:py-28" aria-labelledby={`${k}-heading`} data-testid={`${p}-videos`}>
      <div className="container px-6">
        <SectionHead t={t} k={k} />
        <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
          {cards.map((video, i) => {
            const base = `/videos/${p}/${video.file}`;
            const captionId = `${p}-video-${i + 1}-caption`;
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
                  {/* Subtitles are burned into the picture: the track is offered, never on by default. */}
                  <track kind="captions" srcLang={SETUP[p].captionsLang} label={t(`${k}.captions`)} src={`${base}.vtt`} />
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

function Stages({ t, p }: { t: T; p: LandingLocale }) {
  const k = `${p}.stages`;
  return (
    <section className="py-20 md:py-28 bg-secondary/20 border-y border-border" aria-labelledby={`${k}-heading`}>
      <div className="container px-6">
        <SectionHead t={t} k={k} />
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
                      {t(`${k}.stage`)} {n}
                    </span>
                    <h3 className="text-base font-display mb-2 leading-snug">{t(`${k}.s${n}.title`)}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-body">{keepWhole(t(`${k}.s${n}.desc`))}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          </div>

          {/* The plan: each thirty days covers two stages (PLAN_WINDOWS). */}
          <div className="mt-10 lg:mt-12" aria-labelledby={`${p}-plan-heading`}>
            <h3 id={`${p}-plan-heading`} className="text-center text-base font-display mb-4">
              {t(`${k}.plan.title`)}
            </h3>
            <ol className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
              {[1, 2, 3].map((n) => (
                <li
                  key={n}
                  className="rounded-xl border border-accent/40 bg-accent/10 px-5 py-4 flex flex-col lg:items-center lg:text-center"
                >
                  <span className="text-sm font-display text-accent">{t(`${k}.plan.p${n}.days`)}</span>
                  <span className="text-sm font-body text-foreground/85">{t(`${k}.plan.p${n}.stages`)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-center text-sm text-muted-foreground font-body">{t(`${k}.plan.note`)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── d. Where it is hosted ──────────────────────────────────────────── */

const LETTERS = "abcdefghij";

const linkClass =
  "mt-auto inline-flex items-center gap-2 self-start text-sm font-medium text-accent hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card";

function Ways({ t, p, setup }: { t: T; p: LandingLocale; setup: LocaleSetup }) {
  const k = `${p}.ways`;
  // Three ways sit in a plain three-column grid; any other count wraps,
  // centred, three to a line on wide screens.
  const grid = setup.ways.length === 3;
  const width = grid ? "" : `${cardWidth(setup.ways.length)} `;
  return (
    <section className="py-20 md:py-28" aria-labelledby={`${k}-heading`}>
      <div className="container px-6">
        <SectionHead t={t} k={k} />
        <div
          className={
            grid
              ? "grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
              : "flex flex-wrap justify-center gap-6 max-w-6xl mx-auto"
          }
        >
          {setup.ways.map(({ icon: Icon, action, href }, i) => {
            const n = i + 1;
            const letter = LETTERS[i];
            const title = t(`${k}.w${n}.title`);
            return (
              <article key={letter} className={`${width}paper-card flex flex-col`}>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <span className="text-3xl font-display text-muted-foreground" aria-hidden="true">{letter}</span>
                </div>
                <h3 className="text-lg font-display mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-body mb-5">{t(`${k}.w${n}.desc`)}</p>
                {action === "mail" && (
                  <a
                    href={`mailto:${brand.supportEmail}?subject=${encodeURIComponent(t(`${k}.w${n}.subject`))}`}
                    className={linkClass}
                  >
                    <Mail className="w-4 h-4" aria-hidden="true" />
                    {t(`${k}.request`)}
                    <span className="sr-only">: {title}</span>
                  </a>
                )}
                {action === "link" && href && (
                  <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    {t(`${k}.w${n}.link`)}
                    <span className="sr-only">: {title}</span>
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

interface LandingSectionsProps {
  t: T;
  locale: LandingLocale;
  /** For tests; the page uses the configured list. */
  videos?: readonly LandingVideo[];
}

export default function LandingSections({ t, locale, videos = LANDING_VIDEOS[locale] }: LandingSectionsProps) {
  const setup = SETUP[locale];
  return (
    <>
      <Suite t={t} p={locale} setup={setup} />
      <Videos t={t} locale={locale} videos={videos} />
      <Stages t={t} p={locale} />
      <Ways t={t} p={locale} setup={setup} />
      {setup.logos && <CustomerLogos t={t} />}
    </>
  );
}
