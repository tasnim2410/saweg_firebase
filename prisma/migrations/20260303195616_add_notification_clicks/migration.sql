-- CreateTable
CREATE TABLE "NotificationClick" (
    "id" TEXT NOT NULL,
    "notificationTag" TEXT,
    "url" TEXT,
    "postType" TEXT,
    "postId" INTEGER,
    "userId" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationClick_postType_postId_idx" ON "NotificationClick"("postType", "postId");

-- CreateIndex
CREATE INDEX "NotificationClick_timestamp_idx" ON "NotificationClick"("timestamp");

-- CreateIndex
CREATE INDEX "NotificationClick_userId_idx" ON "NotificationClick"("userId");
