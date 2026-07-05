-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('BUSINESS_USER', 'AI_GOVERNANCE_CONSULTANT');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'AI_OFFICER', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "AITechnique" AS ENUM ('MACHINE_LEARNING', 'DEEP_LEARNING', 'GENERATIVE_AI', 'AGENTIC_AI', 'NLP', 'COMPUTER_VISION', 'SPEECH_RECOGNITION', 'ROBOTICS', 'RULE_BASED', 'EXPERT_SYSTEM', 'STATISTICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AISystemRole" AS ENUM ('PROVIDER', 'DEPLOYER', 'IMPORTER', 'DISTRIBUTOR', 'USER');

-- CreateEnum
CREATE TYPE "AISystemStatus" AS ENUM ('DRAFT', 'DEVELOPMENT', 'TESTING', 'DEPLOYED', 'RETIRED');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('TRAINING', 'FINE_TUNING', 'VALIDATION', 'INPUT', 'OUTPUT');

-- CreateEnum
CREATE TYPE "AIRiskLevel" AS ENUM ('UNACCEPTABLE', 'HIGH', 'LIMITED', 'MINIMAL');

-- CreateEnum
CREATE TYPE "AIAssessmentType" AS ENUM ('FRIA', 'CONFORMITY', 'AI_RISK', 'BIAS_FAIRNESS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GateType" AS ENUM ('PRE_DEPLOYMENT', 'POST_DEPLOYMENT', 'PERIODIC_REVIEW', 'INCIDENT_TRIGGERED', 'MATERIAL_CHANGE');

-- CreateEnum
CREATE TYPE "GateStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'PASSED', 'FAILED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "OversightDecisionType" AS ENUM ('APPROVE', 'REJECT', 'DEFER');

-- CreateEnum
CREATE TYPE "AIIncidentType" AS ENUM ('HALLUCINATION', 'BIAS_DISCRIMINATION', 'MODEL_DRIFT', 'ADVERSARIAL_ATTACK', 'PROMPT_INJECTION', 'UNAUTHORIZED_ACCESS', 'SAFETY_FAILURE', 'PERFORMANCE_DEGRADATION', 'DATA_POISONING', 'PRIVACY_VIOLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'INVESTIGATING', 'MITIGATING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "FrameworkCode" AS ENUM ('EU_AI_ACT', 'NIST_AI_RMF', 'ISO_42001');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE', 'NOT_ASSESSED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('POLICY', 'DOCUMENT', 'TEST_RESULT', 'MONITORING', 'AUDIT', 'TRAINING', 'APPROVAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ShadowAIStatus" AS ENUM ('DISCOVERED', 'UNDER_REVIEW', 'APPROVED', 'PROHIBITED', 'REGISTERED');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('SAAS', 'SELF_HOSTED');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('TRIAL', 'SUBSCRIPTION', 'PERPETUAL');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'UNDER_REVIEW', 'APPROVED', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "VendorRiskLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "VendorAssessmentStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('AI_USAGE', 'AI_GOVERNANCE', 'AI_ETHICS', 'AI_RISK_MANAGEMENT', 'AI_DATA_GOVERNANCE', 'AI_PROCUREMENT', 'AI_INCIDENT_RESPONSE', 'AI_TRANSPARENCY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "userType" "UserType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logoUrl" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "invitedEmail" TEXT,
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_systems" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "technique" "AITechnique" NOT NULL,
    "role" "AISystemRole" NOT NULL,
    "status" "AISystemStatus" NOT NULL DEFAULT 'DRAFT',
    "purpose" TEXT,
    "businessOwner" TEXT,
    "technicalOwner" TEXT,
    "deploymentDate" TIMESTAMP(3),
    "retirementDate" TIMESTAMP(3),
    "processesPersonalData" BOOLEAN NOT NULL DEFAULT false,
    "dpoCentralVendorId" TEXT,
    "dpoCentralAssetIds" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vendorId" TEXT,

    CONSTRAINT "ai_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "modelType" TEXT,
    "version" TEXT,
    "trainingDataSummary" TEXT,
    "knownLimitations" TEXT,
    "performanceMetrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_system_data_sources" (
    "id" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" "DataSourceType" NOT NULL,
    "description" TEXT,
    "containsPersonalData" BOOLEAN NOT NULL DEFAULT false,
    "dataCategories" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_system_data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_classifications" (
    "id" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riskLevel" "AIRiskLevel" NOT NULL,
    "rationale" TEXT NOT NULL,
    "annexIIICategory" TEXT,
    "classifiedBy" TEXT NOT NULL,
    "classifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_classification_history" (
    "id" TEXT NOT NULL,
    "riskClassificationId" TEXT NOT NULL,
    "previousLevel" "AIRiskLevel" NOT NULL,
    "newLevel" "AIRiskLevel" NOT NULL,
    "rationale" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_classification_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_assessment_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "type" "AIAssessmentType" NOT NULL,
    "description" TEXT,
    "sections" JSONB NOT NULL,
    "frameworkRef" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_assessment_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_assessments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AIAssessmentType" NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "riskScore" DOUBLE PRECISION,
    "responses" JSONB,
    "mitigations" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oversight_gates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "gateType" "GateType" NOT NULL,
    "description" TEXT,
    "status" "GateStatus" NOT NULL DEFAULT 'PENDING',
    "reviewCadence" TEXT,
    "nextReviewDate" TIMESTAMP(3),
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oversight_gates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oversight_decisions" (
    "id" TEXT NOT NULL,
    "gateId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "decision" "OversightDecisionType" NOT NULL,
    "rationale" TEXT NOT NULL,
    "evidenceReviewed" TEXT[],
    "decidedBy" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oversight_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_incidents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aiSystemId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "AIIncidentType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "rootCauseCategory" TEXT,
    "rootCauseDescription" TEXT,
    "impactDescription" TEXT,
    "notificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAuthorities" TEXT[],
    "dpoCentralIncidentId" TEXT,
    "reportedBy" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_incident_timelines" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_incident_timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_incident_tasks" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_incident_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_incident_notifications" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "dueBy" TIMESTAMP(3),
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ai_incident_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_frameworks" (
    "id" TEXT NOT NULL,
    "code" "FrameworkCode" NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_frameworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_requirements" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "applicableTo" "AIRiskLevel"[],
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_mappings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "evidence" TEXT,
    "notes" TEXT,
    "assessedBy" TEXT,
    "assessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_evidence" (
    "id" TEXT NOT NULL,
    "complianceMappingId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "description" TEXT,
    "addedBy" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_framework_mappings" (
    "id" TEXT NOT NULL,
    "requirementAId" TEXT NOT NULL,
    "requirementBId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'equivalent',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cross_framework_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shadow_ai_tools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "riskIndicators" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shadow_ai_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shadow_ai_reports" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "toolId" TEXT,
    "toolName" TEXT NOT NULL,
    "status" "ShadowAIStatus" NOT NULL DEFAULT 'DISCOVERED',
    "reportedBy" TEXT,
    "department" TEXT,
    "usageDescription" TEXT,
    "registeredSystemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shadow_ai_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_packages" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "assessmentType" "AIAssessmentType",
    "description" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stripePriceId" TEXT,
    "priceAmount" INTEGER,
    "priceCurrency" TEXT DEFAULT 'eur',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_organizations" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_entitlements" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "skillPackageId" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "licenseType" "LicenseType" NOT NULL,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeSubscriptionId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_vendors" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "riskLevel" "VendorRiskLevel",
    "status" "VendorStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
    "dueDiligenceDate" TIMESTAMP(3),
    "contractStartDate" TIMESTAMP(3),
    "contractExpiryDate" TIMESTAMP(3),
    "dpoCentralVendorId" TEXT,
    "notes" TEXT,
    "catalogSlug" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_vendor_assessments" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "VendorAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "riskScore" DOUBLE PRECISION,
    "responses" JSONB,
    "findings" TEXT,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_vendor_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_catalog" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "website" TEXT,
    "privacyPolicyUrl" TEXT,
    "trustCenterUrl" TEXT,
    "dpaUrl" TEXT,
    "securityPageUrl" TEXT,
    "certifications" TEXT[],
    "frameworks" TEXT[],
    "gdprCompliant" BOOLEAN,
    "ccpaCompliant" BOOLEAN,
    "euAiActCompliant" BOOLEAN,
    "hipaaCompliant" BOOLEAN,
    "dpaComplianceScore" INTEGER,
    "dpaGdprScore" INTEGER,
    "dpaCcpaScore" INTEGER,
    "dataLocations" TEXT[],
    "hasEuDataCenter" BOOLEAN,
    "subprocessors" JSONB,
    "transferSafeguards" TEXT,
    "supportsDsars" BOOLEAN,
    "hasDesignatedDpo" BOOLEAN,
    "hasRecentBreach" BOOLEAN,
    "aiCapabilities" TEXT[],
    "modelHosting" TEXT,
    "aiModels" JSONB,
    "aiTechniques" TEXT[],
    "euAiActRole" TEXT,
    "euAiActAnnexIIIDomains" TEXT[],
    "iso42001Certified" BOOLEAN,
    "supportsAuditLogs" BOOLEAN,
    "supportsExplainability" BOOLEAN,
    "hasBiasMonitoring" BOOLEAN,
    "hasModelCard" BOOLEAN,
    "aiIncidentNotificationSLA" TEXT,
    "dataProcessingTransparency" TEXT,
    "logoUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "PolicyType" NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_policy_versions" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "changeNotes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_policy_system_links" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,

    CONSTRAINT "ai_policy_system_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "page" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "ai_systems_organizationId_idx" ON "ai_systems"("organizationId");

-- CreateIndex
CREATE INDEX "ai_systems_vendorId_idx" ON "ai_systems"("vendorId");

-- CreateIndex
CREATE INDEX "ai_models_aiSystemId_idx" ON "ai_models"("aiSystemId");

-- CreateIndex
CREATE INDEX "ai_models_organizationId_idx" ON "ai_models"("organizationId");

-- CreateIndex
CREATE INDEX "ai_system_data_sources_aiSystemId_idx" ON "ai_system_data_sources"("aiSystemId");

-- CreateIndex
CREATE INDEX "ai_system_data_sources_organizationId_idx" ON "ai_system_data_sources"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "risk_classifications_aiSystemId_key" ON "risk_classifications"("aiSystemId");

-- CreateIndex
CREATE INDEX "risk_classifications_organizationId_idx" ON "risk_classifications"("organizationId");

-- CreateIndex
CREATE INDEX "risk_classification_history_riskClassificationId_idx" ON "risk_classification_history"("riskClassificationId");

-- CreateIndex
CREATE INDEX "ai_assessment_templates_organizationId_idx" ON "ai_assessment_templates"("organizationId");

-- CreateIndex
CREATE INDEX "ai_assessments_organizationId_idx" ON "ai_assessments"("organizationId");

-- CreateIndex
CREATE INDEX "ai_assessments_aiSystemId_idx" ON "ai_assessments"("aiSystemId");

-- CreateIndex
CREATE INDEX "oversight_gates_organizationId_idx" ON "oversight_gates"("organizationId");

-- CreateIndex
CREATE INDEX "oversight_gates_aiSystemId_idx" ON "oversight_gates"("aiSystemId");

-- CreateIndex
CREATE INDEX "oversight_decisions_gateId_idx" ON "oversight_decisions"("gateId");

-- CreateIndex
CREATE INDEX "oversight_decisions_organizationId_idx" ON "oversight_decisions"("organizationId");

-- CreateIndex
CREATE INDEX "ai_incidents_organizationId_idx" ON "ai_incidents"("organizationId");

-- CreateIndex
CREATE INDEX "ai_incidents_aiSystemId_idx" ON "ai_incidents"("aiSystemId");

-- CreateIndex
CREATE INDEX "ai_incident_timelines_incidentId_idx" ON "ai_incident_timelines"("incidentId");

-- CreateIndex
CREATE INDEX "ai_incident_timelines_organizationId_idx" ON "ai_incident_timelines"("organizationId");

-- CreateIndex
CREATE INDEX "ai_incident_tasks_incidentId_idx" ON "ai_incident_tasks"("incidentId");

-- CreateIndex
CREATE INDEX "ai_incident_tasks_organizationId_idx" ON "ai_incident_tasks"("organizationId");

-- CreateIndex
CREATE INDEX "ai_incident_notifications_incidentId_idx" ON "ai_incident_notifications"("incidentId");

-- CreateIndex
CREATE INDEX "ai_incident_notifications_organizationId_idx" ON "ai_incident_notifications"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_frameworks_code_key" ON "compliance_frameworks"("code");

-- CreateIndex
CREATE INDEX "compliance_requirements_frameworkId_idx" ON "compliance_requirements"("frameworkId");

-- CreateIndex
CREATE INDEX "compliance_requirements_parentId_idx" ON "compliance_requirements"("parentId");

-- CreateIndex
CREATE INDEX "compliance_mappings_organizationId_idx" ON "compliance_mappings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_mappings_aiSystemId_requirementId_key" ON "compliance_mappings"("aiSystemId", "requirementId");

-- CreateIndex
CREATE INDEX "compliance_evidence_complianceMappingId_idx" ON "compliance_evidence"("complianceMappingId");

-- CreateIndex
CREATE INDEX "compliance_evidence_organizationId_idx" ON "compliance_evidence"("organizationId");

-- CreateIndex
CREATE INDEX "cross_framework_mappings_requirementAId_idx" ON "cross_framework_mappings"("requirementAId");

-- CreateIndex
CREATE INDEX "cross_framework_mappings_requirementBId_idx" ON "cross_framework_mappings"("requirementBId");

-- CreateIndex
CREATE UNIQUE INDEX "cross_framework_mappings_requirementAId_requirementBId_key" ON "cross_framework_mappings"("requirementAId", "requirementBId");

-- CreateIndex
CREATE INDEX "shadow_ai_reports_organizationId_idx" ON "shadow_ai_reports"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_packages_skillId_key" ON "skill_packages"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customer_organizations_organizationId_idx" ON "customer_organizations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_organizations_customerId_organizationId_key" ON "customer_organizations"("customerId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_entitlements_licenseKey_key" ON "skill_entitlements"("licenseKey");

-- CreateIndex
CREATE INDEX "skill_entitlements_status_idx" ON "skill_entitlements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "skill_entitlements_customerId_skillPackageId_key" ON "skill_entitlements"("customerId", "skillPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE INDEX "ai_vendors_organizationId_idx" ON "ai_vendors"("organizationId");

-- CreateIndex
CREATE INDEX "ai_vendors_catalogSlug_idx" ON "ai_vendors"("catalogSlug");

-- CreateIndex
CREATE INDEX "ai_vendor_assessments_vendorId_idx" ON "ai_vendor_assessments"("vendorId");

-- CreateIndex
CREATE INDEX "ai_vendor_assessments_organizationId_idx" ON "ai_vendor_assessments"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_catalog_slug_key" ON "vendor_catalog"("slug");

-- CreateIndex
CREATE INDEX "vendor_catalog_category_idx" ON "vendor_catalog"("category");

-- CreateIndex
CREATE INDEX "vendor_catalog_name_idx" ON "vendor_catalog"("name");

-- CreateIndex
CREATE INDEX "ai_policies_organizationId_idx" ON "ai_policies"("organizationId");

-- CreateIndex
CREATE INDEX "ai_policy_versions_policyId_idx" ON "ai_policy_versions"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_policy_system_links_policyId_aiSystemId_key" ON "ai_policy_system_links"("policyId", "aiSystemId");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_systems" ADD CONSTRAINT "ai_systems_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_systems" ADD CONSTRAINT "ai_systems_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ai_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_system_data_sources" ADD CONSTRAINT "ai_system_data_sources_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_system_data_sources" ADD CONSTRAINT "ai_system_data_sources_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_classifications" ADD CONSTRAINT "risk_classifications_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_classifications" ADD CONSTRAINT "risk_classifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_classification_history" ADD CONSTRAINT "risk_classification_history_riskClassificationId_fkey" FOREIGN KEY ("riskClassificationId") REFERENCES "risk_classifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_assessment_templates" ADD CONSTRAINT "ai_assessment_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_assessments" ADD CONSTRAINT "ai_assessments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_assessments" ADD CONSTRAINT "ai_assessments_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_assessments" ADD CONSTRAINT "ai_assessments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ai_assessment_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oversight_gates" ADD CONSTRAINT "oversight_gates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oversight_gates" ADD CONSTRAINT "oversight_gates_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oversight_decisions" ADD CONSTRAINT "oversight_decisions_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "oversight_gates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oversight_decisions" ADD CONSTRAINT "oversight_decisions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_incidents" ADD CONSTRAINT "ai_incidents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_incidents" ADD CONSTRAINT "ai_incidents_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_incident_timelines" ADD CONSTRAINT "ai_incident_timelines_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "ai_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_incident_timelines" ADD CONSTRAINT "ai_incident_timelines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_incident_tasks" ADD CONSTRAINT "ai_incident_tasks_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "ai_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_incident_tasks" ADD CONSTRAINT "ai_incident_tasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_incident_notifications" ADD CONSTRAINT "ai_incident_notifications_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "ai_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_incident_notifications" ADD CONSTRAINT "ai_incident_notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_requirements" ADD CONSTRAINT "compliance_requirements_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "compliance_frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_requirements" ADD CONSTRAINT "compliance_requirements_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "compliance_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_mappings" ADD CONSTRAINT "compliance_mappings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_mappings" ADD CONSTRAINT "compliance_mappings_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_mappings" ADD CONSTRAINT "compliance_mappings_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "compliance_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence" ADD CONSTRAINT "compliance_evidence_complianceMappingId_fkey" FOREIGN KEY ("complianceMappingId") REFERENCES "compliance_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence" ADD CONSTRAINT "compliance_evidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_framework_mappings" ADD CONSTRAINT "cross_framework_mappings_requirementAId_fkey" FOREIGN KEY ("requirementAId") REFERENCES "compliance_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_framework_mappings" ADD CONSTRAINT "cross_framework_mappings_requirementBId_fkey" FOREIGN KEY ("requirementBId") REFERENCES "compliance_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shadow_ai_reports" ADD CONSTRAINT "shadow_ai_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shadow_ai_reports" ADD CONSTRAINT "shadow_ai_reports_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "shadow_ai_tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_organizations" ADD CONSTRAINT "customer_organizations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_organizations" ADD CONSTRAINT "customer_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_entitlements" ADD CONSTRAINT "skill_entitlements_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_entitlements" ADD CONSTRAINT "skill_entitlements_skillPackageId_fkey" FOREIGN KEY ("skillPackageId") REFERENCES "skill_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_vendors" ADD CONSTRAINT "ai_vendors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_vendors" ADD CONSTRAINT "ai_vendors_catalogSlug_fkey" FOREIGN KEY ("catalogSlug") REFERENCES "vendor_catalog"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_vendor_assessments" ADD CONSTRAINT "ai_vendor_assessments_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ai_vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_vendor_assessments" ADD CONSTRAINT "ai_vendor_assessments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_policies" ADD CONSTRAINT "ai_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_policy_versions" ADD CONSTRAINT "ai_policy_versions_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ai_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_policy_system_links" ADD CONSTRAINT "ai_policy_system_links_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ai_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_policy_system_links" ADD CONSTRAINT "ai_policy_system_links_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

