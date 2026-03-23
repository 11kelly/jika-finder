-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "province" TEXT,
    "country" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "hours" TEXT,
    "gbpId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Store_shop_idx" ON "Store"("shop");
