/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import prisma from "./db.server";

/**
 * Deletes all app-persisted data for a shop (sessions, settings, stores).
 * Used for app/uninstalled, shop/redact, and idempotent compliance cleanup.
 *
 * @param {string} shop - Shop domain (e.g. example.myshopify.com)
 */
export async function deleteAllAppDataForShop(shop) {
  if (!shop || typeof shop !== "string") {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.store.deleteMany({ where: { shop } });
    await tx.settings.deleteMany({ where: { shop } });
    await tx.session.deleteMany({ where: { shop } });
  });
}
