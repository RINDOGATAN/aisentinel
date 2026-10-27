-- Seven US states whose chatbot laws the customer-facing chatbot overlay
-- cites: Oregon, Idaho, Iowa, Nebraska, Hawaii, Maine and Nevada.
--
-- ALTER TYPE ... ADD VALUE is alone in this migration on purpose: PostgreSQL
-- forbids USING a newly added enum value inside the transaction that adds it,
-- and Prisma wraps each migration file in one transaction.
--
-- Additive only; no existing row is modified. The application offers these
-- places only while CHATBOT_OVERLAY_ENABLED is "true".

-- AlterEnum
ALTER TYPE "Jurisdiction" ADD VALUE 'US_OR';
ALTER TYPE "Jurisdiction" ADD VALUE 'US_ID';
ALTER TYPE "Jurisdiction" ADD VALUE 'US_IA';
ALTER TYPE "Jurisdiction" ADD VALUE 'US_NE';
ALTER TYPE "Jurisdiction" ADD VALUE 'US_HI';
ALTER TYPE "Jurisdiction" ADD VALUE 'US_ME';
ALTER TYPE "Jurisdiction" ADD VALUE 'US_NV';
