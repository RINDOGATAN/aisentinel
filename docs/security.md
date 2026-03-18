# AI SENTINEL Security Safeguards

This document describes the security controls, safeguards, and threat mitigations implemented in AI SENTINEL. It is organized by category and references specific code locations.

---

## 1. Multi-Tenant Data Isolation

AI SENTINEL is a multi-tenant SaaS application. Every data model containing customer data includes an `organizationId` foreign key and all queries are scoped through the `organizationProcedure` middleware.

### Architecture

All 10+ tRPC governance routers use `organizationProcedure` (read) or `orgWriteProcedure` (write) which both enforce:

1. **Authentication** — user must have a valid session
2. **Organization membership** — user must be a member of the requested organization (verified via `OrganizationMember` table lookup)
3. **Org-scoped queries** — all Prisma queries filter by `ctx.organization.id` (the verified org ID from the middleware, NOT the raw input)

**Key file**: `src/server/trpc.ts`

### Safeguards

| Control | Description | Location |
|---------|-------------|----------|
| Org middleware | Verifies membership before any org-scoped operation | `src/server/trpc.ts:63-106` |
| Query scoping | All `findMany`, `findFirst`, `count` queries include `organizationId: ctx.organization.id` | All routers in `src/server/routers/governance/` |
| Member operations | `updateMember` and `removeMember` verify target member belongs to the caller's org | `organization.ts` |
| Policy system links | `linkSystem`/`unlinkSystem` verify both policy and system belong to the caller's org | `policy.ts` |
| Risk classification | `getById`, `getHistory`, and `classify` all scope queries by `organizationId` | `riskClassification.ts` |

### Global (non-org-scoped) tables

These tables are intentionally shared across all orgs:

- `ComplianceFramework` and `ComplianceRequirement` — reference data (EU AI Act, NIST, ISO 42001)
- `ShadowAITool` — shared catalog of 36+ AI tools
- `VendorCatalog` — shared vendor directory from Vendor.Watch
- `AIAssessmentTemplate` — system-level templates (org templates are org-scoped)

---

## 2. Role-Based Access Control (RBAC)

### Role Hierarchy

```
OWNER > ADMIN > AI_OFFICER > MEMBER > VIEWER
```

### Write Protection

All mutation endpoints (create, update, delete) use `orgWriteProcedure` which blocks the `VIEWER` role from performing any write operations.

**Key file**: `src/server/trpc.ts` — `enforceWriteAccess` middleware

### Elevated RBAC

Certain sensitive operations require `OWNER`, `ADMIN`, or `AI_OFFICER` roles:

| Operation | Minimum Role | Location |
|-----------|-------------|----------|
| Add org member | ADMIN | `organization.ts:addMember` |
| Update member role | OWNER | `organization.ts:updateMember` |
| Remove org member | ADMIN | `organization.ts:removeMember` |
| Make oversight decisions | AI_OFFICER | `oversight.ts:addDecision` |
| Approve assessments | AI_OFFICER | `assessment.ts:processApproval` |
| Publish policy versions | AI_OFFICER | `policy.ts:publishVersion` |
| Approve policies | AI_OFFICER | `policy.ts:approve` |

### Procedure Types

| Procedure | Auth | Org Check | Write Check | Use Case |
|-----------|------|-----------|-------------|----------|
| `publicProcedure` | No | No | No | Reference data (frameworks, requirements) |
| `protectedProcedure` | Yes | No | No | User-level operations (list orgs, create org) |
| `organizationProcedure` | Yes | Yes | No | Read operations (list, getById, getStats) |
| `orgWriteProcedure` | Yes | Yes | Yes (blocks VIEWER) | All mutations (create, update, delete) |
| `adminProcedure` | Yes | Platform admin | No | Platform admin operations |

---

## 3. Authentication

### Providers

| Provider | Environment | Guard |
|----------|-------------|-------|
| Dev Credentials | Development only | `NODE_ENV === "development"` AND `DISABLE_DEV_AUTH !== "true"`. Additional runtime block checks `VERCEL_ENV !== "production"` |
| Cross-Login SSO | All | JWT verification (`CROSS_LOGIN_SECRET`) or Google token verification |
| Google OAuth | All (when configured) | Standard OAuth 2.0 flow with `state` check |
| Email Magic Link | All (when configured) | Resend email delivery |

**Key file**: `src/lib/auth.ts`

