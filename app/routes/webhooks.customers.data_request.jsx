/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { authenticate } from "../shopify.server";

/**
 * Mandatory compliance webhook: customers/data_request
 * https://shopify.dev/docs/apps/store/mandatory-webhooks
 *
 * Acknowledges the request. This app does not persist Shopify customer PII keyed by customer id.
 * If you later store order/customer data, return or attach that data per Shopify guidance.
 */
export const action = async ({ request }) => {
  await authenticate.webhook(request);

  return new Response(null, { status: 200 });
};
