-- California CCPA ADMT regulations (Cal. Code Regs. tit. 11, §§ 7001–7222) as a
-- fourth compliance framework.
--
-- This ALTER TYPE is ALONE in its own migration on purpose: PostgreSQL forbids
-- USING a newly added enum value inside the transaction that adds it, and
-- Prisma wraps each migration file in a single transaction. Anything that
-- references 'CA_CCPA_ADMT' must therefore land in a later file.
--
-- Additive only; no existing row is modified.

-- AlterEnum
ALTER TYPE "FrameworkCode" ADD VALUE 'CA_CCPA_ADMT';