### Session Security

- **Strategy**: JWT-based sessions
- **Cookie naming**: `__Secure-aisentinel.session-token` (production), `aisentinel.session-token` (development)
- **Cookie flags**: `httpOnly: true`, `sameSite: "lax"`, `secure: true` (production)
- **Domain scoping**: `.todo.law` in production (allows cross-subdomain SSO)
- **CSRF token**: Separate `aisentinel.csrf-token` cookie

### Domain-Based Auto-Join

When a user signs in, their email domain is matched against `Organization.domain`. If matched, they are automatically added as `MEMBER` role. This is logged in the audit trail.

### Internal Domain Entitlements

The `privacycloud.com` email domain auto-provisions all premium entitlements. This is a controlled internal access mechanism for the platform operator.

---

## 4. Input Validation

### Zod Schema Validation

All tRPC inputs are validated using Zod schemas before reaching business logic. Enum fields use strict `z.enum()` validation matching Prisma enum values:

| Router | Validated Enums |
|--------|----------------|
| `aiSystem` | `AITechnique` (12 values), `AISystemRole` (5), `AISystemStatus` (5) |
| `incident` | `AIIncidentType` (11), `IncidentSeverity` (4), `IncidentStatus` (5), `TaskStatus` (3), `NotificationStatus` (3) |
| `vendor` | `VendorRiskLevel` (4), `VendorStatus` (5), `VendorAssessmentStatus` (4) |
| `oversight` | `GateType` (5), `GateStatus` (5), `OversightDecisionType` (3) |
| `policy` | `PolicyType` (9), `PolicyStatus` (5) |
| `assessment` | `AIAssessmentType` (5), `AssessmentStatus` (5) |
| `riskClassification` | `AIRiskLevel` (4) |
| `compliance` | `ComplianceStatus` (5), `EvidenceType` (8) |

### SQL Injection Prevention

- Prisma ORM provides parameterized queries for all database operations
- No raw SQL (`$queryRaw`) is used anywhere in the codebase
- Search inputs use Prisma's `contains` operator with `mode: "insensitive"`, which is safe

### String Length Limits

All user-facing text inputs have length constraints:
- Names: `z.string().min(1).max(200)` or `.max(300)`
- Free-text descriptions: `z.string().min(1)` (Prisma `@db.Text` handles storage)

---

## 5. HTTP Security Headers

Configured in `next.config.ts`:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer leakage |
| `X-DNS-Prefetch-Control` | `on` | Performance optimization |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unnecessary browser APIs |

---

## 6. API Surface Protection

### External API Routes

| Route | Auth Method | Purpose |
|-------|-------------|---------|
| `/api/trpc/*` | NextAuth JWT session | All tRPC endpoints |
| `/api/auth/*` | NextAuth built-in | Authentication flows |
| `/api/billing/portal` | NextAuth session | Stripe billing portal redirect |
| `/api/catalog/sync` | Bearer token (`CRON_SECRET`) | Vendor catalog cron sync |
| `/api/import/portfolio-vendors` | API key (`IMPORT_API_KEY`) | Vendor portfolio import |
| `/api/stripe/webhook` | Stripe webhook signature verification | Payment webhooks |

### Webhook Verification

Stripe webhooks verify signatures using `verifyWebhookSignature` before processing any payment events.

### Cron Endpoint Protection

The vendor catalog sync endpoint (`/api/cron/sync-catalog`) requires a `Bearer` token matching `CRON_SECRET` from environment variables.

---

## 7. Audit Trail

### AuditLog Model

All create, update, delete, and significant business operations are logged to the `AuditLog` table:

```
organizationId, userId, entityType, entityId, action, changes (JSON), createdAt
```

### Logged Operations

- Organization membership changes (add, remove, auto-join)
- AI system CRUD
- Risk classification changes
- Assessment lifecycle (create, submit, approve/reject)
- Oversight decisions
- Incident lifecycle
- Policy changes and approvals
- Vendor management
- Shadow AI reports
- Compliance mapping updates

### Audit Log Retention

Audit logs use `onDelete: SetNull` for the organization and user foreign keys, preserving log entries even if the referenced org or user is deleted.

---

## 8. Data Protection

### Sensitive Data Categories

