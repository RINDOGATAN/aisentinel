-- Hosted pilot: the account keeps the editing-window start of an organization
-- it leaves (deleted or removed from), and a new organization it creates starts
-- from it (src/server/services/pilot/account-trial.ts).
--
-- Additive and idempotent: one nullable column, no default, no backfill. No
-- existing row is modified; the column fills as accounts leave organizations.

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pilotTrialStartedAt" TIMESTAMP(3);
