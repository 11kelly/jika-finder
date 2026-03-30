/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * Mandatory compliance webhook: customers/redact
 * https://shopify.dev/docs/apps/store/mandatory-webhooks
 *
 * Branches / store locations may use an email field for the location’s business contact.
 * If it matches the redacted customer email for this shop, remove that PII from branch records.
 */
export const action = async ({ request }) => {
  const { payload, shop } = await authenticate.webhook(request);

  const customerEmail =
    typeof payload?.customer?.email === "string" ? payload.customer.email.trim() : null;

  if (customerEmail && shop) {
    await prisma.store.updateMany({
      where: {
        shop,
        email: customerEmail,
      },
      data: { email: null },
    });
  }

  return new Response(null, { status: 200 });
};