| Category | Fields | Protection |
|----------|--------|------------|
| OAuth tokens | `Account.refresh_token`, `access_token`, `id_token` | Stored as `@db.Text` by NextAuth adapter |
| Vendor contacts | `AIVendor.contactEmail`, `contactName` | Org-scoped access only |
| Incident details | `AIIncident.description`, `rootCauseDescription`, `impactDescription` | Org-scoped, RBAC-protected |
| Assessment responses | `AIAssessment.responses`, `mitigations` | Org-scoped, RBAC-protected |
| Policy content | `AIPolicy.content`, `AIPolicyVersion.content` | Org-scoped, RBAC-protected |
| Billing identifiers | `Customer.stripeCustomerId` | Opaque Stripe IDs, org-scoped |
| License keys | `SkillEntitlement.licenseKey` | CUIDs (not cryptographic secrets) |

### Data Cascade Behavior

Deleting an AI system cascades to all related records:
- Models, data sources, risk classifications
- Assessments, oversight gates, compliance mappings
- Policy system links

This is by design — removing a system from the registry removes all governance artifacts. The `VIEWER` role cannot trigger deletions (blocked by `orgWriteProcedure`).

### Robots.txt

The `robots.txt` blocks crawlers from accessing:
- `/api/` — all API endpoints
- `/sign-in` — authentication pages
- `/verify-request` — email verification
- `/governance/` — all dashboard pages

---

## 9. Premium Feature Gating

Premium features (Shadow AI, Vendor Catalog, Conformity Assessment, Bias & Fairness) are gated by the entitlement service at `src/server/services/licensing/`.

- Entitlements are checked at the tRPC router level before any data access
- Each premium router calls `checkAccess()` / `checkAssessmentEntitlement()` before proceeding
- Entitlements are stored in `SkillEntitlement` linked to `Customer` and `SkillPackage`
- Support for `SUBSCRIPTION`, `PERPETUAL`, and `TRIAL` license types

---

## 10. Known Limitations and Roadmap

### Implemented

- [x] Multi-tenant org isolation on all queries
- [x] RBAC with VIEWER write protection
- [x] Dev auth production safeguards
- [x] Input validation with Zod enums
- [x] HTTP security headers
- [x] Audit logging for all mutations
- [x] Webhook signature verification
- [x] Cross-tenant isolation on member operations
- [x] Policy link/unlink org verification
- [x] Org-scoped return queries (all `findUnique` after `updateMany` replaced with org-scoped `findFirst`)
- [x] Consistent `updateMany` pattern for mutations (incident tasks/notifications)

### Future Improvements

| Item | Priority | Description |
|------|----------|-------------|
| Rate limiting | HIGH | Add rate limiting on public endpoints, auth flows, and mutation endpoints |
| OAuth token encryption | MEDIUM | Encrypt `Account.refresh_token`/`access_token` at rest |
| Soft delete | MEDIUM | Add `deletedAt` timestamp to critical models (AI systems, assessments) instead of hard delete |
| Column-level encryption | MEDIUM | Encrypt sensitive `@db.Text` fields (incident descriptions, assessment responses) |
| Audit log IP/userAgent | LOW | Populate `ipAddress` and `userAgent` fields in audit log entries |
| Data retention policies | LOW | Implement anonymization schedule for audit logs and PII |
| Content Security Policy | LOW | Add CSP headers for additional XSS protection |
| Session rotation | LOW | Implement JWT rotation with shorter `maxAge` |
| Domain auto-join approval | LOW | Require admin approval for domain-matched organization joins |

---

## OWASP Top 10 Coverage

| # | Category | Status | Notes |
|---|----------|--------|-------|
| A01 | Broken Access Control | **Mitigated** | Org isolation, RBAC, member scoping |
| A02 | Cryptographic Failures | Partial | OAuth tokens in plaintext (NextAuth default) |
| A03 | Injection | **Mitigated** | Prisma parameterized queries, no raw SQL |
| A04 | Insecure Design | Partial | No rate limiting yet |
| A05 | Security Misconfiguration | **Mitigated** | Security headers, env-guarded dev auth |
| A06 | Vulnerable Components | Monitor | Run `npm audit` regularly |
| A07 | Auth Failures | **Mitigated** | Multi-provider auth, session cookies, CSRF |
| A08 | Data Integrity | **Mitigated** | Stripe webhook verification, Zod validation |
| A09 | Logging & Monitoring | Partial | Audit log exists, no real-time alerting |
| A10 | SSRF | **Mitigated** | No user-controlled URLs in server requests |
