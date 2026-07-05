# AI SENTINEL Demo Video Script

## Prerequisites

```bash
cd /Users/bscan/DEV/aisentinel
npm install                    # needed for framer-motion on landing page
npm run dev                    # starts on port 3002
```

**Demo org**: `acme-ai` (Acme AI Corp)
**Demo user**: `demo@aisentinel.example` (AI_OFFICER role)
**Auth**: Dev Login on sign-in page (development mode only — enter email, click "Dev Sign In")
**Premium**: All 4 skills unlocked with PERPETUAL entitlements

### Seed order (if starting fresh)

```bash
npx prisma db seed
npm run db:seed-frameworks
npm run db:seed-cross-mappings
npm run db:seed-templates
npm run db:seed-shadow-ai-tools
npm run db:seed-vendor-catalog
npm run db:seed-scenarios
npx tsx scripts/seed-demo-entitlements.ts
```

---

## FLOW A: Fresh Quickstart (Clean Org)

Use this flow to show the quickstart from zero. Requires a fresh org without existing systems.
If using the pre-seeded `acme-ai` org, use FLOW B instead.

### Scene 1: Landing Page (10s)

1. Open `http://localhost:3002`
2. Show the hero section — "Future-Proof AI Governance"
3. Scroll briefly past the feature cards (Registry, Risk, Oversight, Incidents)
4. Click "Get Started" or navigate to `/sign-in`

### Scene 2: Sign In (5s)

1. On sign-in page, find the "Dev Login" section
2. Enter email for the target org user
3. Click "Dev Sign In" — redirects to `/governance`

### Scene 3: Executive Dashboard (15s)

1. Dashboard shows quickstart prompt: "Bootstrap your AI governance program in minutes"
2. Show the empty stats (0 systems, 0 incidents)
3. Click "Quick Start" button

### Scene 4: Quickstart Wizard (45s)

**Step 1 — Choose Path**
1. Show the two options: "Import from AI Vendor Catalog" and "Start from Industry Template"
2. Select BOTH paths
3. Click Continue

**Step 2A — Vendor Selection**
1. Search for "OpenAI" in the catalog search
2. Select OpenAI from results
3. Search and add 2-3 more vendors (e.g., "Anthropic", "Mistral", "Cohere")
4. Show the selection count badge updating
5. Click Continue

**Step 2B — Industry Template**
1. Show the 6 industry templates grid (E-Commerce, Healthcare, Financial Services, SaaS, Manufacturing, Professional Services)
2. Click **Healthcare** — dramatic preview expands:
   - 4 AI Systems (Clinical Decision Support, Medical Imaging, Patient Triage, Drug Interaction Checker)
   - ALL classified as HIGH risk (red badges)
   - 4 Pre-deployment oversight gates
   - 3 Policies (Usage, Ethics, Risk Management)
3. Click Continue

**Step 3 — Review & Build**
1. Show the summary: vendors + systems + risk classifications + oversight gates + compliance reqs + policies
2. Scroll through the items list briefly
3. Click "Build AI Governance Program"
4. Watch the loading state

**Step 4 — Success**
1. Show the success screen with creation counts
2. Note the **Compliance Reqs** count (80+ requirements auto-initialized across 3 frameworks)
3. Click "AI Registry" to continue

### Scene 5: AI Registry (20s)

1. All systems are now listed — vendor-imported + Healthcare template systems
2. Click into **"Clinical Decision Support System"**
3. Show the system detail page:
   - Overview card (description, technique, role, personal data processing)
   - Statistics card (models, data sources, compliance mappings count)
   - **Compliance Scorecard** — the hero feature:
     - Overall compliance % with progress bar
     - Per-framework breakdown (EU AI Act / NIST AI RMF / ISO 42001)
     - Top Gaps showing NOT_ASSESSED requirements
   - Click "View Matrix" button

### Scene 6: Compliance Matrix (30s)

1. Compliance page opens with framework tabs (EU AI Act, NIST AI RMF, ISO 42001)
2. Select "Clinical Decision Support System" from system dropdown
3. Show the compliance matrix populated with requirements:
   - All start as "Not Assessed" (auto-initialized by quickstart)
   - Expand a requirement (e.g., Art. 9 — Risk Management)
   - Set status to "Compliant", add a note
   - Show **cross-framework badges**: "Linked across frameworks (2)" — NIST GOVERN 1, ISO Clause 6.1
   - Check "Also apply to 2 equivalent requirements" checkbox
   - Save — watch the propagation toast: "Updated + propagated to 2 linked requirements"
4. Switch to NIST AI RMF tab — show GOVERN 1 is now "Compliant" with "[Propagated]" note

### Scene 7: Risk Classification (15s)

1. Navigate to Risk Classification
2. Stats bar: Unacceptable / High / Limited / Minimal / Unclassified counts
3. Show Healthcare systems all classified as HIGH with red badges
4. Expand one to show rationale and Annex III category

### Scene 8: Oversight Gates (15s)

