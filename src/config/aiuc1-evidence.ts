// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AIUC-1 test evidence, per AI agent: which systems are agents, how a test is
 * recorded, what state each requirement is in, and when an agent is ready for
 * the audit.
 *
 * No table of its own. A test is a `ComplianceEvidence` row of type
 * TEST_RESULT on the agent's mapping to the AIUC-1 requirement; its method,
 * result and observations sit in the row's description as a small JSON record
 * (below). Accepting a partial result is a second row, of type APPROVAL, that
 * names the test it accepts. "Not applicable" is the mapping's own status,
 * NOT_APPLICABLE, with the reason in the mapping's notes. Every row is
 * appended, never edited: the router refuses to delete them.
 *
 * The rules, in plain words:
 * - A requirement's state is its LATEST test (by the date of the test): pass,
 *   partial or fail. With no test it is "not tested".
 * - "Not applicable" counts only with a written reason. Without one the
 *   requirement stays applicable and says the reason is missing.
 * - A pass older than three months is due for a retest (AIUC-1 asks for
 *   technical testing at least every three months) and does not count.
 * - A partial counts only when a person has accepted that very test, with a
 *   reason. A newer test needs its own acceptance.
 * - Every requirement is applicable until a person says otherwise, including
 *   the standard's supplemental ones: this product cannot tell an agent's
 *   capabilities from the record, and "ready" must never be claimed by
 *   default.
 * - An agent is ready for the audit when it has at least one applicable
 *   requirement and every applicable one has a current pass or an accepted
 *   partial.
 *
 * Pure module: no Prisma, no React, no Next.
 */

import { autonomyIsAgentic } from "@/config/agent-rules";
import { AIUC1_DOMAINS, type Aiuc1Domain, type Aiuc1Requirement } from "@/config/aiuc1-requirements";

// ---------------------------------------------------------------------------
// Which systems are agents
// ---------------------------------------------------------------------------

/**
 * A system is an agent when the registry says so: its technique is "Agentic
 * AI", or its agent profile says it acts (with approval or on its own). A
 * system that only suggests is not an agent here, as in the agent profile.
 */
export function isAgentSystem(system: {
  technique: string;
  autonomy?: string | null;
}): boolean {
  return system.technique === "AGENTIC_AI" || autonomyIsAgentic(system.autonomy);
}

// ---------------------------------------------------------------------------
// The records
// ---------------------------------------------------------------------------

export const AIUC1_TEST_RESULTS = ["PASS", "PARTIAL", "FAIL"] as const;
export type Aiuc1TestResult = (typeof AIUC1_TEST_RESULTS)[number];

/** Technical testing is repeated at least every three months (AIUC-1). */
export const AIUC1_RETEST_MONTHS = 3;

/** The title prefix every AIUC-1 test row carries: it is how the rows are told apart. */
export const AIUC1_TEST_TITLE_PREFIX = "AIUC-1 test";
export const AIUC1_ACCEPTANCE_TITLE_PREFIX = "AIUC-1 partial accepted";

export interface Aiuc1TestInput {
  code: string;
  /** What was done, concretely enough to repeat. */
  method: string;
  result: Aiuc1TestResult;
  /** What was observed, including what still got through. */
  observed: string | null;
  /** Where the evidence lives: a link, a run id, a file, a ticket. */
  evidenceRef: string | null;
  /** Who ran the test, when not the person recording it (an outside tester). */
  performedBy: string | null;
  testedAt: Date;
}

interface TestPayload {
  kind: "aiuc1-test";
  v: 1;
  code: string;
  method: string;
  result: Aiuc1TestResult;
  observed: string | null;
  evidenceRef: string | null;
  performedBy: string | null;
  testedAt: string;
}

interface AcceptancePayload {
  kind: "aiuc1-acceptance";
  v: 1;
  code: string;
  testId: string;
  reason: string;
}

/** The row a test becomes. `url` is set only for a web link. */
export function testEvidenceRow(input: Aiuc1TestInput): {
  type: "TEST_RESULT";
  title: string;
  url: string | null;
  description: string;
} {
  const payload: TestPayload = {
    kind: "aiuc1-test",
    v: 1,
    code: input.code,
    method: input.method.trim(),
    result: input.result,
    observed: clean(input.observed),
    evidenceRef: clean(input.evidenceRef),
    performedBy: clean(input.performedBy),
    testedAt: input.testedAt.toISOString(),
  };
  const ref = payload.evidenceRef;
  return {
    type: "TEST_RESULT",
    title: `${AIUC1_TEST_TITLE_PREFIX} ${input.code}: ${input.result} (${payload.testedAt.slice(0, 10)})`,
    url: ref && /^https?:\/\//i.test(ref) ? ref : null,
    description: JSON.stringify(payload),
  };
}

