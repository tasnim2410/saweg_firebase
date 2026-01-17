-- CreateEnum
CREATE TYPE "BudgetCurrency" AS ENUM ('TND', 'LYD', 'EGP');

-- AlterTable
ALTER TABLE "MerchantGoodsPost" ADD COLUMN     "budget" DOUBLE PRECISION,
ADD COLUMN     "budgetCurrency" "BudgetCurrency";
