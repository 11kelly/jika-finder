import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stores = await prisma.store.findMany({
    where: { shop: session.shop },
  });

  const settings = await prisma.settings.findUnique({
    where: { shop: session.shop },
  });

  return Response.json({ stores, settings });
};
