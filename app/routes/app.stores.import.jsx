/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { useState, useRef, useEffect } from "react";
import { useFetcher, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import Papa from "papaparse";
import "../styles/dash-theme.css";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const csvContent = formData.get("csvContent");

  if (!csvContent) {
    return { error: "No content provided" };
  }

  const results = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  const stores = results.data;

  const count = await prisma.store.createMany({
    data: stores.map((s) => ({
      shop: session.shop,
      name: s.name || s.Name || "Untitled Store",
      address: s.address || s.Address || "",
      city: s.city || s.City || "",
      province: s.province || s.Province || "",
      country: s.country || s.Country || "",
      zip: s.zip || s.Zip || "",
      phone: s.phone || s.Phone || "",
      email: s.email || s.Email || "",
      website: s.website || s.Website || "",
      latitude: s.latitude || s.Latitude ? parseFloat(s.latitude || s.Latitude) : null,
      longitude: s.longitude || s.Longitude ? parseFloat(s.longitude || s.Longitude) : null,
      hours: s.hours || s.Hours || "",
      gbpId: s.gbpId || s.GBP_ID || "",
    })),
  });

  return { success: true, count: count.count };
};

function IconUpload() {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" aria-hidden>
      <path d="M12 16V4m0 0l4 4m-4-4L8 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" strokeLinecap="round" />
    </svg>
  );
}

export default function ImportCSV() {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [csvData, setCsvData] = useState("");

  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.data?.success) {
      navigate("/app/stores");
    }
  }, [fetcher.data, navigate]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCsvData(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = () => {
    if (!csvData) {
      alert("Please select a CSV file first.");
      return;
    }
    fetcher.submit({ csvContent: csvData }, { method: "post" });
  };

  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <s-page
      heading="Import Stores from CSV"
      back-action={{ content: "Stores", onAction: () => navigate("/app/stores") }}
      suppressHydrationWarning
    >
      <div className="dash-surface">
        <div className="dash-toolbar">
          <button
            type="button"
            className="dash-btn-primary"
            onClick={handleImport}
            disabled={!csvData || isSubmitting}
          >
            {isSubmitting ? "Importing…" : "Start import"}
          </button>
        </div>

        <div className="dash-card">
          <div className="dash-form-stack">
            <h2 className="dash-card-title">Upload CSV file</h2>
            <p className="dash-subtle">
              Download our{" "}
              <a
                className="dash-inline-link"
                href="/sample-stores.csv"
                download="sample-stores.csv"
                target="_blank"
                rel="noopener noreferrer"
              >
                sample CSV template
              </a>{" "}
              to ensure your data is formatted correctly.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".csv"
              onChange={handleFileChange}
            />

            <div
              className="dash-upload-zone"
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openFilePicker();
                }
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <IconUpload />
                <span style={{ fontSize: 15, fontWeight: 600, color: "#334155" }}>
                  {fileName ? `Selected: ${fileName}` : "Click to upload your CSV file"}
                </span>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>Accepts .csv</span>
              </div>
            </div>

            {csvData ? (
              <div className="dash-ready-banner">
                File is ready. Click &quot;Start import&quot; above to create locations from this file.
              </div>
            ) : null}

            <div>
              <h3 className="dash-card-title" style={{ fontSize: "1rem", marginBottom: 8 }}>
                Expected headers
              </h3>
              <code className="dash-code">
                name, address, city, province, country, zip, phone, email, website, latitude, longitude, hours, gbpId
              </code>
            </div>
          </div>
        </div>
      </div>
    </s-page>
  );
}
