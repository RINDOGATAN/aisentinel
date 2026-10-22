-- Vendor catalogue: the vendor's statement on training use and retention.
-- Additive only: two nullable columns, no data change.
ALTER TABLE "vendor_catalog" ADD COLUMN "trainingUse" TEXT;
ALTER TABLE "vendor_catalog" ADD COLUMN "retention" TEXT;
