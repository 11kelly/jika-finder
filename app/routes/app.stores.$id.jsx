/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { useEffect } from "react";
import { useNavigate, useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import "../styles/dash-theme.css";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const store = await prisma.store.findFirst({
    where: { id: params.id, shop: session.shop },
  });

  if (!store) {
    throw new Response("Not Found", { status: 404 });
  }

  return { store };
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  if (request.method === "DELETE") {
    await prisma.store.delete({
      where: { id: params.id, shop: session.shop },
    });
    return { success: true, deleted: true };
  }

  await prisma.store.update({
    where: { id: params.id, shop: session.shop },
    data: {
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

export default function EditStore() {
  const { store } = useLoaderData();
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
      heading={`Edit ${store.name}`}
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
            {isSubmitting ? "Saving…" : "Save changes"}
          </button>
        </div>

        <form method="post">
          <div className="dash-layout">
            <div>
              <div className="dash-card">
                <div className="dash-form-stack">
                  <h2 className="dash-card-title">General information</h2>
                  <s-text-field label="Store Name" name="name" defaultValue={store.name} required />

                  <div>
                    <h3 className="dash-card-title" style={{ fontSize: "1rem", marginBottom: 12 }}>
                      Location details
                    </h3>
                    <div className="dash-form-stack">
                      <s-text-field label="Street Address" name="address" defaultValue={store.address} required />
                      <div className="dash-two-col dash-two-col--2-1">
                        <s-text-field label="City" name="city" defaultValue={store.city} />
                        <s-text-field label="Province / State" name="province" defaultValue={store.province} />
                      </div>
                      <div className="dash-two-col">
                        <s-text-field label="Country" name="country" defaultValue={store.country} />
                        <s-text-field label="Zip / Postal Code" name="zip" defaultValue={store.zip} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="dash-card">
                <div className="dash-form-stack">
                  <h2 className="dash-card-title">Contact & online</h2>
                  <div className="dash-two-col">
                    <s-text-field label="Phone Number" name="phone" type="tel" defaultValue={store.phone} />
                    <s-text-field label="Email Address" name="email" type="email" defaultValue={store.email} />
                  </div>
                  <s-text-field label="Store Website URL" name="website" type="url" defaultValue={store.website} />
                </div>
              </div>

              <div className="dash-card dash-card--danger">
                <div className="dash-form-stack">
                  <h2 className="dash-card-title" style={{ color: "#b91c1c" }}>
                    Danger zone
                  </h2>
                  <p className="dash-subtle">
                    Permanently delete this store location. This cannot be undone.
                  </p>
                  <button
                    type="button"
                    className="dash-btn-danger"
                    disabled={isSubmitting}
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this store?")) {
                        fetcher.submit({}, { method: "DELETE" });
                      }
                    }}
                  >
                    Delete store
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="dash-card">
                <div className="dash-form-stack">
                  <h2 className="dash-card-title">Map coordinates</h2>
                  <div className="dash-two-col">
                    <s-text-field label="Latitude" name="latitude" type="number" step="any" defaultValue={store.latitude} />
                    <s-text-field label="Longitude" name="longitude" type="number" step="any" defaultValue={store.longitude} />
                  </div>
                </div>
              </div>

              <div className="dash-card">
                <div className="dash-form-stack">
                  <h2 className="dash-card-title">Opening hours</h2>
                  <s-text-field label="Schedule" name="hours" multiline rows={6} defaultValue={store.hours} />
                </div>
              </div>

              <div className="dash-card">
                <div className="dash-form-stack">
                  <h2 className="dash-card-title">Google integration</h2>
                  <s-text-field label="Google Business Profile ID" name="gbpId" defaultValue={store.gbpId} />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </s-page>
  );
}
