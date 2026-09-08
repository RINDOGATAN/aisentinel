# AI SENTINEL

Cross-border AI governance registry for organizations that deploy or provide AI systems. Register AI systems, classify risk under the EU AI Act (Reg. (EU) 2024/1689), run FRIA and conformity assessments, manage human oversight gates, incidents, vendors and policies. Bilingual EN/ES.

**One assessment, six regimes.** Compliance is mapped across eight frameworks: EU AI Act, GDPR (the AI-relevant articles), NIST AI RMF, ISO/IEC 42001, the California CCPA ADMT regulations, Colorado SB 26-189, Texas TRAIGA and Washington's domain instruments. A single unified impact assessment answers all of them, built as a common core drafted to the strictest formulation among the regimes plus overlays that appear only where a regime applies. From it the product generates a multi-jurisdictional AI notice, a human review and appeal protocol, and an agentic addendum that stress-tests all three against a handoff to an autonomous agent. Regulatory content carries a law-review date and a pending legal sign-off marker.

One codebase, two postures:

- **Hosted**: the cloud instance at [aisentinel.todo.law](https://aisentinel.todo.law). Every feature is included; build your AI governance programme there and move it to your own deployment when the data becomes too sensitive for the cloud.
- **Sovereign**: the same app self-hosted on your own hardware via Docker Compose. See [deploy/sovereign/README.md](deploy/sovereign/README.md).

## Stack

Next.js 16, React 19, tRPC 11, Prisma 5, PostgreSQL, NextAuth, next-intl, Tailwind 4. Runs on port 3003 in development.

## Quickstart (development)

```sh
cp .env.example .env.local        # set ais_DATABASE_URL + NEXTAUTH_SECRET
npm install
npx prisma migrate deploy         # apply schema
npm run db:seed                   # content-only seed (skill packages)
npm run db:seed-frameworks        # EU AI Act, NIST AI RMF, ISO 42001
npm run db:seed-admt              # California CCPA ADMT
npm run db:seed-regimes           # GDPR, Colorado, Texas, Washington
npm run db:seed-templates         # assessment templates
npm run db:seed-shadow-ai-tools   # Shadow AI tool catalog
npm run db:seed-vendor-catalog    # AI vendor catalog
npm run db:seed-cross-mappings    # cross-framework mappings
npm run dev                       # http://localhost:3003
```

Sample data (a fictional organisation, user and systems, for local development only) is opt-in: set `DEMO_SEED=true` before `npm run db:seed`. First-run seeding without that flag is content-only, and the hosted instance carries no fictional data.

To self-host the full stack (Postgres included) with one command, use the sovereign bundle instead: [deploy/sovereign/README.md](deploy/sovereign/README.md).

## Security

Security posture, threat model and known gaps are documented in [docs/security.md](docs/security.md). Multi-tenant isolation conventions are enforced by `npm run lint:security`.

Honest limitations, disclosed there in full: no rate limiting and no Content-Security-Policy header yet. If you expose an instance beyond localhost, read the hardening section of the sovereign README first.

## Quality gates

```sh
npm run lint            # ESLint
npm run lint:security   # multi-tenant convention linter
npx tsc --noEmit        # typecheck
npm test                # vitest (org isolation, auth, seed gate)
npm run build           # production build
```

## License

AGPL-3.0-or-later. Copyright (C) 2026 RINDOGATAN Inc. See [LICENSE](LICENSE).

Under AGPL section 13, anyone who runs a modified version of this software as a network service must offer the corresponding source to its users. The app renders a "Source code (AGPL-3.0)" link in its footer for this purpose; white-label deployments can point it at their own fork via `NEXT_PUBLIC_SOURCE_URL`. Third-party acknowledgments are in [NOTICES.md](NOTICES.md).
