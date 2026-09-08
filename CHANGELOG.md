# Changelog

All notable changes to AI SENTINEL are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org).

## [Unreleased]

### Added

- **Vendor supply chain.** The catalog has carried structured subprocessor
  lists for 254 vendors (604 entries cross-linked to other catalog vendors)
  without showing them anywhere. Three surfaces now read them: a supply-chain
  card on each catalog entry, with the reverse view of which catalog vendors
  depend on that entry and which of them are already among your vendors; a
  supply-chain tab on the vendor risk detail page that marks the subprocessors
  you already govern; and a shared-subprocessors card on the vendor risk list
  showing the providers that sit beneath more than one of your vendors. The
  Annex IV draft now receives the system vendor's subprocessor list for
  section 2 (third-party components) and section 3 (processing locations).
  Pure helpers in `src/lib/supply-chain.ts` tolerate the column's older
  shapes; EN and ES strings added.

### Changed

- **The hosted instance is a real product, not a demo.** The fictional
  organisation, its user and all sample rows were removed from the cloud
  database; every feature is enabled there through the explicit
  `NEXT_PUBLIC_ALL_SKILLS_FREE=true` build flag. Sample data remains opt-in
  for local development via `DEMO_SEED=true`. README and runbook wording
  updated to match.

### Fixed

- **The migrator could not upgrade a db-push-era install.** The pre-baseline
  check in `deploy/sovereign/migrate.sh` ran from `/tmp`, where `require` could
  not find the generated Prisma client, and it looked for a table named `User`
  when the table is `users`. Both faults made the check answer "no baseline
  needed", so `prisma migrate deploy` then stopped with P3005 on any database
  created before the `0_init` baseline. Verified against the published
  `v0.2.5` migrator: a 0_init-shaped database with users is now baselined,
  receives the nine later migrations and the content refresh, and a second run
  is a no-op. Clean installs and already-migrated installs are unchanged.

## [0.2.5] - 2026-08-27

Covers everything since the 1.0.0 baseline below: the `v0.1.x` and `v0.2.x`
tags in between were release tags only and were never recorded here separately.

### Fixed

- **California requirements could never attach to anything.** Nothing wrote the
  organisation's CCPA screening answers: no mutation accepted them and no page
  collected them, so every organisation stayed at "business threshold not
  answered" and none of the 92 seeded California requirements could be mapped.
  The ADMT panel sent users to Settings to answer a question that was not there.
  Adds the `admt.setOrgFacts` mutation and a California screening card, shown
  once a Californian nexus is declared.
- **Article 11 duties could attach to systems that are not ADMT.** Compliance
  mappings were selected with `hasSome` over the raw scope tags. Every
  California row carries `jurisdiction:US_CA` and every positive scope emits it,
  so the jurisdiction tag alone matched everything and the Article tags never
  narrowed the set. The matrix already stripped jurisdiction tags before
  matching; the mutation that writes the record did not. Both now share one
  implementation in `src/lib/applicability-scope.ts`, and `lint:security`
  rejects `hasSome` on `applicabilityTags`.
- **Cybersecurity audits attached on revenue band alone.** Article 9 applies
  under § 7120(b) — 50% or more of revenue from selling or sharing personal
  information, or the § 1798.140(d)(1)(A) threshold together with 250,000
  consumers/households or 50,000 consumers' sensitive data. Revenue band only
  selects the § 7121(a) phase-in tier once a business is already in scope.
  Adds `resolveCyberAuditScope` and the three screening facts it needs; ruling
  the duty out requires closing both limbs, so one unanswered fact stays
  undetermined rather than resolving to "no".
- Superseded cross-framework mappings are now pruned. Upserting alone left
  rows behind when a mapping was re-pointed, so an upgraded database disagreed
  with a fresh install about which article a duty cites.
- Self-hosted installations never received regulatory content updates: the
  content seeds ran on first boot only, and the migrator image was missing
  `src/config` and `tsconfig.json`, so they could not have run at all.

### Changed

- California content verified line-by-line against the OAL-approved text
  (approved 22 September 2025, effective 1 January 2026). Corrections, both
  locales: § 7152(a)(9) gains the "except for legal counsel who provided legal
  advice" carve-out; § 7222(e) no longer states that § 7221(f) forbids verifying
  an opt-out, which forbids *requiring a verifiable consumer request*; § 7102
  uses the statutory verbs rather than "handles".
