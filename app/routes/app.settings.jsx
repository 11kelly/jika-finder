/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { useState, useEffect } from "react";
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

const MAP_STYLE_KEYS = ["default", "silver", "dark", "retro"];

function normalizeHexColor(raw, fallback) {
  if (typeof raw !== "string") return fallback;
  const s = raw.trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(s)) return fallback;
  return s.toLowerCase();
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  let mapStyle = data.mapStyle ?? "default";
  if (!MAP_STYLE_KEYS.includes(mapStyle)) {
    mapStyle = "default";
  }

  const mapUseCustomColors = data.mapUseCustomColors === "1" || data.mapUseCustomColors === true;
  const mapColorLand = normalizeHexColor(data.mapColorLand, "#e5e3df");
  const mapColorWater = normalizeHexColor(data.mapColorWater, "#c0d8e8");
  const mapColorRoad = normalizeHexColor(data.mapColorRoad, "#ffffff");
  const mapColorLabel = normalizeHexColor(data.mapColorLabel, "#616161");

  const settings = await prisma.settings.upsert({
    where: { shop: session.shop },
    update: {
      googleMapsApiKey: data.googleMapsApiKey,
      googleMapId: data.googleMapId,
      layout: data.layout ?? "classic",
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      textColor: data.textColor,
      bgColor: data.bgColor,
      markerColor: data.markerColor,
      markerSize: parseInt(data.markerSize || "32", 10),
      markerIconUrl: data.markerIconUrl,
      mapStyle,
      mapType: data.mapType ?? "roadmap",
      mapUseCustomColors,
      mapColorLand,
      mapColorWater,
      mapColorRoad,
      mapColorLabel,
    },
    create: {
      shop: session.shop,
      googleMapsApiKey: data.googleMapsApiKey,
      googleMapId: data.googleMapId,
      layout: data.layout ?? "classic",
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      textColor: data.textColor,
      bgColor: data.bgColor,
      markerColor: data.markerColor,
      markerSize: parseInt(data.markerSize || "32", 10),
      markerIconUrl: data.markerIconUrl,
      mapStyle,
      mapType: data.mapType ?? "roadmap",
      mapUseCustomColors,
      mapColorLand,
      mapColorWater,
      mapColorRoad,
      mapColorLabel,
    },
  });

  return { settings, success: true };
};

