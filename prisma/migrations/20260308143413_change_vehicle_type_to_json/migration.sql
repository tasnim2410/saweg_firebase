/*
  Warnings:

  - The `vehicleTypeDesired` column on the `MerchantGoodsPost` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "MerchantGoodsPost" DROP COLUMN "vehicleTypeDesired",
ADD COLUMN     "vehicleTypeDesired" JSONB;
