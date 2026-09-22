-- AIUC-1, the certification standard for AI agents, as a choosable compliance
-- framework (content in src/config/aiuc1-requirements.ts).
--
-- This ALTER TYPE is ALONE in its own migration on purpose: PostgreSQL forbids
-- USING a newly added enum value inside the transaction that adds it, and
-- Prisma wraps each migration file in a single transaction. Anything that
-- references 'AIUC_1' must therefore land in a later file (the seed does).
--
-- Additive only; no existing row is modified.

-- AlterEnum
ALTER TYPE "FrameworkCode" ADD VALUE 'AIUC_1';
