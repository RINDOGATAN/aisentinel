-- The hosted pilot disclosure, acknowledged once per person per wording
-- version, with its date. See src/config/pilot-disclosure.ts.

-- CreateTable
CREATE TABLE "pilot_disclosure_acknowledgements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pilot_disclosure_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pilot_disclosure_acknowledgements_userId_version_key" ON "pilot_disclosure_acknowledgements"("userId", "version");

-- CreateIndex
CREATE INDEX "pilot_disclosure_acknowledgements_userId_idx" ON "pilot_disclosure_acknowledgements"("userId");

-- AddForeignKey
ALTER TABLE "pilot_disclosure_acknowledgements" ADD CONSTRAINT "pilot_disclosure_acknowledgements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
