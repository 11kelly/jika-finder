/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { useState } from "react";
import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const storeCount = await prisma.store.count({
    where: { shop: session.shop },
  });

  const recentStores = await prisma.store.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const settings = await prisma.settings.findUnique({
    where: { shop: session.shop },
  });

  const isConfigured = !!settings?.googleMapsApiKey;

  return { storeCount, recentStores, isConfigured, shop: session.shop };
};

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** 0–100 from real setup state (no fake SEO score). */
function computeSetupScore(storeCount, isConfigured) {
  let s = 0;
  if (isConfigured) {
    s += 45;
  }
  s += clamp(Math.round((Math.min(storeCount, 12) / 12) * 55), 0, 55);
  return clamp(s, 0, 100);
}

// eslint-disable-next-line react/prop-types -- local gauge
function SemiGauge({ score }) {
  const v = clamp(score, 0, 100);
  const r = 76;
  const len = Math.PI * r;
  const offset = len * (1 - v / 100);
  const labelColor =
    v >= 75 ? "#15803d" : v >= 45 ? "#c2410c" : "#b91c1c";

  return (
    <div style={{ textAlign: "center", paddingTop: 8 }}>
      <svg width={220} height={124} viewBox="0 0 220 124" aria-hidden focusable="false">
        <defs>
          <linearGradient id="dashGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="45%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path
          d="M 32 108 A 78 78 0 0 1 188 108"
          fill="none"
          stroke="#e4e7eb"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d="M 32 108 A 78 78 0 0 1 188 108"
          fill="none"
          stroke="url(#dashGaugeGrad)"
          strokeWidth={14}
          strokeLinecap="round"
          pathLength={len}
          strokeDasharray={len}
          strokeDashoffset={offset}
        />
      </svg>
      <div
        style={{
          marginTop: -76,
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: labelColor,
          lineHeight: 1,
        }}
      >
        {v}
      </div>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 13,
          fontWeight: 600,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Setup readiness
      </p>
    </div>
  );
}

// eslint-disable-next-line react/prop-types -- local stat tile
function StatMiniCard({ icon, label, value, tone }) {
  const border =
    tone === "critical"
      ? "rgba(239, 68, 68, 0.35)"
      : tone === "warn"
        ? "rgba(249, 115, 22, 0.35)"
        : tone === "good"
          ? "rgba(34, 197, 94, 0.35)"
          : "rgba(148, 163, 184, 0.5)";
  const iconColor =
    tone === "critical" ? "#dc2626" : tone === "warn" ? "#ea580c" : tone === "good" ? "#16a34a" : "#64748b";

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: "16px 18px",
        background: "#fafbfc",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ color: iconColor, flexShrink: 0, display: "flex" }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function IconDiamond() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3l8 8-8 10-8-10 8-8z" strokeLinejoin="round" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 9v4M12 17h.01M10.3 3.6L2.8 18a1 1 0 00.9 1.5h16.6a1 1 0 00.9-1.5L13.7 3.6a1 1 0 00-1.8 0z" strokeLinecap="round" />
    </svg>
  );
}

