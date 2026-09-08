-- Four regime frameworks for the "one assessment, five regimes" workflow:
-- GDPR (AI provisions), Colorado SB 26-189, Texas TRAIGA and the Washington
-- domain instruments.
--
-- ALTER TYPE ... ADD VALUE is alone in this migration on purpose: PostgreSQL
-- forbids USING a newly added enum value inside the transaction that adds it,
-- and Prisma wraps each migration file in one transaction. Anything that
-- references these values must land in a later file.
--
-- Additive only; no existing row is modified.

-- AlterEnum
ALTER TYPE "FrameworkCode" ADD VALUE 'EU_GDPR';
ALTER TYPE "FrameworkCode" ADD VALUE 'CO_SB_26_189';
ALTER TYPE "FrameworkCode" ADD VALUE 'TX_TRAIGA';
ALTER TYPE "FrameworkCode" ADD VALUE 'WA_AI_RULES';