/** The row an acceptance of a partial result becomes. */
export function acceptanceEvidenceRow(input: { code: string; testId: string; reason: string }): {
  type: "APPROVAL";
  title: string;
  url: null;
  description: string;
} {
  const payload: AcceptancePayload = {
    kind: "aiuc1-acceptance",
    v: 1,
    code: input.code,
    testId: input.testId,
    reason: input.reason.trim(),
  };
  return {
    type: "APPROVAL",
    title: `${AIUC1_ACCEPTANCE_TITLE_PREFIX} ${input.code}`,
    url: null,
    description: JSON.stringify(payload),
  };
}

function clean(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

/** An evidence row as the database holds it. */
export interface EvidenceRow {
  id: string;
  type: string;
  title: string;
  url: string | null;
  description: string | null;
  addedBy: string;
  addedAt: Date;
}

export interface Aiuc1Test {
  id: string;
  code: string;
  method: string;
  result: Aiuc1TestResult;
  observed: string | null;
  evidenceRef: string | null;
  performedBy: string | null;
  testedAt: Date;
  recordedBy: string;
  recordedAt: Date;
}

export interface Aiuc1Acceptance {
  id: string;
  testId: string;
  reason: string;
  acceptedBy: string;
  acceptedAt: Date;
}

function parseJson(text: string | null): Record<string, unknown> | null {
  if (!text) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/** A test row read back, or null when the row is not an AIUC-1 test. */
export function parseTest(row: EvidenceRow): Aiuc1Test | null {
  if (row.type !== "TEST_RESULT" || !row.title.startsWith(AIUC1_TEST_TITLE_PREFIX)) return null;
  const p = parseJson(row.description);
  if (!p || p.kind !== "aiuc1-test") return null;
  const result = p.result;
  const method = str(p.method);
  const code = str(p.code);
  const testedAt = str(p.testedAt) ? new Date(p.testedAt as string) : null;
  if (
    !code ||
    !method ||
    !AIUC1_TEST_RESULTS.includes(result as Aiuc1TestResult) ||
    !testedAt ||
    Number.isNaN(testedAt.getTime())
  ) {
    return null;
  }
  return {
    id: row.id,
    code,
    method,
    result: result as Aiuc1TestResult,
    observed: str(p.observed),
    evidenceRef: str(p.evidenceRef),
    performedBy: str(p.performedBy),
    testedAt,
    recordedBy: row.addedBy,
    recordedAt: row.addedAt,
  };
}

/** An acceptance row read back, or null. */
export function parseAcceptance(row: EvidenceRow): Aiuc1Acceptance | null {
  if (row.type !== "APPROVAL" || !row.title.startsWith(AIUC1_ACCEPTANCE_TITLE_PREFIX)) return null;
  const p = parseJson(row.description);
  if (!p || p.kind !== "aiuc1-acceptance") return null;
  const testId = str(p.testId);
  const reason = str(p.reason);
  if (!testId || !reason) return null;
  return { id: row.id, testId, reason, acceptedBy: row.addedBy, acceptedAt: row.addedAt };
}

/** A row this module owns: never deleted, never edited. */
export function isAiuc1Record(row: EvidenceRow): boolean {
  return parseTest(row) !== null || parseAcceptance(row) !== null;
}

// ---------------------------------------------------------------------------
// State of one requirement
// ---------------------------------------------------------------------------

/**
 * - `not-tested`      no test yet
 * - `pass`            the latest test passed and is current
 * - `retest`          the latest test passed, more than three months ago
 * - `partial`         the latest test is partial (see `accepted`)
 * - `fail`            the latest test failed
 * - `not-applicable`  a person said so, with a reason
 */
export type RequirementState = "not-tested" | "pass" | "retest" | "partial" | "fail" | "not-applicable";

export interface RequirementInput {
  code: string;
  /** The mapping's status, or null when there is no mapping yet. */
  mappingStatus: string | null;
  mappingNotes: string | null;
  evidence: EvidenceRow[];
}

export interface RequirementView {
  code: string;
  domain: Aiuc1Domain["code"];
  state: RequirementState;
  /** Counts towards readiness (a current pass, or an accepted partial). */
  ready: boolean;
  applicable: boolean;
  /** Marked not applicable, but without a reason: it stays applicable. */
  reasonMissing: boolean;
  notApplicableReason: string | null;
  latest: Aiuc1Test | null;
  /** The acceptance of the latest test, when it is a partial and accepted. */
  acceptance: Aiuc1Acceptance | null;
  /** Every test, newest first. */
  tests: Aiuc1Test[];
  /** Every other evidence item on the mapping (documents, links). */
  otherEvidence: EvidenceRow[];
}

/** The date a test stops counting as current. */
export function retestDue(testedAt: Date): Date {
  const due = new Date(testedAt.getTime());
  due.setUTCMonth(due.getUTCMonth() + AIUC1_RETEST_MONTHS);
  return due;
}

function newestFirst(a: Aiuc1Test, b: Aiuc1Test): number {
  return (
    b.testedAt.getTime() - a.testedAt.getTime() ||
    b.recordedAt.getTime() - a.recordedAt.getTime() ||
    (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
  );
}

export function requirementState(input: RequirementInput, now: Date): RequirementView {
  const tests: Aiuc1Test[] = [];
  const acceptances: Aiuc1Acceptance[] = [];
  const otherEvidence: EvidenceRow[] = [];
  for (const row of input.evidence) {
    const test = parseTest(row);
    if (test) {
      // A row filed under another code (never written by this product) is
      // shown as plain evidence rather than trusted.
      if (test.code === input.code) tests.push(test);
      else otherEvidence.push(row);
      continue;
    }
    const acceptance = parseAcceptance(row);
    if (acceptance) acceptances.push(acceptance);
    else otherEvidence.push(row);
  }
  tests.sort(newestFirst);
  const latest = tests[0] ?? null;
  const acceptance =
    latest && latest.result === "PARTIAL"
      ? (acceptances.find((a) => a.testId === latest.id) ?? null)
      : null;

  const reason = input.mappingNotes?.trim() || null;
  const markedNotApplicable = input.mappingStatus === "NOT_APPLICABLE";
  const notApplicable = markedNotApplicable && reason !== null;

  let state: RequirementState;
  if (notApplicable) state = "not-applicable";
  else if (!latest) state = "not-tested";
  else if (latest.result === "FAIL") state = "fail";
  else if (latest.result === "PARTIAL") state = "partial";
  else state = retestDue(latest.testedAt) > now ? "pass" : "retest";

  return {
    code: input.code,
    domain: input.code.charAt(0) as Aiuc1Domain["code"],
    state,
    ready: state === "pass" || (state === "partial" && acceptance !== null),
    applicable: !notApplicable,
    reasonMissing: markedNotApplicable && reason === null,
    notApplicableReason: notApplicable ? reason : null,
    latest,
    acceptance,
    tests,
    otherEvidence,
  };
}

// ---------------------------------------------------------------------------
// Readiness
// ---------------------------------------------------------------------------

export interface Tally {
  /** Requirements in the standard (in force). */
  total: number;
  applicable: number;
  notApplicable: number;
  /** Applicable requirements with at least one test. */
  tested: number;
  pass: number;
  retest: number;
  partial: number;
  acceptedPartial: number;
  fail: number;
  /** Applicable requirements that count (current pass or accepted partial). */
  ready: number;
  /** At least one applicable requirement, and every one of them counts. */
  readyForAudit: boolean;
}

function tally(views: RequirementView[]): Tally {
  const applicable = views.filter((v) => v.applicable);
  const count = (state: RequirementState) => applicable.filter((v) => v.state === state).length;
  const ready = applicable.filter((v) => v.ready).length;
  return {
    total: views.length,
    applicable: applicable.length,
    notApplicable: views.length - applicable.length,
    tested: applicable.filter((v) => v.tests.length > 0).length,
    pass: count("pass"),
    retest: count("retest"),
    partial: count("partial"),
    acceptedPartial: applicable.filter((v) => v.state === "partial" && v.acceptance).length,
    fail: count("fail"),
    ready,
    readyForAudit: applicable.length > 0 && ready === applicable.length,
  };
}

export interface DomainReadiness extends Tally {
  code: Aiuc1Domain["code"];
  requirements: Array<RequirementView & { requirement: Aiuc1Requirement }>;
}

export interface AgentReadiness {
  domains: DomainReadiness[];
  overall: Tally;
  /** Anything recorded at all: a test, or a requirement marked not applicable. */
  started: boolean;
}

/**
 * Readiness for one agent. `rows` holds what the database has for this agent's
 * AIUC-1 mappings, keyed by requirement code; a requirement with no mapping is
 * simply not tested. The list of requirements is the standard's, from config,
 * so a requirement nobody has touched still counts against readiness.
 */
export function agentReadiness(
  rows: ReadonlyMap<string, Omit<RequirementInput, "code">>,
  now: Date,
): AgentReadiness {
  const domains = AIUC1_DOMAINS.map((domain) => {
    const requirements = domain.requirements.map((requirement) => ({
      requirement,
      ...requirementState(
        {
          code: requirement.code,
          ...(rows.get(requirement.code) ?? { mappingStatus: null, mappingNotes: null, evidence: [] }),
        },
        now,
      ),
    }));
    return { code: domain.code, requirements, ...tally(requirements) };
  });
  const all = domains.flatMap((d) => d.requirements);
  return {
    domains,
    overall: tally(all),
    started: all.some((v) => v.tests.length > 0 || v.state === "not-applicable"),
  };
}

/** Is this code a requirement in force? */
export function isAiuc1Code(code: string): boolean {
  return AIUC1_DOMAINS.some((d) => d.requirements.some((r) => r.code === code));
}

export const AIUC1_CODES = AIUC1_DOMAINS.flatMap((d) => d.requirements.map((r) => r.code)) as [
  string,
  ...string[],
];