1. Navigate to Oversight
2. Show pending gates created for HIGH-risk systems
3. All 4 Healthcare systems have PRE_DEPLOYMENT gates waiting for approval

### Scene 9: Policies (10s)

1. Navigate to Policies
2. Show 3 policies from Healthcare template: AI Usage, AI Ethics, AI Risk Management
3. Click one to show content and linked systems

---

## FLOW B: Pre-Seeded Demo (Acme AI Corp)

Use this flow with the fully seeded `acme-ai` org. Has 8 AI systems, incidents, oversight decisions, compliance data, shadow AI, and vendor catalog.

### Scene 1: Sign In (5s)

1. Go to `http://localhost:3002/sign-in`
2. Dev Login with `demo@aisentinel.example`
3. Lands on Executive Dashboard

### Scene 2: Executive Dashboard (20s)

1. Show populated dashboard with real stats:
   - AI Systems count, deployed systems
   - Risk posture (HIGH/LIMITED/MINIMAL distribution)
   - Assessment pipeline (draft/in-progress/approved)
   - Compliance summary (compliant/partial/non-compliant)
   - Incident count with CRITICAL highlight
   - Oversight gates (pending/overdue)
2. Show recent activity feed at bottom
3. Note the quickstart banner (may still show if <=3 deployed)

### Scene 3: AI Registry (20s)

1. Navigate to AI Registry
2. Show 8 AI systems with various statuses (DEPLOYED, TESTING, DRAFT)
3. Filter by status using tabs
4. Click into **"Credit Scoring AI"** (HIGH risk system)
5. Show:
   - HIGH risk badge in header
   - Overview with purpose: credit decisions
   - **Compliance Scorecard** with per-framework progress bars
   - Top Gaps with specific non-compliant requirements

### Scene 4: Risk Classification (15s)

1. Navigate to Risk Classification
2. Stats: show distribution across 4 tiers
3. Expand "Sentiment Analysis" — show it classified as UNACCEPTABLE (Art. 5 violation)
4. Dramatic beat: red UNACCEPTABLE badge

### Scene 5: Assessments (15s)

1. Navigate to Assessments
2. Show FRIA for Credit Scoring (APPROVED)
3. Click in to show assessment questions, responses, approval workflow
4. Note: templates auto-populate question sets

### Scene 6: Compliance Matrix (30s)

1. Navigate to Compliance
2. Select "Credit Scoring AI" + "EU AI Act"
3. Show compliance matrix with mix of statuses
4. Demonstrate cross-framework mapping:
   - Click a requirement to see linked requirements badge
   - Update status with propagation enabled
   - Show evidence attachment (POLICY, AUDIT types)
5. Switch framework to NIST AI RMF to show propagated status

### Scene 7: Oversight (20s)

1. Navigate to Oversight
2. Show gate list with mixed statuses
3. **Dramatic beat**: "Sentiment Analysis" gate — FAILED
   - Click to see decision: "Prohibited under Art. 5 — social scoring"
   - Timeline showing who reviewed and when
4. Show a PASSED gate for comparison

### Scene 8: Incidents (20s)

1. Navigate to Incidents
2. **Dramatic beat**: CRITICAL hallucination incident (red badge)
   - Click in to see timeline: detection → investigation → mitigation
   - Tasks assigned to team members
   - Art. 73 authority notification status
3. Show other incidents: bias, drift, prompt injection

### Scene 9: Policies (10s)

1. Navigate to Policies
2. Show policies with versioning and approval workflow
3. Click one to see linked AI systems

### Scene 10: Shadow AI Discovery (15s)

1. Navigate to Shadow AI (premium feature)
2. Show 8 discovered tools across the organization
3. **Dramatic beat**: "Claude" found in Legal department
   - Status: DISCOVERED → workflow to UNDER_REVIEW → APPROVED/PROHIBITED
4. Show the 36-tool catalog for self-reporting

### Scene 11: Vendor Catalog (10s)

1. Navigate to Vendor Catalog (premium feature)
2. Show 665+ pre-audited AI vendors from Vendor.Watch
3. Search for a vendor, show profile with EU AI Act compliance badge

---

## KEY DRAMATIC MOMENTS (for emphasis/pauses in video)

1. **Quickstart completion** — 9 systems + 80+ compliance reqs created in seconds
2. **Compliance Scorecard** — Per-framework progress bars on system detail page
3. **Cross-framework propagation** — One click updates linked requirements across EU AI Act + NIST + ISO 42001
4. **UNACCEPTABLE risk** — Sentiment Analysis classified as Art. 5 prohibited
5. **Oversight FAILED** — Gate rejection with regulatory citation
6. **CRITICAL incident** — Hallucination with severity, timeline, authority notification
7. **Shadow AI Claude** — Discovered in Legal dept, pending governance review

## SCREEN RESOLUTION

Record at 1920x1080 or 2560x1440. The app is always dark theme (#1a1a1a background).
Primary brand color: #f5a623 (amber/gold).

## TIMING

- Flow A (Quickstart): ~3 minutes
- Flow B (Pre-seeded): ~3 minutes
- Combined highlight reel: ~2 minutes
