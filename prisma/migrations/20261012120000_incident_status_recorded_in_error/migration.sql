-- An incident entered by mistake can be marked RECORDED_IN_ERROR instead of
-- being deleted: the row and its timeline stay, and the status leaves it out
-- of counts, statutory deadlines and reports.
--
-- This ALTER TYPE is ALONE in its own migration on purpose: PostgreSQL forbids
-- USING a newly added enum value inside the transaction that adds it, and
-- Prisma wraps each migration file in a single transaction.
--
-- Additive only; no existing row is modified.

-- AlterEnum
ALTER TYPE "IncidentStatus" ADD VALUE 'RECORDED_IN_ERROR';
