-- Per-system California ADMT determination, plus the second applicability axis
-- on compliance requirements.
--
-- Two things the existing model could not express:
--
--   1. Whether a technology is ADMT at all. Cal. Code Regs. tit. 11 § 7001(e)
--      turns on whether a human reviewer (A) knows how to interpret the output,
--      (B) reviews it against other relevant information, and (C) has authority
--      to change the decision. That test is CONJUNCTIVE, so the three prongs are
--      stored separately: recording only the conclusion would destroy the audit
--      trail a regulator asks for, and the UI could not explain which prong
--      decided the answer.
--
--   2. Which requirements apply. ComplianceRequirement.applicableTo is keyed to
--      EU AI Act risk tiers; ADMT applicability turns on significant-decision
--      domains (§ 7001(ddd)), risk-assessment triggers (§ 7150(b)) and whether
--      the organization operates in California. applicabilityTags carries those
--      labels; src/config/admt-rules.ts owns the logic that selects them.
--
-- NOTE on the tag axis: every ADMT requirement is seeded with applicableTo = []
-- so the five existing auto-mapping call sites — all of which query
-- `applicableTo has <riskLevel>` with no framework filter — can never match an
-- ADMT row. That is what keeps ~50 new requirements structurally invisible to
-- systems they do not concern.
--
-- Additive only; no existing row is modified.

-- CreateEnum
-- The § 7001(e) determination. Four states, not a boolean: "excluded because
-- enumerated in § 7001(e)(3)" (spellcheck, firewalls, spreadsheets…) is legally
-- distinct from "not ADMT because a human genuinely decides", and the two
-- produce different evidence.
CREATE TYPE "AdmtDetermination" AS ENUM (
    'NOT_ASSESSED',
    'NOT_ADMT',
    'ADMT',
    'ADMT_EXCLUDED_7001_E_3'
);

-- CreateEnum
-- One § 7001(e)(1) prong. NOT_ASSESSED is a real third state: "we have not
-- looked at whether the reviewer is trained" is not "no".
CREATE TYPE "AdmtProngStatus" AS ENUM (
    'NOT_ASSESSED',
    'SATISFIED',
    'NOT_SATISFIED'
);

-- CreateEnum
-- Feeds § 7220(c)(5)(B) and § 7222(b)(3) notice text verbatim. A boolean would
-- force asserting "not the sole factor" for a system nobody has examined.
CREATE TYPE "AdmtSoleFactor" AS ENUM (
    'NOT_ASSESSED',
    'SOLE_FACTOR',
    'ONE_OF_SEVERAL',
    'NOT_USED'
);

-- CreateEnum
-- The CLOSED list of § 7221(b) opt-out exceptions. There are exactly three.
-- Security, fraud and physical safety are NOT opt-out exceptions — they survive
-- only as disclosure-scope limiters under § 7220(d) and § 7222(c). Encoding the
-- closed list here makes that very common practitioner error unrepresentable.
CREATE TYPE "AdmtOptOutBasis" AS ENUM (
    'NOT_ASSESSED',
    'NONE_OPT_OUT_OFFERED',
    'HUMAN_APPEAL_7221_B_1',
    'ADMISSION_ACCEPTANCE_HIRING_7221_B_2',
    'ALLOCATION_COMPENSATION_7221_B_3'
);

-- CreateTable
CREATE TABLE "admt_profiles" (
    "id" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "determination" "AdmtDetermination" NOT NULL DEFAULT 'NOT_ASSESSED',
    "prongInterpretOutput" "AdmtProngStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "prongReviewsOutputAndOtherInfo" "AdmtProngStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "prongAuthorityToChange" "AdmtProngStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "significantDecisionDomains" TEXT[],
    "riskAssessmentTriggers" TEXT[],
    "soleFactor" "AdmtSoleFactor" NOT NULL DEFAULT 'NOT_ASSESSED',
    "nonQualifyingHumanRole" TEXT,
    "optOutBasis" "AdmtOptOutBasis" NOT NULL DEFAULT 'NOT_ASSESSED',
    "designatedReviewer" TEXT,
    "appealRouteDescription" TEXT,
    "worksForPurposeEvidence" TEXT,
    "nonDiscriminationEvidence" TEXT,
    "processingInitiatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "reviewedBy" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "provenance" "Provenance" NOT NULL DEFAULT 'USER_ENTERED',
    "sourceRef" TEXT,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "admt_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admt_profiles_aiSystemId_key" ON "admt_profiles"("aiSystemId");

-- CreateIndex
CREATE INDEX "admt_profiles_organizationId_idx" ON "admt_profiles"("organizationId");

-- AddForeignKey
ALTER TABLE "admt_profiles" ADD CONSTRAINT "admt_profiles_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admt_profiles" ADD CONSTRAINT "admt_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
-- The second applicability axis. Empty for every existing requirement, so no
-- current query changes behaviour.
ALTER TABLE "compliance_requirements" ADD COLUMN "applicabilityTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
-- GIN so `applicabilityTags hasSome [...]` stays indexed as the framework grows.
CREATE INDEX "compliance_requirements_applicabilityTags_idx" ON "compliance_requirements" USING GIN ("applicabilityTags");