function ColorRow({ label, name, value, onChange }) {
  return (
    <div className="dash-color-row">
      <input
        type="color"
        {...(name ? { name } : {})}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="dash-color-swatch"
      />
      <div className="dash-color-info">
        <span className="dash-color-label">{label}</span>
        <span className="dash-color-hex">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

function MarkerIcon({ color, size = 32 }) {
  const height = (size / 32) * 44;
  return (
    <svg width={size} height={height} viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 0C7.163 0 0 7.163 0 16c0 10.627 14.222 26.48 15.168 27.537a1.1 1.1 0 001.664 0C17.778 42.48 32 26.627 32 16 32 7.163 24.837 0 16 0z"
        fill={color}
      />
      <circle cx="16" cy="16" r="6" fill="white" fillOpacity="0.85" />
    </svg>
  );
}

const MAP_TYPES = [
  { value: "roadmap",  label: "Roadmap",  colors: ["#e8e8e8", "#ffffff", "#c5e4a0"] },
  { value: "satellite", label: "Satellite", colors: ["#2d5a2d", "#1a3a1a", "#4a7a4a"] },
  { value: "hybrid",   label: "Hybrid",   colors: ["#2d5a2d", "#ffffff", "#4a7a4a"] },
  { value: "terrain",  label: "Terrain",  colors: ["#d4c5a9", "#e8dfc8", "#b8c9a0"] },
];

const MAP_STYLES = [
  { value: "default", label: "Default", colors: ["#e5e3df", "#ffffff", "#c0d8e8"] },
  { value: "silver",  label: "Silver",  colors: ["#f5f5f5", "#ffffff", "#c9c9c9"] },
  { value: "dark",    label: "Dark",    colors: ["#1d2c4d", "#304a7d", "#0e1626"] },
  { value: "retro",   label: "Retro",   colors: ["#ebe3cd", "#f5f1e6", "#b9d3c2"] },
];

function normalizeMapStyleKey(v) {
  if (MAP_STYLE_KEYS.includes(v)) return v;
  return "default";
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
  const [markerSize, setMarkerSize] = useState(settings.markerSize || 32);
  const [mapStyle, setMapStyle] = useState(normalizeMapStyleKey(settings.mapStyle || "default"));
  const [mapType, setMapType] = useState(settings.mapType || "roadmap");
  const [mapUseCustomColors, setMapUseCustomColors] = useState(Boolean(settings.mapUseCustomColors));
  const [mapColorLand, setMapColorLand] = useState(settings.mapColorLand || "#e5e3df");
  const [mapColorWater, setMapColorWater] = useState(settings.mapColorWater || "#c0d8e8");
  const [mapColorRoad, setMapColorRoad] = useState(settings.mapColorRoad || "#ffffff");
  const [mapColorLabel, setMapColorLabel] = useState(settings.mapColorLabel || "#616161");
  const [mapModalOpen, setMapModalOpen] = useState(false);

  useEffect(() => {
    setMapStyle(normalizeMapStyleKey(settings.mapStyle || "default"));
    setMapType(settings.mapType || "roadmap");
    setMapUseCustomColors(Boolean(settings.mapUseCustomColors));
    setMapColorLand(settings.mapColorLand || "#e5e3df");
    setMapColorWater(settings.mapColorWater || "#c0d8e8");
    setMapColorRoad(settings.mapColorRoad || "#ffffff");
    setMapColorLabel(settings.mapColorLabel || "#616161");
  }, [
    settings.mapStyle,
    settings.mapType,
    settings.mapUseCustomColors,
    settings.mapColorLand,
    settings.mapColorWater,
    settings.mapColorRoad,
    settings.mapColorLabel,
  ]);

  return (
    <s-page heading="Settings" suppressHydrationWarning>
      {/* ── Map style modal ───────────────────────────────────────────────── */}
      {mapModalOpen && (
        <div className="dash-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setMapModalOpen(false); }}>
          <div className="dash-modal dash-map-style-modal">
            <div className="dash-modal-header">
              <h2 className="dash-modal-title">Map style</h2>
              <button type="button" className="dash-modal-close" onClick={() => setMapModalOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="dash-map-style-modal-body">

              <section className="dash-map-style-modal-section">
                <h3 className="dash-map-style-modal-heading">Map type</h3>
                <div className="dash-map-style-modal-grid dash-map-style-modal-grid--4">
                  {MAP_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setMapType(t.value)}
                      className={`dash-map-option${mapType === t.value ? " dash-map-option--selected" : ""}`}
                    >
                      <div className="dash-map-swatch">
                        {t.colors.map((c, i) => (
                          <div key={i} style={{ flex: 1, background: c }} />
                        ))}
                      </div>
                      <span className="dash-map-option-label">{t.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="dash-map-style-modal-section">
                <h3 className="dash-map-style-modal-heading">Map theme</h3>
                <div className="dash-map-style-modal-grid dash-map-style-modal-grid--4">
                  {MAP_STYLES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setMapStyle(s.value)}
                      className={`dash-map-option${mapStyle === s.value ? " dash-map-option--selected" : ""}`}
                    >
                      <div className="dash-map-swatch">
                        {s.colors.map((c, i) => (
                          <div key={i} style={{ flex: 1, background: c }} />
                        ))}
                      </div>
                      <span className="dash-map-option-label">{s.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="dash-map-style-modal-section">
                <label className="dash-map-style-custom-toggle">
                  <input
                    type="checkbox"
                    checked={mapUseCustomColors}
                    onChange={(e) => setMapUseCustomColors(e.target.checked)}
                  />
                  <span className="dash-map-style-custom-toggle-copy">
                    <span className="dash-map-style-custom-toggle-title">Custom map colors</span>
                    <span className="dash-map-style-custom-toggle-hint">Overrides theme. Ignored if using a custom marker icon.</span>
                  </span>
                </label>
                {mapUseCustomColors ? (
                  <div className="dash-map-style-color-grid">
                    <ColorRow label="Land" value={mapColorLand} onChange={setMapColorLand} />
                    <ColorRow label="Water" value={mapColorWater} onChange={setMapColorWater} />
                    <ColorRow label="Roads" value={mapColorRoad} onChange={setMapColorRoad} />
                    <ColorRow label="Labels" value={mapColorLabel} onChange={setMapColorLabel} />
                  </div>
                ) : null}
              </section>
            </div>
            <div className="dash-modal-footer">
              <button type="button" className="dash-btn-primary" onClick={() => setMapModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
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

        {fetcher.data?.success === false && fetcher.data?.error ? (
          <div
            role="alert"
            style={{
              margin: "0 0 16px",
              padding: "12px 14px",
              borderRadius: 8,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: 14,
            }}
          >
            {fetcher.data.error}
          </div>
        ) : null}

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
                <s-text-field
                  label="Map ID (Optional)"
                  name="googleMapId"
                  defaultValue={settings.googleMapId}
                />
              </div>
            </div>

            {/* hidden inputs so map style / custom colors sync with the form */}
            <input type="hidden" name="mapStyle" value={normalizeMapStyleKey(mapStyle)} />
            <input type="hidden" name="mapType" value={mapType} />
            <input type="hidden" name="mapUseCustomColors" value={mapUseCustomColors ? "1" : "0"} />
            <input type="hidden" name="mapColorLand" value={mapColorLand} />
            <input type="hidden" name="mapColorWater" value={mapColorWater} />
            <input type="hidden" name="mapColorRoad" value={mapColorRoad} />
            <input type="hidden" name="mapColorLabel" value={mapColorLabel} />

            {/* ── Appearance customization ─────────────────────────────────── */}
            <div className="dash-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <h2 className="dash-card-title" style={{ margin: 0 }}>Appearance customization</h2>
                <button type="button" className="dash-btn-secondary" onClick={() => setMapModalOpen(true)}>
                  Map style
                </button>
              </div>

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
                  
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span className="dash-label">Marker size</span>
                      <span className="dash-subtle">{markerSize}px</span>
                    </div>
                    <input 
                      type="range" 
                      name="markerSize" 
                      min="24" 
                      max="64" 
                      step="2" 
                      value={markerSize} 
                      onChange={(e) => setMarkerSize(parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: primaryColor }}
                    />
                  </div>

                  <div className="dash-field-stack">
                    <s-text-field
                      label="Marker Icon URL (Optional)"
                      name="markerIconUrl"
                      defaultValue={settings.markerIconUrl}
                    />
                    <p className="dash-subtle dash-field-hint">When set, map style is not applied on the map.</p>
                  </div>
                </div>

                {/* Right: live preview */}
                <div className="dash-preview-panel">
                  {/* Top: icon strip */}
                  <div className="dash-preview-icons">
                    <div className="dash-preview-section-label">Icons &amp; controls</div>
                    <div className="dash-preview-icon-row">
                      <div className="dash-preview-icon-item">
                        <MarkerIcon color={markerColor} size={markerSize} />
                        <span className="dash-preview-icon-caption">Map pin</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: store card demo — matches .jika-sidebar / .jika-item */}
                  <div className="dash-preview-section-label" style={{ marginTop: 16, marginBottom: 10 }}>Store card</div>
                  <div
                    className="dash-preview-card"
                    style={{ background: bgColor, border: "1px solid #e5e7eb", color: textColor }}
                  >
                    {/* Search bar — matches .jika-search-input */}
                    <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid #e5e7eb" }}>
                      <input
                        readOnly
                        value="Search stores..."
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          boxSizing: "border-box",
                          border: "1px solid #e5e7eb",
                          borderRadius: 7,
                          fontSize: 13,
                          color: secondaryColor,
                          background: "#f9f9f9",
                          fontFamily: "inherit",
                          cursor: "default",
                        }}
                      />
                    </div>

                    {/* Store item 1 — matches .jika-item */}
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: primaryColor, marginBottom: 3, lineHeight: 1.4 }}>
                        JIKA Downtown
                      </div>
                      <div style={{ fontSize: 13, color: secondaryColor, lineHeight: 1.55, marginBottom: 3 }}>
                        123 Fashion St<br />Taipei, Taiwan
                      </div>
                      <div style={{ marginBottom: 3 }}>
                        <span style={{ fontSize: 13, color: secondaryColor }}>+886 2 1234 5678</span>
                      </div>
                      <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          style={{
                            padding: "4px 12px",
                            cursor: "default",
                            background: "transparent",
                            color: primaryColor,
                            border: `1.5px solid ${primaryColor}`,
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: 12,
                            fontFamily: "inherit",
                          }}
                        >
                          View on map
                        </button>
                        <button
                          type="button"
                          style={{
                            padding: "4px 12px",
                            cursor: "default",
                            background: "transparent",
                            color: "#555",
                            border: "1.5px solid #e5e7eb",
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: 12,
                            fontFamily: "inherit",
                          }}
                        >
                          Get directions ↗
                        </button>
                      </div>
                    </div>

                    {/* Store item 2 (dimmed) */}
                    <div style={{ padding: "14px 16px", opacity: 0.4 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: primaryColor, marginBottom: 3, lineHeight: 1.4 }}>
                        JIKA Xinyi
                      </div>
                      <div style={{ fontSize: 13, color: secondaryColor, lineHeight: 1.55, marginBottom: 10 }}>
                        456 Xinyi Rd<br />Taipei, Taiwan
                      </div>
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          style={{
                            padding: "4px 12px",
                            cursor: "default",
                            background: "transparent",
                            color: primaryColor,
                            border: `1.5px solid ${primaryColor}`,
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: 12,
                            fontFamily: "inherit",
                          }}
                        >
                          View on map
                        </button>
                        <button
                          type="button"
                          style={{
                            padding: "4px 12px",
                            cursor: "default",
                            background: "transparent",
                            color: "#555",
                            border: "1.5px solid #e5e7eb",
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: 12,
                            fontFamily: "inherit",
                          }}
                        >
                          Get directions ↗
                        </button>
                      </div>
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
