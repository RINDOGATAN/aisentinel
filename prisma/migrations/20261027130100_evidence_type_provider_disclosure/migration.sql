-- Evidence: a model provider's own published document (safety framework,
-- transparency report, model card) as a type of evidence. In its own file:
-- PostgreSQL cannot use a new enum value in the transaction that adds it.

-- AlterEnum
ALTER TYPE "EvidenceType" ADD VALUE 'PROVIDER_DISCLOSURE';
