-- Hosted pilot: the start of an organization's 90 editing days (its first
-- sign-in after the pilot went live). Nullable; the kit never sets it.
ALTER TABLE "organizations" ADD COLUMN "pilotFirstSignInAt" TIMESTAMP(3);
