// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Generates prisma/migrations/<ts>_structured_answers_and_template_provenance.
 * Run once to (re)produce the migration.sql from the v2 template config, so the
 * committed SQL is a faithful snapshot of ASSESSMENT_TEMPLATES_V2. Additive
 * only: new columns and new rows; nothing is dropped, renamed or retyped.
 *
 *   npx tsx scripts/gen-structured-answers-migration.ts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ASSESSMENT_TEMPLATES_V2, serializeSections } from "../src/config/assessment-templates-v2";

const DIR = "20260926120000_structured_answers_and_template_provenance";

const sqlStr = (s: string) => `'${s.replace(/'/g, "''")}'`;
const jsonb = (v: unknown) => `${sqlStr(JSON.stringify(v))}::jsonb`;

const v1Ids = ASSESSMENT_TEMPLATES_V2.map((t) => t.supersedes);

const inserts = ASSESSMENT_TEMPLATES_V2.map((t) => {
  const sections = jsonb(serializeSections(t));
  return `INSERT INTO "ai_assessment_templates"
  ("id", "organizationId", "name", "type", "description", "sections", "frameworkRef", "isSystem", "version", "supersededAt", "createdAt", "updatedAt")
VALUES
  (${sqlStr(t.id)}, NULL, ${sqlStr(t.name.en)}, '${t.type}', ${sqlStr(t.description.en)}, ${sections}, ${t.frameworkRef ? sqlStr(t.frameworkRef) : "NULL"}, true, 2, NULL, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;`;
}).join("\n\n");

const sql = `-- Structured (v2) assessment templates + template-item provenance.
--
-- The consultant's point: a regulator reading a registration looks for
-- keywords, and free text hides them. v2 of the five system templates turns
-- every question a regulator reads into a structured one (choice / checklist /
-- scale / yes-no / date), each with an optional note, and carries the help
-- inside the question JSON. Reports render the labelled values.
--
-- Also adds the provenance quad to ai_systems / ai_vendors / ai_assessments so
-- "Remove all template items" can clear the rows an industry template created
-- silently, but only the ones nobody has edited.
--
-- ADDITIVE ONLY. New nullable/defaulted columns; new rows (v2 templates). No
-- table, column, type or row is dropped, renamed or retyped. Existing rows keep
-- their values; only the five v1 SYSTEM template rows receive a supersededAt so
-- new assessments pick v2 while existing assessments keep their v1 template.

-- 1. AIAssessmentTemplate: version + supersededAt (both nullable).
ALTER TABLE "ai_assessment_templates"
  ADD COLUMN "version" INTEGER,
  ADD COLUMN "supersededAt" TIMESTAMP(3);

-- 2. Provenance quad on the three template-created record types. Defaults to
--    USER_ENTERED so every pre-existing row is already correct and is never
--    removed automatically. The Provenance enum already exists.
ALTER TABLE "ai_systems"
  ADD COLUMN "provenance" "Provenance" NOT NULL DEFAULT 'USER_ENTERED',
  ADD COLUMN "sourceRef" TEXT,
  ADD COLUMN "confirmedBy" TEXT,
  ADD COLUMN "confirmedAt" TIMESTAMP(3);

ALTER TABLE "ai_vendors"
  ADD COLUMN "provenance" "Provenance" NOT NULL DEFAULT 'USER_ENTERED',
  ADD COLUMN "sourceRef" TEXT,
  ADD COLUMN "confirmedBy" TEXT,
  ADD COLUMN "confirmedAt" TIMESTAMP(3);

ALTER TABLE "ai_assessments"
  ADD COLUMN "provenance" "Provenance" NOT NULL DEFAULT 'USER_ENTERED',
  ADD COLUMN "sourceRef" TEXT,
  ADD COLUMN "confirmedBy" TEXT,
  ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- 3. Seed the five v2 templates (idempotent: skip if the id already exists).
${inserts}

-- 4. Retire the v1 SYSTEM templates for NEW assessments only. Guarded on
--    supersededAt IS NULL so a re-run never moves the date, and scoped to the
--    five known ids and isSystem so no org-authored template is touched.
UPDATE "ai_assessment_templates"
SET "version" = 1, "supersededAt" = NOW()
WHERE "id" IN (${v1Ids.map(sqlStr).join(", ")})
  AND "isSystem" = true
  AND "supersededAt" IS NULL;
`;

const dir = join("prisma", "migrations", DIR);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "migration.sql"), sql);
console.log(`Wrote ${join(dir, "migration.sql")} (${sql.length} bytes)`);
