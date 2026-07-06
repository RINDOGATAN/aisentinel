# Changelog

All notable changes to AI SENTINEL are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org).

## [Unreleased]

### Changed

- Payments and self-service billing removed from the hosted posture. When billing is disabled (NEXT_PUBLIC_STRIPE_ENABLED=false), the previously-premium assessments (Conformity, Bias and Fairness) and the Shadow AI and Vendor Catalog add-ons are available to everyone without an entitlement record. The premium value moves to LQAI skill downloads; the in-app paid gates stay dormant behind the feature flag and remain reversible if billing is switched back on.

## [1.0.0] - 2026-07-05

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
