/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { useEffect } from "react";
import { useNavigate, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import "../styles/dash-theme.css";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  await prisma.store.create({
    data: {
      shop: session.shop,
      name: data.name,
      address: data.address,
      city: data.city,
      province: data.province,
      country: data.country,
      zip: data.zip,
      phone: data.phone,
      email: data.email,
      website: data.website,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
      hours: data.hours,
      gbpId: data.gbpId,
    },
  });

  return { success: true };
};

export default function NewStore() {
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.data?.success) {
      navigate("/app/stores");
    }
  }, [fetcher.data, navigate]);

  return (
    <s-page
      heading="Add New Store"
      back-action={{ content: "Stores", onAction: () => navigate("/app/stores") }}
      suppressHydrationWarning
    >
      <div className="dash-surface">
        <div className="dash-toolbar">
          <button
            type="button"
            className="dash-btn-primary"
            disabled={isSubmitting}
            onClick={() => fetcher.submit(document.querySelector("form"))}
          >
            {isSubmitting ? "Saving…" : "Save store"}
          </button>
        </div>

        <form method="post">
          <div className="dash-layout">
            <div>
              <div className="dash-card">
                <div className="dash-form-stack">
                  <h2 className="dash-card-title">General information</h2>
                  <s-text-field label="Store Name" name="name" placeholder="e.g. JIKA Downtown" required />

                  <div>
                    <h3 className="dash-card-title" style={{ fontSize: "1rem", marginBottom: 12 }}>
                      Location details
                    </h3>
                    <div className="dash-form-stack">
                      <s-text-field label="Street Address" name="address" placeholder="123 Fashion St." required />
                      <div className="dash-two-col dash-two-col--2-1">
                        <s-text-field label="City" name="city" />
                        <s-text-field label="Province / State" name="province" />
                      </div>
                      <div className="dash-two-col">
                        <s-text-field label="Country" name="country" />
                        <s-text-field label="Zip / Postal Code" name="zip" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="dash-card">
                <div className="dash-form-stack">
                  <h2 className="dash-card-title">Contact & online</h2>
                  <div className="dash-two-col">
                    <s-text-field label="Phone Number" name="phone" type="tel" />
                    <s-text-field label="Email Address" name="email" type="email" />
                  </div>
                  <s-text-field label="Store Website URL" name="website" type="url" placeholder="https://..." />
                </div>
              </div>
            </div>

            <div>
              <div className="dash-card">
                <div className="dash-form-stack">
                  <h2 className="dash-card-title">Map coordinates</h2>
                  <p className="dash-subtle">Coordinates pin the store accurately on Google Maps.</p>
                  <div className="dash-two-col">
                    <s-text-field label="Latitude" name="latitude" type="number" step="any" placeholder="40.7128" />
                    <s-text-field label="Longitude" name="longitude" type="number" step="any" placeholder="-74.0060" />
                  </div>
                </div>
              </div>

              <div className="dash-card">
                <div className="dash-form-stack">
                  <h2 className="dash-card-title">Opening hours</h2>
                  <s-text-field
                    label="Schedule"
                    name="hours"
                    multiline
                    rows={4}
                    placeholder={"Mon-Fri: 9:00 - 20:00\nSat: 10:00 - 18:00"}
                  />
                </div>
              </div>

              <div className="dash-card">
                <div className="dash-form-stack">
                  <h2 className="dash-card-title">Google integration</h2>
                  <s-text-field label="Google Business Profile ID" name="gbpId" placeholder="Place ID or GBP ID" />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </s-page>
  );
}
