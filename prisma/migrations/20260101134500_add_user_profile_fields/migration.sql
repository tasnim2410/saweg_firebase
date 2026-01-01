-- Add UserType enum and additional User profile fields

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserType') THEN
    CREATE TYPE "UserType" AS ENUM ('SHIPPER', 'MERCHANT', 'ADMIN');
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "type" "UserType" NOT NULL DEFAULT 'MERCHANT',
  ADD COLUMN IF NOT EXISTS "merchantCity" TEXT,
  ADD COLUMN IF NOT EXISTS "shipperCity" TEXT,
  ADD COLUMN IF NOT EXISTS "carKind" TEXT,
  ADD COLUMN IF NOT EXISTS "maxCharge" TEXT,
  ADD COLUMN IF NOT EXISTS "maxChargeUnit" TEXT,
  ADD COLUMN IF NOT EXISTS "trucksNeeded" TEXT,
  ADD COLUMN IF NOT EXISTS "placeOfBusiness" TEXT,
  ADD COLUMN IF NOT EXISTS "truckImage" TEXT;
