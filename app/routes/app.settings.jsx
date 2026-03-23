/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import "../styles/dash-theme.css";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  let settings = await prisma.settings.findUnique({
    where: { shop: session.shop },
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: { shop: session.shop },
    });
  }

  return { settings };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  const settings = await prisma.settings.upsert({
    where: { shop: session.shop },
    update: {
      googleMapsApiKey: data.googleMapsApiKey,
      layout: data.layout,
    },
    create: {
      shop: session.shop,
      googleMapsApiKey: data.googleMapsApiKey,
      layout: data.layout,
    },
  });

  return { settings, success: true };
};

export default function Settings() {
  const { settings } = useLoaderData();
  const fetcher = useFetcher();

  const isSubmitting = fetcher.state === "submitting";
  const layoutValue = settings.layout || "classic";

  return (
    <s-page heading="Settings" suppressHydrationWarning>
      <div className="dash-surface">
        <div className="dash-toolbar">
          <button
            type="button"
            className="dash-btn-primary"
            disabled={isSubmitting}
            onClick={() => fetcher.submit(document.querySelector("form"))}
          >
            {isSubmitting ? "Saving…" : "Save settings"}
          </button>
        </div>

        <form method="post">
          <div className="dash-form-stack">
            <div className="dash-card">
              <div className="dash-form-stack">
                <h2 className="dash-card-title">Google Maps integration</h2>
                <p className="dash-subtle">
                  To display your stores on a map, provide a Google Maps API key. Learn how in the{" "}
                  <a
                    className="dash-inline-link"
                    href="https://developers.google.com/maps/documentation/javascript/get-api-key"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google documentation
                  </a>
                  .
                </p>
                <s-text-field
                  label="Google Maps API Key"
                  name="googleMapsApiKey"
                  defaultValue={settings.googleMapsApiKey}
                />
              </div>
            </div>

            <div className="dash-card">
              <div className="dash-form-stack">
                <h2 className="dash-card-title">Layout selection</h2>
                <p className="dash-subtle">Choose how the storefront store finder block is laid out.</p>
                <s-radio-button
                  label="Classic"
                  name="layout"
                  value="classic"
                  checked={layoutValue === "classic"}
                />
                <s-radio-button
                  label="Mobile-First"
                  name="layout"
                  value="mobile-first"
                  checked={layoutValue === "mobile-first"}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </s-page>
  );
}
