/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import "../styles/dash-theme.css";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const stores = await prisma.store.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
  });

  return { stores };
};

export default function StoresIndex() {
  const { stores } = useLoaderData();
  const navigate = useNavigate();

  return (
    <s-page heading="Stores" suppressHydrationWarning>
      <div className="dash-surface">
        <div className="dash-toolbar dash-toolbar--split">
          <h2>Manage your store locations</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" className="dash-btn-secondary" onClick={() => navigate("/app/stores/import")}>
              Import CSV
            </button>
            <button type="button" className="dash-btn-primary" onClick={() => navigate("/app/stores/new")}>
              Add store
            </button>
          </div>
        </div>

        {stores.length === 0 ? (
          <div className="dash-card">
            <div className="dash-empty">
              <p>No locations yet. Add stores to power your map and store finder block.</p>
              <button type="button" className="dash-btn-primary" onClick={() => navigate("/app/stores/new")}>
                Add your first store
              </button>
            </div>
          </div>
        ) : (
          <div className="dash-card dash-card--flush">
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th className="dash-th">Name</th>
                    <th className="dash-th">Address</th>
                    <th className="dash-th">City</th>
                    <th className="dash-th dash-td--actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => (
                    <tr key={store.id} className="dash-tr">
                      <td className="dash-td">{store.name}</td>
                      <td className="dash-td">{store.address}</td>
                      <td className="dash-td">{store.city}</td>
                      <td className="dash-td dash-td--actions">
                        <button
                          type="button"
                          className="dash-btn-ghost"
                          onClick={() => alert("GBP Sync is coming soon! GBP ID: " + (store.gbpId || "None"))}
                        >
                          Sync
                        </button>
                        <button
                          type="button"
                          className="dash-btn-ghost"
                          onClick={() => navigate(`/app/stores/${store.id}`)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </s-page>
  );
}
