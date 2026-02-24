# AI SENTINEL — Product & Technical Specification

**Version**: 2.0
**Date**: 2026-02-23
**Status**: Phases 1-3 Implemented
**Author**: TODO.LAW Product Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Identity](#2-product-identity)
3. [Problem Statement & Market Context](#3-problem-statement--market-context)
4. [Module Structure](#4-module-structure)
5. [Data Models](#5-data-models)
6. [Core vs Premium Split](#6-core-vs-premium-split)
7. [Integration with DPO Central](#7-integration-with-dpo-central)
8. [Regulatory Mapping](#8-regulatory-mapping)
9. [Tech Stack](#9-tech-stack)
10. [Folder Structure](#10-folder-structure)
11. [Phased Delivery](#11-phased-delivery)
12. [Reference Architecture](#12-reference-architecture)

---

## 1. Executive Summary

**AI SENTINEL** is a standalone AI governance application under the TODO.LAW brand. It gives Data Protection Officers and compliance teams a purpose-built tool for managing AI systems, EU AI Act compliance, risk classification, human oversight, and AI-specific incidents — without cluttering the data-privacy workflows in DPO Central.

DPO Central covers **data privacy** (GDPR, DSAR, incidents, vendor risk). DPOs are increasingly asked to also govern **AI usage** — shadow AI, model registries, EU AI Act compliance, bias assessments — even when no personal data is involved. The market (OneTrust, Credo AI, Holistic AI, etc.) is racing to fill this gap. AI SENTINEL gives a DPO familiar UX and tooling for AI governance as a dedicated application.

**Regulatory urgency**: EU AI Act full high-risk compliance is due **August 2, 2026** — approximately 18 months from project inception.

---

## 2. Product Identity

| Attribute | Value |
|-----------|-------|
| **Name** | AI SENTINEL |
| **Domain** | `aisentinel.todo.law` |
| **Tagline** | AI Governance Made Accountable |
| **Navbar** | `TODO.LAW™ AI SENTINEL` |
| **Sign-in heading** | `AI SENTINEL` with subtitle `AI Governance Made Accountable` |
| **Browser tab** | `AI SENTINEL - AI Governance Made Accountable` |
| **Footer** | `AI SENTINEL is a TODO.LAW service.` |
| **Primary color** | `#8b5cf6` (violet — distinct from DPO Central's `#53aecc` blue) |
| **Background** | `#1a1a1a` (dark) |
| **Theme** | Always dark (matches DPO Central) |
| **Local dev port** | `3002` (DPO Central is `3001`) |
| **Repository folder** | `/Users/sme/NEL/ai-sentinel` |

---

## 3. Problem Statement & Market Context

### The Gap

DPOs and AI governance officers face a fragmented landscape:

- **DPO Central** handles data privacy compliance (GDPR, DSAR, breach tracking) but was never designed for AI-specific governance concerns.
- **EU AI Act** (effective Aug 1, 2024; high-risk obligations due Aug 2, 2026) introduces new compliance requirements that don't map cleanly onto existing privacy tools: AI system registration (Art. 49), risk classification (Art. 5-6), conformity assessments (Art. 43), human oversight (Art. 14), and serious incident reporting (Art. 62).
- **Shadow AI** proliferation means organizations have dozens of AI tools in use with no central inventory or policy governance.
- **Existing solutions** (OneTrust AI Governance, Credo AI, Holistic AI) are enterprise-priced and often bundled with broader GRC suites.

### Why a Separate Application

- **Separation of concerns**: AI governance and data privacy are distinct disciplines with different regulatory frameworks, workflows, and stakeholders.
- **Focused UX**: A dedicated tool avoids overloading DPO Central's navigation and mental model.
- **Independent lifecycle**: AI governance features can evolve rapidly without regression risk to stable privacy workflows.
- **Market positioning**: A standalone product can be sold and marketed independently to AI governance teams who may not need data privacy tooling.

### What AI SENTINEL Does NOT Do (Stays in DPO Central)

- DSAR management
- Data breach incident tracking (for data protection — AI Sentinel has AI-specific incidents)
- ROPA / processing activities
- Privacy-specific assessments (DPIA, PIA, TIA, LIA)

---

## 4. Module Structure

AI SENTINEL ships with 9 core modules and 1 premium module across 3 phases:

| # | Module | Core/Premium | Phase | Purpose |
|---|--------|-------------|-------|---------|
| 1 | **AI Registry** | Core | 1 | Inventory all AI systems, models, agents, and tools with lifecycle tracking |
| 2 | **Risk Classification** | Core | 1 | EU AI Act four-tier classification (unacceptable / high / limited / minimal) |
| 3 | **Assessments** | Core + Premium | 1 | FRIA & AI Risk (core), Conformity & Bias/Fairness (premium) |
| 4 | **Compliance** | Core | 1 | Framework mapping (EU AI Act, NIST AI RMF, ISO 42001), evidence management |
| 5 | **Human Oversight** | Core | 2 | Approval gates, review scheduling, decision logging (Art. 14) |
| 6 | **AI Incidents** | Core | 2 | AI-specific failures, bias events, timeline, tasks, authority notifications (Art. 62) |
| 7 | **Vendor Risk** | Core | 2 | Third-party AI vendor management, risk assessment, contract tracking |
| 8 | **Policy Management** | Core | 2 | AI policies with versioning, approval workflow, system linking |
| 9 | **Executive Dashboard** | Core | 2 | Org-wide stats, module summaries, quick actions, activity feed |
| 10 | **Shadow AI Discovery** | Premium | 3 | 36-tool AI catalog, self-reporting portal, status workflow |

### 4.1 AI Registry

The central inventory of all AI systems within an organization. Every other module references back to an AI system record.

**Key capabilities**:
- Full CRUD for AI systems with lifecycle tracking (Draft → Development → Testing → Deployed → Retired)
- Model cards for each AI model linked to a system (provider, type, training data summary, known limitations, performance metrics)
- Data source tracking (training, fine-tuning, validation, input) with personal data flags
- Role assignment (provider, deployer, importer, distributor, user per EU AI Act Art. 3)
- Business owner and technical owner assignment
- Optional cross-reference links to DPO Central assets and vendors
- Search, tabs (by status), and list/detail views

### 4.2 Risk Classification

Implements the EU AI Act four-tier risk classification system.

**Key capabilities**:
- Guided classification wizard that walks users through Annex III categories
- One-to-one link between AI system and risk classification
- Risk level assignment: Unacceptable, High, Limited, Minimal
- Rationale documentation with evidence fields
- Classification history (versioned changes with timestamps and authors)
- Dashboard view showing distribution across risk tiers
- Automatic flagging of systems classified as Unacceptable

### 4.3 Assessments

Template-driven assessment workflows tied to AI systems.

**Core templates (free)**:
- **FRIA** (Fundamental Rights Impact Assessment) — Art. 27 requirement for high-risk AI deployed by public bodies or certain private entities
- **AI Risk Assessment** — General-purpose risk assessment for any AI system
- **Custom** — User-defined template builder

**Premium templates**:
- **Conformity Assessment** — Art. 43, Annex VI/VII conformity assessment for high-risk AI
- **Bias & Fairness Assessment** — Structured evaluation of bias, fairness metrics, and discrimination risk

**Workflow**: Draft → In Progress → Under Review → Approved / Rejected
- Risk scoring
- Mitigation tracking
- Approval gates with reviewer assignment
- Version history

### 4.4 Human Oversight

Implements Art. 14 human oversight requirements for high-risk AI systems.

**Key capabilities**:
- Oversight gate types: Pre-deployment, Post-deployment, Periodic review, Incident-triggered
- Configurable review cadence (e.g., quarterly for periodic reviews)
- Decision logging: Approve, Reject, Defer — with rationale and evidence reviewed
- Reviewer assignment and notification
- Audit trail of all oversight decisions
- Dashboard showing upcoming reviews, overdue gates, and decision history

### 4.5 AI Incidents

AI-specific incident tracking, distinct from data breach incidents in DPO Central.

**Key capabilities**:
- AI-specific incident types: Hallucination, Bias/Discrimination, Model Drift, Adversarial Attack, Prompt Injection, Unauthorized Access, Safety Failure, Performance Degradation, Data Poisoning, Privacy Violation
- Severity levels with escalation rules
- Root cause categorization
- Timeline tracking
- Task assignment
- Authority notification tracking (Art. 62 serious incident reporting)
- Optional cross-reference to DPO Central incidents (when AI incident also involves a data breach)
- Status workflow: Reported → Investigating → Mitigating → Resolved → Closed

### 4.6 Compliance

Framework-based compliance mapping and evidence management.

**Pre-loaded frameworks**:
- **EU AI Act** — Full article mapping (Art. 5-62+ relevant provisions)
- **NIST AI RMF** — GOVERN, MAP, MEASURE, MANAGE functions with sub-categories
- **ISO 42001** — Clauses 4-10 + Annex A controls

**Key capabilities**:
- Per-AI-system compliance matrix: map each requirement to a status (Compliant, Partially Compliant, Non-Compliant, Not Applicable, Not Assessed)
- Requirement-level evidence and notes
- Applicability filtering by risk level (e.g., Art. 14 only applies to high-risk systems)
- CSV and PDF export for technical documentation packages (Art. 11 / Annex IV)
- Dashboard showing compliance posture across frameworks

### 4.7 Vendor Risk

Third-party AI vendor management with risk assessment and contract lifecycle tracking.

**Key capabilities**:
- Vendor registry with contact details, risk levels (Critical/High/Medium/Low), and status workflow (Under Review → Active/Approved/Suspended/Terminated)
- Vendor risk assessments with scoring, findings, and review scheduling
- Contract lifecycle tracking (start date, expiry date, renewal alerts)
- Due diligence documentation
- Optional cross-reference to DPO Central vendor records
- Search, tabs (by status), stats dashboard, list/detail/create views

### 4.8 Policy Management

AI governance policy authoring with versioning, approval workflow, and system linking.

**Key capabilities**:
- Policy types: AI Usage, AI Governance, AI Ethics, AI Risk Management, AI Data Governance, AI Procurement, AI Incident Response, AI Transparency, Custom
- Content authoring with version history (automatic versioning on content changes with change notes)
- Approval workflow: Draft → Under Review → Approved → Published → Archived
- System linking: associate policies with specific AI systems for traceability
- Effective dates and review date scheduling
- Search, tabs (by status), stats dashboard, list/detail/create views

### 4.9 Executive Dashboard

Organization-wide governance overview as the main `/governance` landing page.

**Key capabilities**:
- Summary stats across all modules (AI systems by status, risk distribution, open incidents, upcoming reviews)
- Quick action buttons for common tasks (register AI system, report incident, create assessment)
- Recent activity feed showing latest changes across all modules
- Module-level summary cards with counts and status breakdowns

### 4.10 Shadow AI Discovery (Premium)

Organizational visibility into unauthorized or unmanaged AI tool usage.

**Key capabilities**:
- Pre-loaded catalog of 36 known AI tools across 8 categories (LLM Chat, Code Assistants, Image Generation, Video/Audio, Writing/Productivity, Business Tools, Data Analytics, Search)
- Self-reporting portal: catalog search or custom tool entry with department and usage description
- Status workflow: Discovered → Under Review → Approved/Prohibited, Approved → Registered (linked to AI Registry)
- Risk indicators per tool: processes personal data, trains on input, cloud-hosted, on-premise available, SOC2 certified, GDPR compliant, requires API key
- Premium-gated via `hasShadowAiAccess()` entitlement check
- Search, tabs (by status), stats dashboard, list/detail/create views

---

## 5. Data Models

### 5.1 Core Entities

#### Organization & Auth (mirrors DPO Central)

```
Organization    — id, name, slug, domain, createdAt, updatedAt
Membership      — userId, organizationId, role (OWNER/ADMIN/AI_OFFICER/MEMBER/VIEWER)
User            — id, name, email, image
Account/Session — NextAuth managed
```

#### AI Registry

```
AISystem
  id                    String    @id @default(cuid())
  organizationId        String
  name                  String
  description           String?
  technique             AITechnique
  role                  AISystemRole
  status                AISystemStatus    (DRAFT/DEVELOPMENT/TESTING/DEPLOYED/RETIRED)
  purpose               String?
  businessOwner         String?
  technicalOwner        String?
  deploymentDate        DateTime?
  retirementDate        DateTime?
  processesPersonalData Boolean   @default(false)
  dpoCentralVendorId    String?
  dpoCentralAssetIds    String[]
  createdAt             DateTime
  updatedAt             DateTime

AIModel
  id                    String    @id @default(cuid())
  aiSystemId            String
  organizationId        String
  name                  String
  provider              String?
  modelType             String?
  version               String?
  trainingDataSummary   String?
  knownLimitations      String?
  performanceMetrics    Json?
  createdAt             DateTime
  updatedAt             DateTime

AISystemDataSource
  id                    String    @id @default(cuid())
  aiSystemId            String
  organizationId        String
  name                  String
  sourceType            DataSourceType    (TRAINING/FINE_TUNING/VALIDATION/INPUT/OUTPUT)
  description           String?
  containsPersonalData  Boolean   @default(false)
  dataCategories        String[]
  createdAt             DateTime
```

#### Risk Classification

```
RiskClassification
  id                    String    @id @default(cuid())
  aiSystemId            String    @unique
  organizationId        String
  riskLevel             AIRiskLevel       (UNACCEPTABLE/HIGH/LIMITED/MINIMAL)
  rationale             String
  annexIIICategory      String?
  classifiedBy          String
  classifiedAt          DateTime
  updatedAt             DateTime

RiskClassificationHistory
  id                    String    @id @default(cuid())
  riskClassificationId  String
  previousLevel         AIRiskLevel
  newLevel              AIRiskLevel
  rationale             String
  changedBy             String
  changedAt             DateTime
```

#### Assessments

```
AIAssessmentTemplate
  id                    String    @id @default(cuid())
  organizationId        String?   (null = system template)
  name                  String
  type                  AIAssessmentType  (FRIA/CONFORMITY/AI_RISK/BIAS_FAIRNESS/CUSTOM)
  description           String?
  sections              Json
  frameworkRef          String?
  isSystem              Boolean   @default(false)
  createdAt             DateTime
  updatedAt             DateTime

AIAssessment
  id                    String    @id @default(cuid())
  organizationId        String
  aiSystemId            String
  templateId            String
  title                 String
  status                AssessmentStatus  (DRAFT/IN_PROGRESS/UNDER_REVIEW/APPROVED/REJECTED)
  riskScore             Float?
  responses             Json
  mitigations           Json?
  reviewedBy            String?
  reviewedAt            DateTime?
  approvedBy            String?
  approvedAt            DateTime?
  createdBy             String
  createdAt             DateTime
  updatedAt             DateTime
```

#### Human Oversight

```
OversightGate
  id                    String    @id @default(cuid())
  organizationId        String
  aiSystemId            String
  gateType              GateType          (PRE_DEPLOYMENT/POST_DEPLOYMENT/PERIODIC_REVIEW/INCIDENT_TRIGGERED)
  status                GateStatus        (PENDING/IN_REVIEW/PASSED/FAILED/DEFERRED)
  reviewCadence         String?           (e.g., "quarterly", "monthly")
  nextReviewDate        DateTime?
  assignedTo            String?
  createdAt             DateTime
  updatedAt             DateTime

OversightDecision
  id                    String    @id @default(cuid())
  gateId                String
  organizationId        String
  decision              OversightDecisionType  (APPROVE/REJECT/DEFER)
  rationale             String
  evidenceReviewed      String[]
  decidedBy             String
  decidedAt             DateTime
```

#### AI Incidents

```
AIIncident
  id                    String    @id @default(cuid())
  organizationId        String
  aiSystemId            String?
  title                 String
  description           String
  type                  AIIncidentType
  severity              IncidentSeverity  (CRITICAL/HIGH/MEDIUM/LOW)
  status                IncidentStatus    (REPORTED/INVESTIGATING/MITIGATING/RESOLVED/CLOSED)
  rootCauseCategory     String?
  rootCauseDescription  String?
  impactDescription     String?
  notificationRequired  Boolean   @default(false)
  notifiedAuthorities   String[]
  dpoCentralIncidentId  String?
  reportedBy            String
  reportedAt            DateTime
  resolvedAt            DateTime?
  createdAt             DateTime
  updatedAt             DateTime

AIIncidentTimeline
  id                    String    @id @default(cuid())
  incidentId            String
  organizationId        String
  action                String
  description           String?
  performedBy           String
  performedAt           DateTime

AIIncidentTask
  id                    String    @id @default(cuid())
  incidentId            String
  organizationId        String
  title                 String
  status                TaskStatus        (PENDING/IN_PROGRESS/COMPLETED)
  assignedTo            String?
  dueDate               DateTime?
  completedAt           DateTime?
  createdAt             DateTime

AIIncidentNotification
  id                    String    @id @default(cuid())
  incidentId            String
  organizationId        String
  authority             String
  notificationType      String
  sentAt                DateTime?
  dueBy                 DateTime?
  status                NotificationStatus  (PENDING/SENT/ACKNOWLEDGED)
```

#### Compliance

```
ComplianceFramework
  id                    String    @id @default(cuid())
  code                  FrameworkCode     (EU_AI_ACT/NIST_AI_RMF/ISO_42001)
  name                  String
  version               String
  description           String?
  createdAt             DateTime

ComplianceRequirement
  id                    String    @id @default(cuid())
  frameworkId           String
  code                  String            (e.g., "ART_9", "MAP_1.1", "ANNEX_A.5")
  title                 String
  description           String?
  applicableTo          AIRiskLevel[]
  parentId              String?           (self-referential for hierarchy)
  sortOrder             Int
  createdAt             DateTime

ComplianceMapping
  id                    String    @id @default(cuid())
  organizationId        String
  aiSystemId            String
  requirementId         String
  status                ComplianceStatus  (COMPLIANT/PARTIALLY_COMPLIANT/NON_COMPLIANT/NOT_APPLICABLE/NOT_ASSESSED)
  evidence              String?
  notes                 String?
  assessedBy            String?
  assessedAt            DateTime?
  createdAt             DateTime
  updatedAt             DateTime

  @@unique([aiSystemId, requirementId])
```

#### Compliance Evidence

```
ComplianceEvidence
  id                    String    @id @default(cuid())
  complianceMappingId   String
  organizationId        String
  type                  EvidenceType      (POLICY/DOCUMENT/TEST_RESULT/MONITORING/AUDIT/TRAINING/APPROVAL/OTHER)
  title                 String
  url                   String?
  description           String?
  addedBy               String
  addedAt               DateTime
```

#### Vendor Risk

```
AIVendor
  id                    String    @id @default(cuid())
  organizationId        String
  name                  String
  website               String?
  description           String?
  contactName           String?
  contactEmail          String?
  riskLevel             VendorRiskLevel?  (CRITICAL/HIGH/MEDIUM/LOW)
  status                VendorStatus      (ACTIVE/UNDER_REVIEW/APPROVED/SUSPENDED/TERMINATED)
  dueDiligenceDate      DateTime?
  contractStartDate     DateTime?
  contractExpiryDate    DateTime?
  dpoCentralVendorId    String?
  notes                 String?
  metadata              Json?
  createdAt             DateTime
  updatedAt             DateTime

AIVendorAssessment
  id                    String    @id @default(cuid())
  vendorId              String
  organizationId        String
  title                 String
  status                VendorAssessmentStatus  (DRAFT/IN_PROGRESS/COMPLETED/EXPIRED)
  riskScore             Float?
  responses             Json?
  findings              String?
  completedBy           String?
  completedAt           DateTime?
  nextReviewDate        DateTime?
  createdAt             DateTime
  updatedAt             DateTime
```

#### Policy Management

```
AIPolicy
  id                    String    @id @default(cuid())
  organizationId        String
  title                 String
  type                  PolicyType        (AI_USAGE/AI_GOVERNANCE/AI_ETHICS/AI_RISK_MANAGEMENT/AI_DATA_GOVERNANCE/AI_PROCUREMENT/AI_INCIDENT_RESPONSE/AI_TRANSPARENCY/CUSTOM)
  description           String?
  content               String?
  currentVersion        Int               @default(1)
  status                PolicyStatus      (DRAFT/UNDER_REVIEW/APPROVED/PUBLISHED/ARCHIVED)
  approvedBy            String?
  approvedAt            DateTime?
  effectiveDate         DateTime?
  reviewDate            DateTime?
  createdBy             String
  createdAt             DateTime
  updatedAt             DateTime

AIPolicyVersion
  id                    String    @id @default(cuid())
  policyId              String
  version               Int
  content               String
  changeNotes           String?
  createdBy             String
  createdAt             DateTime

AIPolicySystemLink
  id                    String    @id @default(cuid())
  policyId              String
  aiSystemId            String

  @@unique([policyId, aiSystemId])
```

#### Shadow AI Discovery

```
ShadowAITool
  id                    String    @id @default(cuid())
  name                  String
  vendor                String?
  category              String
  description           String?
  website               String?
  riskIndicators        String[]
  createdAt             DateTime

ShadowAIReport
  id                    String    @id @default(cuid())
  organizationId        String
  toolId                String?           (links to ShadowAITool if known)
  toolName              String
  status                ShadowAIStatus    (DISCOVERED/UNDER_REVIEW/APPROVED/PROHIBITED/REGISTERED)
  reportedBy            String?
  department            String?
  usageDescription      String?
  registeredSystemId    String?           (links to AISystem if promoted)
  createdAt             DateTime
  updatedAt             DateTime
```

### 5.2 Key Enums

```
enum AITechnique {
  MACHINE_LEARNING
  DEEP_LEARNING
  GENERATIVE_AI
  AGENTIC_AI
  NLP
  COMPUTER_VISION
  SPEECH_RECOGNITION
  ROBOTICS
  RULE_BASED
  EXPERT_SYSTEM
  STATISTICAL
  OTHER
}

enum AISystemRole {
  PROVIDER
  DEPLOYER
  IMPORTER
  DISTRIBUTOR
  USER
}

enum AISystemStatus {
  DRAFT
  DEVELOPMENT
  TESTING
  DEPLOYED
  RETIRED
}

enum AIRiskLevel {
  UNACCEPTABLE
  HIGH
  LIMITED
  MINIMAL
}

enum AIIncidentType {
  HALLUCINATION
  BIAS_DISCRIMINATION
  MODEL_DRIFT
  ADVERSARIAL_ATTACK
  PROMPT_INJECTION
  UNAUTHORIZED_ACCESS
  SAFETY_FAILURE
  PERFORMANCE_DEGRADATION
  DATA_POISONING
  PRIVACY_VIOLATION
  OTHER
}

enum AIAssessmentType {
  FRIA
  CONFORMITY
  AI_RISK
  BIAS_FAIRNESS
  CUSTOM
}

enum GateType {
  PRE_DEPLOYMENT
  POST_DEPLOYMENT
  PERIODIC_REVIEW
  INCIDENT_TRIGGERED
  MATERIAL_CHANGE
}

enum ShadowAIStatus {
  DISCOVERED
  UNDER_REVIEW
  APPROVED
  PROHIBITED
  REGISTERED
}

enum EvidenceType {
  POLICY
  DOCUMENT
  TEST_RESULT
  MONITORING
  AUDIT
  TRAINING
  APPROVAL
  OTHER
}

enum VendorStatus {
  ACTIVE
  UNDER_REVIEW
  APPROVED
  SUSPENDED
  TERMINATED
}

enum VendorRiskLevel {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum VendorAssessmentStatus {
  DRAFT
  IN_PROGRESS
  COMPLETED
  EXPIRED
}

enum PolicyType {
  AI_USAGE
  AI_GOVERNANCE
  AI_ETHICS
  AI_RISK_MANAGEMENT
  AI_DATA_GOVERNANCE
  AI_PROCUREMENT
  AI_INCIDENT_RESPONSE
  AI_TRANSPARENCY
  CUSTOM
}

enum PolicyStatus {
  DRAFT
  UNDER_REVIEW
  APPROVED
  PUBLISHED
  ARCHIVED
}

enum ComplianceStatus {
  COMPLIANT
  PARTIALLY_COMPLIANT
  NON_COMPLIANT
  NOT_APPLICABLE
  NOT_ASSESSED
}

enum FrameworkCode {
  EU_AI_ACT
  NIST_AI_RMF
  ISO_42001
}
```

---

## 6. Core vs Premium Split

### 6.1 Core (AGPL-3.0 — Open Source)

All core modules are freely available:

- **AI Registry** — Full CRUD, model cards, lifecycle tracking, data source mapping
- **Risk Classification** — Four-tier wizard, classification history, dashboard
- **Assessments** — FRIA + AI Risk + Custom template builder
- **Human Oversight** — All gate types, decision logging, review scheduling
- **AI Incidents** — Full incident lifecycle, timeline, tasks, authority notifications
- **Compliance** — All 3 frameworks (EU AI Act, NIST AI RMF, ISO 42001), compliance matrix, evidence management, CSV/PDF export
- **Vendor Risk** — Vendor registry, risk assessments, contract tracking, due diligence
- **Policy Management** — Policy authoring, versioning, approval workflow, system linking
- **Executive Dashboard** — Org-wide stats, module summaries, quick actions, activity feed

### 6.2 Premium (Proprietary — Requires License)

Premium features follow the same add-on billing model as DPO Central (Stripe, per-feature, no tiers):

| Feature | Skill ID | Price |
|---------|----------|-------|
| Conformity Assessment template | `com.todolaw.aisentinel.conformity` | EUR 9/mo |
| Bias & Fairness Assessment template | `com.todolaw.aisentinel.bias-fairness` | EUR 9/mo |
| Shadow AI Discovery module | `com.todolaw.aisentinel.shadow-ai` | EUR 9/mo |
| Complete Package (all premium) | `com.todolaw.aisentinel.complete` | EUR 19/mo |

Premium features are gated via the same entitlement service pattern used in DPO Central (`src/server/services/licensing/`).

---

## 7. Integration with DPO Central

### 7.1 Architecture: Loose Coupling via Reference IDs

AI SENTINEL and DPO Central are **separate applications with separate databases**. Integration is achieved through optional reference ID fields that enable clickable cross-links in the UI. No shared database, no API calls between services.

| Link | Field in AI Sentinel | Displays as |
|------|---------------------|-------------|
| AI System to DPO Central Data Asset | `dpoCentralAssetIds: String[]` | Clickable link to `dpocentral.todo.law/privacy/data-inventory/{id}` |
| AI System to DPO Central Vendor | `dpoCentralVendorId: String` | Clickable link to `dpocentral.todo.law/privacy/vendors/{id}` |
| AI Incident to DPO Central Incident | `dpoCentralIncidentId: String` | Clickable link to `dpocentral.todo.law/privacy/incidents/{id}` |

### 7.2 Future Integration (Phase 4+)

- Shared authentication database (single sign-on across TODO.LAW products)
- Cross-app name resolution API (display asset/vendor/incident names, not just IDs)
- Unified TODO.LAW portal with product switcher
- Shared Stripe customer record for billing across products

---

## 8. Regulatory Mapping

### 8.1 EU AI Act

| Module | Articles | Description |
|--------|----------|-------------|
| AI Registry | Art. 49, Art. 16(a) | EU database registration, provider record-keeping duties |
| Risk Classification | Art. 5, Art. 6, Annex III | Prohibited practices, high-risk classification criteria |
| Assessments (FRIA) | Art. 27 | Fundamental rights impact assessment for public-body deployers |
| Assessments (Conformity) | Art. 43, Annex VI/VII | Conformity assessment procedures for high-risk AI |
| Human Oversight | Art. 14 | Human oversight measures for high-risk AI systems |
| AI Incidents | Art. 62 | Serious incident reporting to market surveillance authorities |
| Compliance | Art. 9 (risk management), Art. 10 (data governance), Art. 11/Annex IV (technical documentation), Art. 12 (record-keeping/logging), Art. 13 (transparency), Art. 15 (accuracy, robustness, cybersecurity) | Horizontal requirements for high-risk AI |
| Vendor Risk | Art. 25 (responsibilities along the AI value chain), Art. 28 (obligations of distributors/importers) | Third-party AI supply chain governance |
| Policy Management | Art. 4 (AI literacy), Art. 9 (risk management system), Art. 26 (deployer obligations) | Organizational AI governance policies |
| Shadow AI | Art. 4 (AI literacy), Art. 26 (deployer obligations) | Organizational literacy and deployer duties |

### 8.2 NIST AI Risk Management Framework (AI RMF 1.0)

| RMF Function | AI Sentinel Module | Key Sub-categories |
|-------------|-------------------|-------------------|
| **GOVERN** | AI Registry, Human Oversight, Compliance | GOVERN 1 (policies), GOVERN 2 (accountability), GOVERN 3 (workforce), GOVERN 4 (organizational commitment), GOVERN 5 (processes), GOVERN 6 (stakeholder engagement) |
| **MAP** | Risk Classification, AI Registry | MAP 1 (context), MAP 2 (categorization), MAP 3 (benefits & costs), MAP 4 (risks), MAP 5 (impacts) |
| **MEASURE** | Assessments, Compliance | MEASURE 1 (metrics), MEASURE 2 (evaluation), MEASURE 3 (mechanisms), MEASURE 4 (tracking) |
| **MANAGE** | AI Incidents, Human Oversight | MANAGE 1 (risk prioritization), MANAGE 2 (risk treatment), MANAGE 3 (risk monitoring), MANAGE 4 (communication) |

### 8.3 ISO/IEC 42001:2023 (AI Management System)

| ISO 42001 Clause | AI Sentinel Module |
|-----------------|-------------------|
| Clause 4 (Context of the organization) | AI Registry, Compliance |
| Clause 5 (Leadership) | Human Oversight, Compliance |
| Clause 6 (Planning) | Risk Classification, Assessments |
| Clause 7 (Support) | AI Registry (model cards, data sources) |
| Clause 8 (Operation) | AI Registry (lifecycle), Human Oversight (gates) |
| Clause 9 (Performance evaluation) | Assessments, Compliance |
| Clause 10 (Improvement) | AI Incidents, Assessments |
| Annex A (AI controls) | Mapped across all modules |

---

## 9. Tech Stack

AI SENTINEL mirrors DPO Central's stack for developer efficiency and shared knowledge:

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 + React 19 | App Router, Server Components |
| Language | TypeScript | Strict mode |
| API | tRPC 11 | Type-safe RPC with `organizationProcedure` middleware |
| ORM | Prisma 5 | PostgreSQL adapter |
| Database | PostgreSQL (Neon) | Separate database from DPO Central |
| Auth | NextAuth (JWT) | Google OAuth + Email magic links (Resend) |
| Styling | Tailwind CSS 4 + Shadcn UI | Dark theme, violet primary |
| Billing | Stripe | Add-on model (per-feature, EUR 9/mo each) |
| Deployment | Vercel | Automatic from `main` branch |
| Multi-tenancy | `organizationId` on all models | Enforced via `organizationProcedure` |

### 9.1 Roles

```
OWNER > ADMIN > AI_OFFICER > MEMBER > VIEWER
```

`AI_OFFICER` replaces DPO Central's `PRIVACY_OFFICER` to reflect the AI governance context.

---

## 10. Folder Structure

```
/Users/sme/NEL/aisentinel/
  CLAUDE.md                        # Project instructions
  LICENSE                          # AGPL-3.0
  package.json                     # name: "aisentinel", port 3002
  next.config.ts
  tsconfig.json
  .env.local                       # ais_DATABASE_URL, NEXTAUTH_*, GOOGLE_*, RESEND_*, STRIPE_*
  prisma/
    schema.prisma                  # ~25 models (see Section 5)
    seed.ts                        # Main seed entrypoint
  scripts/
    seed-frameworks.ts             # EU AI Act articles, NIST AI RMF, ISO 42001
    seed-assessment-templates.ts   # FRIA, AI Risk Assessment templates
    seed-demo-scenarios.ts         # Comprehensive demo (8 systems, incidents, vendors, policies, shadow AI)
    seed-shadow-ai-tools.ts        # 36-tool AI catalog for Shadow AI Discovery
    migrate-evidence-to-structured.ts  # Evidence migration utility
  src/
    app/
      layout.tsx                   # Root layout with providers
      (auth)/
        sign-in/page.tsx
        verify-request/page.tsx
        auth-error/page.tsx
      (dashboard)/
        layout.tsx                 # Dashboard shell with nav
        governance/
          page.tsx                 # Executive dashboard (stats, quick actions, activity)
          ai-registry/
            page.tsx               # List view with search/tabs
            [id]/page.tsx          # Detail view
            new/page.tsx           # Create form
          risk-classification/
            page.tsx               # Classification dashboard + list
          assessments/
            page.tsx               # List view with type tabs
            [id]/page.tsx          # Assessment detail/editor
            new/page.tsx           # Create with template selection
          oversight/
            page.tsx               # List view with gate type tabs
            [id]/page.tsx          # Gate detail with decisions
            new/page.tsx           # Create oversight gate
          incidents/
            page.tsx               # List view with status tabs
            [id]/page.tsx          # Incident detail with timeline/tasks
            new/page.tsx           # Report incident form
          compliance/
            page.tsx               # Framework selector + compliance matrix + evidence
          vendors/
            page.tsx               # List view with status tabs
            [id]/page.tsx          # Vendor detail with assessments
            new/page.tsx           # Create vendor form
          policies/
            page.tsx               # List view with status tabs
            [id]/page.tsx          # Policy detail with versions + system links
            new/page.tsx           # Create policy form
          shadow-ai/
            page.tsx               # List view (premium-gated) with status tabs
            [id]/page.tsx          # Report detail with status workflow
            new/page.tsx           # Self-report form with catalog search
      api/
        auth/[...nextauth]/route.ts
        trpc/[trpc]/route.ts
    server/
      trpc.ts                      # Context, middleware, organizationProcedure
      routers/
        governance/
          index.ts                 # Merged router (10 sub-routers)
          organization.ts          # Org management + executive dashboard stats
          aiSystem.ts              # AI Registry CRUD
          riskClassification.ts    # Risk classification wizard + history
          assessment.ts            # Assessment CRUD + templates
          compliance.ts            # Framework mapping + evidence
          oversight.ts             # Oversight gates + decisions
          incident.ts              # AI incidents + timeline + tasks + notifications
          vendor.ts                # Vendor risk + vendor assessments
          policy.ts                # Policy CRUD + versioning + system links
          shadowAi.ts              # Shadow AI (premium-gated, 7 endpoints)
      services/
        licensing/
          entitlement.ts
          skill-packages.ts
    components/
      ui/                          # Shadcn UI components
      governance/                  # Module-specific components
        organization-setup.tsx
        ai-system-form.tsx
        risk-classification-wizard.tsx
        assessment-editor.tsx
        compliance-matrix.tsx
      premium/
        enable-feature-modal.tsx
      providers/                   # Context providers
      skeletons/                   # Loading skeleton components
    config/
      brand.ts                     # Brand config (name, colors, tagline)
      features.ts                  # Feature flags
      skill-packages.ts            # Premium feature definitions
    lib/
      auth.ts                      # NextAuth config
      prisma.ts                    # Prisma client singleton
      trpc.ts                      # tRPC client config
      organization-context.tsx     # Org context provider
      utils.ts                     # Utility functions (cn, formatDate, etc.)
    hooks/
      use-debounce.ts              # 300ms debounce hook
```

---

## 11. Phased Delivery

### Phase 1 — Core Platform ✅ Complete

**Goal**: Ship a usable tool for registering AI systems and demonstrating basic EU AI Act compliance.

**Delivered**:
- Project scaffolding (Next.js 16, tRPC, Prisma, Neon, NextAuth, Tailwind, Shadcn)
- AI Registry module (full CRUD, model cards, data sources, lifecycle, search/tabs)
- Risk Classification module (four-tier wizard, classification history, dashboard)
- Assessments module (FRIA + AI Risk templates, custom builder, workflow)
- Compliance module (EU AI Act + NIST AI RMF + ISO 42001, compliance matrix, structured evidence, CSV/PDF export)
- Executive Dashboard (stats cards, quick actions, recent activity feed)
- Auth (Google OAuth + magic links), multi-tenancy, brand config, feature flags
- Seed scripts (frameworks with articles, assessment templates)
- Vercel deployment to `aisentinel.todo.law`

**UX patterns** (consistent across all modules):
- Debounced search wired to tRPC `search` param
- Controlled Tabs for client-side filtering (no TabsContent)
- Mobile stacked layout (`sm:hidden`) + desktop horizontal layout (`hidden sm:flex`)
- Responsive header: `flex-col sm:flex-row sm:items-center`
- Stats grid: `grid-cols-2 lg:grid-cols-4` + `p-4 sm:pt-6`
- Full-width search input (no `max-w-md`)

### Phase 2 — Governance Lifecycle ✅ Complete

**Goal**: Complete the governance loop with incident tracking, human oversight, vendor risk, and policy management.

**Delivered**:
- Human Oversight module (5 gate types incl. material-change, decision logging, review scheduling)
- AI Incident Tracking module (full CRUD, timeline, tasks, authority notifications)
- Vendor Risk module (vendor registry, risk assessments, contract tracking, due diligence)
- Policy Management module (9 policy types, versioning, approval workflow, system linking)
- Stripe billing integration (premium features via add-on model)
- Premium assessment templates (Conformity Assessment, Bias & Fairness Assessment)
- Comprehensive demo seed script (8 AI systems, incidents, oversight gates, vendors, policies)

### Phase 3 — Shadow AI Discovery ✅ Complete

**Goal**: Premium shadow AI detection and self-reporting for organizational AI visibility.

**Delivered**:
- Shadow AI Discovery premium module with 36-tool catalog across 8 categories
- Self-reporting portal with catalog search and custom tool entry
- Status workflow: Discovered → Under Review → Approved/Prohibited → Registered (linked to AI Registry)
- Risk indicators per tool (7 indicator types)
- Premium gating via entitlement service
- 8 demo shadow AI reports across all statuses
- Seed script for tool catalog (`seed-shadow-ai-tools.ts`)

### Phase 4 — Future

**Goal**: Market differentiation, cross-product integration, AI-assisted features.

**Scope** (planned):
- Shared authentication with DPO Central (single sign-on)
- AI-assisted risk classification suggestions (Claude for automated preliminary classification)
- Public AI Registry portal (Art. 49 compliance — public-facing registry of high-risk AI systems)
- Board-ready PDF reporting (executive summaries, compliance posture reports)
- Agentic AI governance features (agent chain tracing, multi-agent system mapping)
- Cross-app name resolution API
- Unified TODO.LAW product portal
- Internationalization (i18n)

---

## 12. Reference Architecture

### 12.1 DPO Central Patterns to Mirror

The following files in DPO Central establish the patterns that AI SENTINEL should replicate:

| Pattern | DPO Central File | Purpose |
|---------|-----------------|---------|
| Multi-tenancy | `prisma/schema.prisma` | `organizationId` on all models, enum conventions, relation patterns |
| Org middleware | `src/server/trpc.ts` | `organizationProcedure` that injects org context into all queries |
| Brand config | `src/config/brand.ts` | Environment-variable-driven brand configuration |
| Premium gating | `src/server/services/licensing/entitlement.ts` | Feature entitlement checks |
| Dashboard shell | `src/components/dashboard-shell.tsx` | Responsive nav layout |
| Module list pages | `src/app/(dashboard)/privacy/*/page.tsx` | Consistent search/tabs/list patterns |
| Debounce hook | `src/hooks/use-debounce.ts` | Reusable 300ms debounce |
| Auth config | `src/lib/auth.ts` | NextAuth with auto-join by domain |

### 12.2 Key Architectural Decisions

1. **Separate database**: AI SENTINEL uses its own Neon PostgreSQL database. No shared tables with DPO Central to maintain clean separation and independent deployment.

2. **Loose coupling via reference IDs**: Cross-references to DPO Central are optional string fields, not foreign keys. The UI renders them as external links. This means either app can function fully without the other.

3. **Same billing model**: Stripe add-on billing with per-feature pricing. Any org member can purchase. In-app cancellation per feature.

4. **Same auth model**: Google OAuth + Email magic links via Resend. Same auto-join-by-domain pattern. JWT sessions.

5. **Same licensing service pattern**: Premium features gated by skill packages and entitlements. `EnableFeatureModal` for upgrade prompts. Lock badges on premium features.

---

*This specification is a living document. It will be updated as development progresses and requirements evolve.*

*AI SENTINEL is a TODO.LAW service.*
