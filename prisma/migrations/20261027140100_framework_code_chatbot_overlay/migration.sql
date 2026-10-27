-- The framework code the customer-facing chatbot overlay's control rows are
-- seeded under (scripts/seed-chatbot-overlay.ts). The overlay is never a
-- framework the organisation chooses; its rows reach a system only through
-- the system's own facts, and only while CHATBOT_OVERLAY_ENABLED is "true".
--
-- Alone in its migration: a new enum value cannot be used in the
-- transaction that adds it.
--
-- Additive only; no existing row is modified.

-- AlterEnum
ALTER TYPE "FrameworkCode" ADD VALUE 'CHATBOT_OVERLAY';
