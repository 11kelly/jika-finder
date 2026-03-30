/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

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
      layout: data.layout,
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
      layout: data.layout,
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

export default function Settings() {
  const { settings, currentPlan } = useLoaderData();
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
            {/* 方案权限测试区块 1: 行销版 (PRO) */}
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

            {/* 方案权限测试区块 2: 企业版 (ENTERPRISE) */}
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

            <div className="dash-card">
              <div className="dash-form-stack">
                <h2 className="dash-card-title">Appearance customization</h2>
                <p className="dash-subtle">Customize colors to match your brand style.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="dash-form-stack">
                    <label style={{ fontSize: '14px', fontWeight: '500' }}>Primary Color (Buttons, Selections)</label>
                    <input type="color" name="primaryColor" defaultValue={settings.primaryColor || "#000000"} style={{ width: '100%', height: '40px' }} />
                  </div>
                  <div className="dash-form-stack">
                    <label style={{ fontSize: '14px', fontWeight: '500' }}>Marker Color (Map Icons)</label>
                    <input type="color" name="markerColor" defaultValue={settings.markerColor || "#ff0000"} style={{ width: '100%', height: '40px' }} />
                  </div>
                  <div className="dash-form-stack">
                    <label style={{ fontSize: '14px', fontWeight: '500' }}>Text Color</label>
                    <input type="color" name="textColor" defaultValue={settings.textColor || "#333333"} style={{ width: '100%', height: '40px' }} />
                  </div>
                  <div className="dash-form-stack">
                    <label style={{ fontSize: '14px', fontWeight: '500' }}>Background Color</label>
                    <input type="color" name="bgColor" defaultValue={settings.bgColor || "#ffffff"} style={{ width: '100%', height: '40px' }} />
                  </div>
                  <div className="dash-form-stack">
                    <label style={{ fontSize: '14px', fontWeight: '500' }}>Secondary Color</label>
                    <input type="color" name="secondaryColor" defaultValue={settings.secondaryColor || "#666666"} style={{ width: '100%', height: '40px' }} />
                  </div>
                  <div className="dash-form-stack">
                    <label style={{ fontSize: '14px', fontWeight: '500' }}>Accent Color</label>
                    <input type="color" name="accentColor" defaultValue={settings.accentColor || "#000000"} style={{ width: '100%', height: '40px' }} />
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
