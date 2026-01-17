-- CreateTable
CREATE TABLE "MerchantGoodsPost" (
    "id" SERIAL NOT NULL,
    "startingPoint" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "goodsType" TEXT NOT NULL,
    "goodsWeight" DOUBLE PRECISION NOT NULL,
    "goodsWeightUnit" TEXT NOT NULL,
    "loadingDate" TIMESTAMP(3) NOT NULL,
    "vehicleTypeDesired" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantGoodsPost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MerchantGoodsPost" ADD CONSTRAINT "MerchantGoodsPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
