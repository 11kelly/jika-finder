/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { authenticate } from "../shopify.server";
import { deleteAllAppDataForShop } from "../shop-data.server";

/**
 * Mandatory compliance webhook: shop/redact
 * https://shopify.dev/docs/apps/store/mandatory-webhooks
 *
 * Shopify sends this after uninstall (delayed). Remove all app data for the shop.
 */
export const action = async ({ request }) => {
  const { shop } = await authenticate.webhook(request);

  if (shop) {
    await deleteAllAppDataForShop(shop);
  }

  return new Response(null, { status: 200 });
};
