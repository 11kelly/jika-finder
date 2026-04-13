/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import "../styles/dash-theme.css";

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const billingData = await billing.check();
  const activeSubscriptions = billingData.appSubscriptions;
  const currentPlan = activeSubscriptions.length > 0 ? activeSubscriptions[0].name.toUpperCase() : "NONE";

  let settings = await prisma.settings.findUnique({
    where: { shop: session.shop },
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: { shop: session.shop },
    });
  }

  return { settings, currentPlan };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  const settings = await prisma.settings.upsert({
    where: { shop: session.shop },
    update: {
      googleMapsApiKey: data.googleMapsApiKey,
      layout: data.layout ?? "classic",
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      textColor: data.textColor,
      bgColor: data.bgColor,
      markerColor: data.markerColor,
    },
    create: {
      shop: session.shop,
      googleMapsApiKey: data.googleMapsApiKey,
      layout: data.layout ?? "classic",
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      textColor: data.textColor,
      bgColor: data.bgColor,
      markerColor: data.markerColor,
    },
  });

  return { settings, success: true };
};

function ColorRow({ label, name, value, onChange }) {
  return (
    <div className="dash-color-row">
      <input type="color" name={name} value={value} onChange={(e) => onChange(e.target.value)} className="dash-color-swatch" />
      <div className="dash-color-info">
        <span className="dash-color-label">{label}</span>
        <span className="dash-color-hex">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

function MarkerIcon({ color }) {
  return (
    <svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 0C7.163 0 0 7.163 0 16c0 10.627 14.222 26.48 15.168 27.537a1.1 1.1 0 001.664 0C17.778 42.48 32 26.627 32 16 32 7.163 24.837 0 16 0z"
        fill={color}
      />
      <circle cx="16" cy="16" r="6" fill="white" fillOpacity="0.85" />
    </svg>
  );
}

export default function Settings() {
  const { settings, currentPlan } = useLoaderData();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || "#000000");
  const [markerColor, setMarkerColor] = useState(settings.markerColor || "#ff0000");
  const [textColor, setTextColor] = useState(settings.textColor || "#333333");
  const [bgColor, setBgColor] = useState(settings.bgColor || "#ffffff");
  const [secondaryColor, setSecondaryColor] = useState(settings.secondaryColor || "#666666");
  const [accentColor, setAccentColor] = useState(settings.accentColor || "#000000");

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
            {currentPlan.includes("PRO") && (
              <div className="dash-card" style={{ borderLeft: "4px solid #7c3aed", background: "#f5f3ff" }}>
                <div className="dash-form-stack">
                  <h2 className="dash-card-title">🚀 [行销版专属] 模块测试</h2>
                  <p className="dash-subtle" style={{ color: "#5b21b6" }}>
                    您现在看到的是 <strong>Pro (行銷版)</strong> 的专属配置内容。
                    此区块包含：Google Sheets 即時同步设置、据点限定优惠 Banners 管理等高级功能。
                  </p>
                </div>
              </div>
            )}

            {currentPlan.includes("ENTERPRISE") && (
              <div className="dash-card" style={{ borderLeft: "4px solid #2563eb", background: "#eff6ff" }}>
                <div className="dash-form-stack">
                  <h2 className="dash-card-title">🏢 [企业版专属] 模块测试</h2>
                  <p className="dash-subtle" style={{ color: "#1d4ed8" }}>
                    您现在看到的是 <strong>Enterprise (企業版)</strong> 的顶级配置内容。
                    此区块包含：Mapbox 引擎切换、CSS 深度客製化、以及 B2B 联名展示管理。
                  </p>
                </div>
              </div>
            )}

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

            {/* ── Appearance customization ─────────────────────────────────── */}
            <div className="dash-card">
              <h2 className="dash-card-title" style={{ marginBottom: 24 }}>Appearance customization</h2>

              <div className="dash-appearance-grid">
                {/* Left: color controls */}
                <div className="dash-form-stack">
                  <p className="dash-subtle" style={{ marginBottom: 4 }}>Customize colors to match your brand style.</p>
                  <ColorRow label="Primary — buttons & selections" name="primaryColor" value={primaryColor} onChange={setPrimaryColor} />
                  <ColorRow label="Secondary — subtitles & borders" name="secondaryColor" value={secondaryColor} onChange={setSecondaryColor} />
                  <ColorRow label="Accent — highlights & links" name="accentColor" value={accentColor} onChange={setAccentColor} />
                  <ColorRow label="Text — body copy" name="textColor" value={textColor} onChange={setTextColor} />
                  <ColorRow label="Background — panel fill" name="bgColor" value={bgColor} onChange={setBgColor} />
                  <ColorRow label="Marker — map pin" name="markerColor" value={markerColor} onChange={setMarkerColor} />
                </div>

                {/* Right: live preview */}
                <div className="dash-preview-panel">
                  {/* Top: icon strip */}
                  <div className="dash-preview-icons">
                    <div className="dash-preview-section-label">Icons &amp; controls</div>
                    <div className="dash-preview-icon-row">
                      <div className="dash-preview-icon-item">
                        <MarkerIcon color={markerColor} />
                        <span className="dash-preview-icon-caption">Map pin</span>
                      </div>
                      <div className="dash-preview-icon-item">
                        <button
                          type="button"
                          className="dash-preview-btn"
                          style={{ background: primaryColor, color: "#fff" }}
                        >
                          Get directions
                        </button>
                        <span className="dash-preview-icon-caption">Primary button</span>
                      </div>
                      <div className="dash-preview-icon-item">
                        <div
                          className="dash-preview-tag"
                          style={{ background: accentColor + "22", color: accentColor, border: `1px solid ${accentColor}44` }}
                        >
                          Open now
                        </div>
                        <span className="dash-preview-icon-caption">Accent tag</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: store card demo — matches .jika-sidebar / .jika-item */}
                  <div className="dash-preview-section-label" style={{ marginTop: 16, marginBottom: 10 }}>Store card</div>
                  <div
                    className="dash-preview-card"
                    style={{ background: bgColor, border: "1px solid #ccc", color: textColor }}
                  >
                    {/* Search bar — matches JS searchWrapper */}
                    <div style={{ padding: 15, borderBottom: "1px solid #eee" }}>
                      <input
                        readOnly
                        value="Search stores..."
                        style={{
                          width: "100%",
                          padding: 8,
                          boxSizing: "border-box",
                          border: "1px solid #ccc",
                          borderRadius: 4,
                          fontSize: 14,
                          color: secondaryColor,
                          background: bgColor,
                          fontFamily: "inherit",
                          cursor: "default",
                        }}
                      />
                    </div>

                    {/* Store item 1 — matches .jika-item */}
                    <div style={{ padding: 15, borderBottom: "1px solid #eee" }}>
                      <h3 style={{ margin: "0 0 5px 0", fontSize: 16, fontWeight: "bold", color: primaryColor }}>
                        JIKA Downtown
                      </h3>
                      <p style={{ margin: "0 0 5px 0", fontSize: 14, color: secondaryColor }}>
                        123 Fashion St, Taipei
                      </p>
                      <p style={{ margin: "0 0 5px 0", fontSize: 14, color: secondaryColor }}>
                        +886 2 1234 5678
                      </p>
                      <button
                        type="button"
                        style={{
                          padding: "8px 16px",
                          cursor: "default",
                          background: primaryColor,
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          fontWeight: 500,
                          fontSize: 14,
                          fontFamily: "inherit",
                        }}
                      >
                        View on Map
                      </button>
                    </div>

                    {/* Store item 2 (dimmed) */}
                    <div style={{ padding: 15, opacity: 0.45 }}>
                      <h3 style={{ margin: "0 0 5px 0", fontSize: 16, fontWeight: "bold", color: primaryColor }}>
                        JIKA Xinyi
                      </h3>
                      <p style={{ margin: "0 0 5px 0", fontSize: 14, color: secondaryColor }}>
                        456 Xinyi Rd, Taipei
                      </p>
                      <button
                        type="button"
                        style={{
                          padding: "8px 16px",
                          cursor: "default",
                          background: primaryColor,
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          fontWeight: 500,
                          fontSize: 14,
                          fontFamily: "inherit",
                        }}
                      >
                        View on Map
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </s-page>
  );
}
