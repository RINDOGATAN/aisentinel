// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Sets an organisation's hosted plan. Operator use only: there is no screen
 * for it. Payment is collected outside the app (an invoice, or the payment
 * link, whose confirmed payment can also set the plan automatically when
 * AUTO_UPGRADE_ENABLED is on; see src/server/services/plan-eu/sync.ts).
 *
 * A DRY RUN BY DEFAULT: without --execute it prints before and after and
 * writes nothing.
 *
 *   npm run db:set-org-plan -- --org <id or slug> --plan EU_CLOUD \
 *     --started 2026-10-12 --renews 2026-11-12 --note "invoice in_..."
 *   npm run db:set-org-plan -- --org <id or slug> --plan EU_CLOUD \
 *     --started 2026-10-12 --renews 2026-11-12 --note "invoice in_..." --execute
 *
 * Options:
 *   --org      the organisation's id or slug (required)
 *   --plan     EU_CLOUD (paid: the pilot limits and editing window do not
 *              apply) or PILOT (back to the free, capped pilot; clears the
 *              payment subscription of an automatic upgrade; nothing the
 *              organisation holds is deleted) (required)
 *   --started  start of the paid plan, YYYY-MM-DD (UTC) or an ISO time;
 *              default: kept if already paid, else now; "none" clears it
 *   --renews   next renewal, same format; informative only (nothing expires
 *              on its own); default: kept if already paid; "none" clears it
 *   --note     the operator's reference, e.g. an invoice id; "none" clears it
 *   --by       who is making the change, for the audit entry (default
 *              "operator")
 *   --execute  write the change (without it: a dry run, nothing written)
 *   --dry-run  accepted and redundant (the default); refused with --execute
 *
 * Prints the organisation, the plan before and after, and whether it wrote.
 * A real run writes the change and one audit-trail entry (PLAN_CHANGE) in a
 * single transaction. Exit codes: 0 done (or nothing to change), 1 refused
 * input, 2 unexpected error.
 */

import { PrismaClient } from "@prisma/client";
import {
  isPlan,
  PlanInputError,
  setOrganizationPlan,
  type PlanState,
  type SetPlanInput,
} from "../src/server/services/pilot/plan";

export function parseDateArg(name: string, value: string | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === "none") return null;
  const text = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) throw new PlanInputError(`--${name}: not a date: ${value}`);
  return d;
}

export function parseArgs(argv: string[]): SetPlanInput {
  const values: Record<string, string> = {};
  let execute = false;
  let explicitDryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--execute") {
      execute = true;
      continue;
    }
    if (a === "--dry-run") {
      explicitDryRun = true;
      continue;
    }
    if (!a.startsWith("--")) throw new PlanInputError(`Unexpected argument: ${a}`);
    const name = a.slice(2);
    if (!["org", "plan", "started", "renews", "note", "by"].includes(name)) {
      throw new PlanInputError(`Unknown option: ${a}`);
    }
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new PlanInputError(`${a} needs a value.`);
    values[name] = v;
    i++;
  }
  if (execute && explicitDryRun) throw new PlanInputError("Give --execute or --dry-run, not both.");
  if (!values.org) throw new PlanInputError("--org is required (id or slug).");
  const plan = (values.plan ?? "").toUpperCase();
  if (!isPlan(plan)) throw new PlanInputError("--plan must be EU_CLOUD or PILOT.");
  return {
    org: values.org,
    plan,
    startedAt: parseDateArg("started", values.started),
    renewsAt: parseDateArg("renews", values.renews),
    note: values.note === undefined ? undefined : values.note === "none" ? null : values.note,
    operator: values.by ?? "operator",
    dryRun: !execute,
  };
}

function show(label: string, s: PlanState): string {
  const d = (x: Date | null) => (x ? x.toISOString() : "-");
  return [
    `${label}:`,
    `  plan           ${s.plan}`,
    `  planStartedAt  ${d(s.planStartedAt)}`,
    `  planRenewsAt   ${d(s.planRenewsAt)}`,
    `  planNote       ${s.planNote ?? "-"}`,
    `  subscription   ${s.planStripeSubscriptionId ?? "-"}`,
  ].join("\n");
}

async function main(): Promise<number> {
  let input: SetPlanInput;
  try {
    input = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
  const prisma = new PrismaClient();
  try {
    const result = await setOrganizationPlan(prisma, input);
    const o = result.organization;
    console.log(`Organisation: ${o.name} (id ${o.id}, slug ${o.slug})`);
    console.log(show("Before", result.before));
    console.log(show("After", result.after));
    if (!result.changed) console.log("Nothing to change.");
    else if (input.dryRun) console.log("Dry run: nothing written. Add --execute to write the change.");
    else console.log("Written, with one audit-trail entry (PLAN_CHANGE).");
    return 0;
  } catch (err) {
    if (err instanceof PlanInputError) {
      console.error(err.message);
      return 1;
    }
    console.error(err);
    return 2;
  } finally {
    await prisma.$disconnect();
  }
}

// Run only when executed, not when a test imports the parser.
if (process.argv[1] && /set-org-plan\.ts$/.test(process.argv[1])) {
  main().then((code) => process.exit(code));
}
