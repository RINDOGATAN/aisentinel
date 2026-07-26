-- Record who put an assessment up for review, so approval can tell a
-- self-review apart from a genuine second pair of eyes.
ALTER TABLE "ai_assessments" ADD COLUMN "submittedBy" TEXT;
ALTER TABLE "ai_assessments" ADD COLUMN "submittedAt" TIMESTAMP(3);