- `ca-7222-b-2 → eu-art--86` downgraded from equivalent to partial. EU Art. 86
  confers an explanation of the role of the system and the main elements of the
  decision, not the logic or parameters that § 7222(b)(2) requires.
- The Colorado SB 26-189 milestone records the pending federal challenge and
  enforcement stay. The 1 January 2027 date is unchanged — it is the statutory
  one.
- Release procedure documented in `docs/releasing.md`, including the step most
  easily missed: hosted does not run the content seeds on deploy.

### Security

- Cleared all 29 known dependency vulnerabilities (3 critical, 16 high). `npm audit`
  is clean for both the production and development trees.
- Next.js 16.1.4 to 16.3.1, resolving the Next, postcss and sharp advisories,
  including middleware/proxy bypass, Server Actions CSRF and RSC cache poisoning.
- `@auth/core` pinned to the patched 0.41.3 via an override. The Prisma adapter
  hard-pins a release carrying three critical Auth.js advisories (homoglyph email
  bypass, `getToken()` uncaught exception, and OAuth state/nonce/PKCE cookies not
  being bound to the provider that created them). The override takes the fix without
  the Auth.js v5 migration, as `@auth/core` is a type-only dependency of the adapter.
- nodemailer to 9.0.5 and esbuild to 0.28.x (the latter via an override, as `tsx` and
  `vite` both pin a vulnerable release).

### Changed

- Payments and self-service billing removed from the hosted posture. When billing is disabled (NEXT_PUBLIC_STRIPE_ENABLED=false), the previously-premium assessments (Conformity, Bias and Fairness) and the Shadow AI and Vendor Catalog add-ons are available to everyone without an entitlement record. The premium value moves to LQAI skill downloads; the in-app paid gates stay dormant behind the feature flag and remain reversible if billing is switched back on.

## [1.0.0] - 2026-07-05

This heading predates the release-tag series, which began at `v0.1.0` on
2026-07-11; 1.0.0 was a repository-quality milestone and was never tagged.
Releases are numbered from the tag series, which is why the entry above it
is 0.2.5.

First public release of AI SENTINEL, an AI governance registry for the EU AI
Act (Reg. (EU) 2024/1689), NIST AI RMF and ISO/IEC 42001, in English and
Spanish (880/880 translation keys at parity).

### Product

- AI system registry with model and data-source inventories
- EU AI Act risk classification wizard with Annex III guidance
- Assessments: FRIA, AI Risk, Conformity (Annex VI/VII), Bias and Fairness
- Compliance mapping across EU AI Act, NIST AI RMF and ISO/IEC 42001 with
  41 cross-framework mappings and evidence tracking
- Human oversight gates and decision logging
- AI incident management with timelines, tasks and notification tracking
- Vendor risk management plus a curated AI vendor catalog and a 67-tool
  Shadow AI discovery catalog
- Policy management with versioning and system links
- PDF exports (system register, assessment portfolio, compliance summary,
  model inventory)
- Multi-tenant with role-based access control (OWNER to VIEWER), full audit
  trail, premium feature entitlements (Stripe on the hosted tier)
- Sovereign self-host bundle under `deploy/sovereign/` (Docker Compose,
  content-only first-run seed, encrypted backups, optional TLS)

### Security and content overhaul (2026-07-05)

- Removed all internal-operator residue from the auth path and seeds;
  demo data is now strictly opt-in behind `DEMO_SEED=true`
- Removed third-party analytics from the application shell
- Untracked local environment files and hardened `.gitignore`
- Full citation pass over the seeded EU AI Act content: article numbering
  aligned to the final Regulation (EU) 2024/1689, Annex III classifications
  corrected in the industry quick-start templates
- Vendor and tool catalogs: removed fabricated verification provenance,
  dated the data, refreshed stale entries

### Repo and operations

- LICENSE (AGPL-3.0), README, NOTICES, this changelog
- ESLint flat config, vitest test suite (org isolation, auth callback,
  seed gate), GitHub Actions CI
- Prisma baseline migration (`prisma/migrations/0_init`); sovereign updates
  now use `prisma migrate deploy`
- `/api/health` endpoint and Docker healthcheck for the app container
