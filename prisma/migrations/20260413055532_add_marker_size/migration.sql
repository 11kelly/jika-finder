-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "googleMapsApiKey" TEXT,
    "googleMapId" TEXT,
    "layout" TEXT NOT NULL DEFAULT 'classic',
    "primaryColor" TEXT NOT NULL DEFAULT '#000000',
    "secondaryColor" TEXT NOT NULL DEFAULT '#666666',
    "accentColor" TEXT NOT NULL DEFAULT '#000000',
    "textColor" TEXT NOT NULL DEFAULT '#333333',
    "bgColor" TEXT NOT NULL DEFAULT '#ffffff',
    "markerColor" TEXT NOT NULL DEFAULT '#ff0000',
    "markerSize" INTEGER NOT NULL DEFAULT 32,
    "markerIconUrl" TEXT,
    "mapStyle" TEXT NOT NULL DEFAULT 'default',
    "mapType" TEXT NOT NULL DEFAULT 'roadmap',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("accentColor", "bgColor", "createdAt", "googleMapId", "googleMapsApiKey", "id", "layout", "mapStyle", "mapType", "markerColor", "markerIconUrl", "primaryColor", "secondaryColor", "shop", "textColor", "updatedAt") SELECT "accentColor", "bgColor", "createdAt", "googleMapId", "googleMapsApiKey", "id", "layout", "mapStyle", "mapType", "markerColor", "markerIconUrl", "primaryColor", "secondaryColor", "shop", "textColor", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
