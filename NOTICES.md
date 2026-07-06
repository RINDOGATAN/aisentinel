# NOTICES - Third-Party Acknowledgments

AI SENTINEL is built on open-source software. This ledger acknowledges the
principal direct dependencies and their licenses. Full dependency metadata,
including transitive packages, lives in `package-lock.json`; run
`npx license-checker` for a complete machine-generated report.

All licenses below are permissive (MIT, Apache-2.0 or ISC) and impose no
copyleft obligations on this codebase. AI SENTINEL itself is licensed
AGPL-3.0-or-later (see [LICENSE](LICENSE)).

| Package | Purpose | License |
|---|---|---|
| [Next.js](https://nextjs.org) | Application framework | MIT |
| [React](https://react.dev) / react-dom | UI runtime | MIT |
| [Prisma](https://www.prisma.io) / @prisma/client | ORM and migrations | Apache-2.0 |
| [tRPC](https://trpc.io) (client, server, next, react-query) | Typed API layer | MIT |
| [NextAuth.js](https://next-auth.js.org) + @auth/prisma-adapter | Authentication | ISC |
| [Radix UI](https://www.radix-ui.com) primitives | Accessible UI primitives | MIT |
| [shadcn/ui](https://ui.shadcn.com) | Component patterns built on Radix (vendored under `src/components/ui/`) | MIT |
| [lucide-react](https://lucide.dev) | Icon set | ISC |
| [next-intl](https://next-intl.dev) | Internationalization (EN/ES) | MIT |
| [@react-pdf/renderer](https://react-pdf.org) | PDF report generation | MIT |
| [Tailwind CSS](https://tailwindcss.com) + @tailwindcss/postcss | Styling | MIT |
| [TanStack Query](https://tanstack.com/query) | Client data fetching | MIT |
| [Zod](https://zod.dev) | Schema validation | MIT |
| [superjson](https://github.com/flightcontrolhq/superjson) | tRPC serialization | MIT |
| [react-hook-form](https://react-hook-form.com) + @hookform/resolvers | Forms | MIT |
| [stripe](https://github.com/stripe/stripe-node) | Billing (hosted tier) | MIT |
| [resend](https://github.com/resend/resend-node) | Transactional email (hosted tier) | MIT |
| [jose](https://github.com/panva/jose) | JWT verification | MIT |
| [date-fns](https://date-fns.org) | Date utilities | MIT |
| [sonner](https://sonner.emilkowal.ski) | Toast notifications | MIT |
| [next-themes](https://github.com/pacocoursey/next-themes) | Theme handling | MIT |
| [class-variance-authority](https://cva.style), clsx, tailwind-merge, tw-animate-css | Styling utilities | MIT / Apache-2.0 (cva) |

## Fonts

Jost and Archivo Black are loaded via `next/font/google` and licensed under
the SIL Open Font License 1.1.

## Content sources

The seeded governance corpus (EU AI Act, NIST AI RMF and ISO/IEC 42001
framework structures, assessment templates, tool and vendor catalogs) was
authored for this project. EU legal texts are reproduced from the Official
Journal of the European Union, which is not subject to copyright restriction
(Decision 2011/833/EU). NIST AI RMF material is in the public domain as a
work of the US federal government. ISO/IEC 42001 entries reference clause
numbers and paraphrased summaries only; the standard's text is not
reproduced.
