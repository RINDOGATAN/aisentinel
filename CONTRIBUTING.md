# Contributing to AI SENTINEL

Thanks for considering a contribution. AI SENTINEL is a cross-border AI
governance registry (Next.js App Router + tRPC + Prisma + PostgreSQL),
licensed AGPL-3.0-or-later. The same codebase serves the hosted instance and
the sovereign self-host bundle, so every change must keep both paths working.

## Development setup

```bash
npm install
cp deploy/sovereign/.env.example .env   # or craft your own; never commit .env*
npx prisma generate
npx prisma migrate deploy               # or `db push` for a scratch DB
npm run db:seed                         # content-only unless DEMO_SEED=true
npm run dev                             # http://localhost:3003
```

You need Node.js 20+ and a PostgreSQL database. The datasource variable is
`ais_DATABASE_URL` (a Vercel-integration prefix; the sovereign compose file
synthesizes it for you). `CLAUDE.md` carries the new-module checklist: read it
before touching auth, the tRPC procedure layer, or the seeded governance
content.

## Quality gates

All of these must pass before a PR is mergeable (CI runs them):

```bash
npm run lint          # eslint 9 flat config; keep it green, no blanket ignores
npm run lint:security # bespoke org-isolation / RBAC convention linter
npx tsc --noEmit      # typecheck
npm test              # vitest
npm run build         # prisma generate + next build
```

`lint:security` is not optional. It enforces the multi-tenant conventions
(mutations go through `orgWriteProcedure`; no unscoped `findUnique`; `z.enum`
over `z.string()` for enums). If it flags your change, fix the pattern rather
than the linter.

## Conventions

- **Multi-tenancy is the security model.** Organization-scoped procedures must
  resolve membership and scope every query by `organizationId`. By-id reads use
  org-scoped `findFirst`; writes use `updateMany`/`deleteMany` with an org
  filter. There are regression tests for this; do not regress them.
- **Auth never grants entitlements.** Sign-in may auto-join a user to a
  matching organization as `MEMBER`, never with elevated roles or premium
  entitlements. A test locks this; keep it locked.
- **i18n:** every user-facing string exists in both `src/messages/en.json` and
  `src/messages/es.json`. EN/ES parity (880/880 keys) is a feature; don't
  regress it.
- **Brand strings:** hosted-brand values (emails, support links, deep links,
  site URL) route through `src/config/brand.ts` so white-label deployments
  don't leak the vendor brand. Don't hardcode `todo.law` addresses in source.
- **Content is legal work-product.** EU AI Act, NIST AI RMF and ISO 42001
  citations must match the final texts (Reg. (EU) 2024/1689 for the AI Act).
  Article-number and Annex changes get a legal review before merge.
- **Logging:** no secrets, tokens, or personal data in logs. Keep request-path
  `console.*` out of `src/`.
- **Commits:** present tense, explain *why* in the body when the diff doesn't.

## Legal content changes

Because this product is used by law firms, changes to the seeded frameworks,
templates, or vendor catalog carry a `lawReviewedAsOf` stamp and should be
listed verbatim in the PR description for counsel sign-off.