function IconTrend() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 17l6-6 4 4 8-8M14 7h7v7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconScan() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M7 3H3v4M21 7V3h-4M7 21H3v-4M21 17v4h-4M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Index() {
  const { storeCount, recentStores, isConfigured, shop } = useLoaderData();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [tab, setTab] = useState("recent");
  const [openId, setOpenId] = useState(null);

  const shopShort = shop.replace(".myshopify.com", "");
  const score = computeSetupScore(storeCount, isConfigured);
  const criticalCount = isConfigured ? 0 : 1;
  const improvementCount = isConfigured && storeCount === 0 ? 1 : 0;
  const attentionCount = criticalCount + improvementCount;
  const issuesWording =
    attentionCount === 0
      ? "Everything looks on track. Keep adding locations so customers can find you."
      : `We found ${attentionCount} setup item${attentionCount === 1 ? "" : "s"} that need your attention.`;

  const primaryAction = () => {
    if (!isConfigured) {
      navigate("/app/settings");
    } else {
      navigate("/app/stores/new");
    }
  };

  const primaryLabel = !isConfigured ? "Finish map setup" : "Add location";

  return (
    <s-page heading="Dashboard" suppressHydrationWarning>
      <style>
        {`
          .dash-surface {
            font-family: Inter, system-ui, -apple-system, sans-serif;
            background: #f4f6f8;
            padding: 28px clamp(18px, 3vw, 32px) 48px;
            min-height: 100%;
            box-sizing: border-box;
          }
          .dash-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 8px 28px rgba(15, 23, 42, 0.06);
            border: 1px solid #e1e3e5;
            padding: 28px 32px;
            box-sizing: border-box;
          }
          .dash-top-grid {
            display: grid;
            grid-template-columns: minmax(260px, 340px) 1fr;
            gap: 36px;
            align-items: start;
          }
          @media (max-width: 900px) {
            .dash-top-grid { grid-template-columns: 1fr; }
          }
          .dash-btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 14px 20px;
            border: none;
            border-radius: 999px;
            font-size: 15px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
            color: #fff;
            box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);
          }
          .dash-btn-primary:hover { filter: brightness(1.06); }
          .dash-btn-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            margin-top: 12px;
            padding: 12px 18px;
            border-radius: 999px;
            font-size: 14px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            background: #fff;
            color: #334155;
            border: 1px solid #cbd5e1;
          }
          .dash-btn-secondary:hover { background: #f8fafc; }
          .dash-stat-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
            margin-top: 22px;
          }
          @media (max-width: 520px) {
            .dash-stat-grid { grid-template-columns: 1fr; }
          }
          .dash-tabs {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 8px;
          }
          .dash-tab {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            background: transparent;
            color: #64748b;
          }
          .dash-tab--active {
            background: #fef2f2;
            color: #b91c1c;
          }
          .dash-tab--active-secondary {
            background: #f1f5f9;
            color: #0f172a;
          }
          .dash-tab-badge {
            font-size: 12px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 999px;
            background: rgba(185, 28, 28, 0.12);
            color: #b91c1c;
          }
          .dash-tab-badge--muted {
            background: #e2e8f0;
            color: #475569;
          }
          .dash-row {
            display: grid;
            grid-template-columns: minmax(140px, 200px) 1fr auto;
            gap: 16px;
            align-items: center;
            padding: 18px 4px;
            border-top: 1px solid #e8ecf0;
          }
          .dash-row:first-of-type { border-top: none; }
          @media (max-width: 640px) {
            .dash-row {
              grid-template-columns: 1fr auto;
            }
            .dash-row-mid { grid-column: 1 / -1; }
          }
          .dash-callout {
            margin-top: 16px;
            padding: 12px 14px;
            border-radius: 12px;
            background: #fffbeb;
            border: 1px solid #fde68a;
            font-size: 13px;
            color: #92400e;
            line-height: 1.45;
          }
        `}
      </style>

      <div className="dash-surface">
        <div className="dash-card" style={{ marginBottom: 24 }}>
          <div className="dash-top-grid">
            <div>
              <SemiGauge score={score} />
              <button type="button" className="dash-btn-primary" onClick={primaryAction}>
                {primaryLabel}
              </button>
              <button
                type="button"
                className="dash-btn-secondary"
                onClick={() => revalidator.revalidate()}
                disabled={revalidator.state === "loading"}
              >
                <IconScan />
                Refresh data
              </button>
            </div>

            <div>
              <p style={{ margin: "0 0 6px", fontSize: 15, color: "#64748b" }}>
                Hi, <strong style={{ color: "#0f172a" }}>{shopShort}</strong>
              </p>
              <h2
                style={{
                  margin: "0 0 16px",
                  fontSize: "clamp(1.25rem, 2.5vw, 1.5rem)",
                  fontWeight: 700,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.25,
                }}
              >
                {issuesWording}
              </h2>

              {!isConfigured ? (
                <div className="dash-callout">
                  Add your Google Maps API key in Map Settings so the storefront block can show locations.
                </div>
              ) : null}

              <div className="dash-stat-grid">
                <StatMiniCard
                  icon={<IconDiamond />}
                  label="Critical"
                  value={criticalCount}
                  tone="critical"
                />
                <StatMiniCard
                  icon={<IconAlert />}
                  label="Needs attention"
                  value={attentionCount}
                  tone="warn"
                />
                <StatMiniCard
                  icon={<IconCheckCircle />}
                  label="Locations"
                  value={storeCount}
                  tone="good"
                />
                <StatMiniCard
                  icon={<IconTrend />}
                  label="Map integration"
                  value={isConfigured ? "Active" : "Off"}
                  tone="neutral"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="dash-card" style={{ padding: "24px 28px 28px" }}>
          <div className="dash-tabs">
            <button
              type="button"
              className={`dash-tab ${tab === "recent" ? "dash-tab--active" : ""}`}
              onClick={() => setTab("recent")}
            >
              Recent locations
              <span className="dash-tab-badge">{recentStores.length}</span>
            </button>
            <button
              type="button"
              className={`dash-tab ${tab === "guide" ? "dash-tab--active-secondary" : ""}`}
              onClick={() => setTab("guide")}
            >
              Quick guide
              <span className="dash-tab-badge dash-tab-badge--muted">3</span>
            </button>
            <div style={{ marginLeft: "auto", alignSelf: "center" }}>
              <button
                type="button"
                className="dash-btn-secondary"
                style={{ width: "auto", marginTop: 0, padding: "8px 16px", fontSize: 13 }}
                onClick={() => navigate("/app/stores")}
              >
                View all stores
              </button>
            </div>
          </div>

          {tab === "recent" ? (
            recentStores.length === 0 ? (
              <div style={{ padding: "32px 8px", textAlign: "center", color: "#64748b" }}>
                <p style={{ margin: "0 0 16px", fontSize: 15 }}>No store locations yet.</p>
                <button type="button" className="dash-btn-primary" style={{ maxWidth: 280, margin: "0 auto" }} onClick={() => navigate("/app/stores/new")}>
                  Add your first store
                </button>
              </div>
            ) : (
              <div>
                {recentStores.map((store) => {
                  const expanded = openId === store.id;
                  return (
                    <div key={store.id} className="dash-row">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: isConfigured ? "#16a34a" : "#dc2626" }}>
                          <IconDiamond />
                        </span>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>Store location</span>
                      </div>
                      <div className="dash-row-mid">
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{store.name}</div>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                          {store.address}, {store.city}
                          {expanded && (store.province || store.country)
                            ? ` · ${[store.province, store.country].filter(Boolean).join(", ")}`
                            : null}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          className="dash-btn-secondary"
                          style={{ width: "auto", marginTop: 0, padding: "8px 14px", fontSize: 13 }}
                          onClick={() => navigate(`/app/stores/${store.id}`)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="dash-btn-secondary"
                          style={{
                            width: 44,
                            minWidth: 44,
                            height: 40,
                            marginTop: 0,
                            padding: 0,
                            borderRadius: 12,
                          }}
                          aria-expanded={expanded}
                          aria-label={expanded ? "Collapse details" : "Expand details"}
                          onClick={() => setOpenId(expanded ? null : store.id)}
                        >
                          <span
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              transform: expanded ? "rotate(180deg)" : "none",
                              transition: "transform 0.2s ease",
                            }}
                          >
                            <IconChevronDown />
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div style={{ paddingTop: 8, fontSize: 15, color: "#334155", lineHeight: 1.65 }}>
              <p style={{ margin: "0 0 12px" }}>
                <strong>1. Configure API:</strong> Add your Google Maps API key under Map Settings.
              </p>
              <p style={{ margin: "0 0 12px" }}>
                <strong>2. Add stores:</strong> Create locations manually or import via CSV.
              </p>
              <p style={{ margin: 0 }}>
                <strong>3. Embed on storefront:</strong> In the theme editor, add the Store Finder app block where you want the map.
              </p>
              <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button type="button" className="dash-btn-primary" style={{ width: "auto", paddingInline: 22 }} onClick={() => navigate("/app/settings")}>
                  Map settings
                </button>
                <button type="button" className="dash-btn-secondary" style={{ width: "auto", marginTop: 0 }} onClick={() => navigate("/app/stores/import")}>
                  Bulk import
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </s-page>
  );
}
