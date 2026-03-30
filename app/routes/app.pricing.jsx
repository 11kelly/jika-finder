/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const billingData = await billing.check();
  const activeSubscriptions = billingData.appSubscriptions;
  const currentPlan = activeSubscriptions.length > 0 ? activeSubscriptions[0].name.toUpperCase() : "NONE";

  return { currentPlan };
};

export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const plan = formData.get("plan");

  if (!plan) {
    return { error: "Missing plan" };
  }

  // App handle in admin URL: Partner Dashboard → App setup → embed path, or SHOPIFY_APP_HANDLE in .env
  const handle = process.env.SHOPIFY_APP_HANDLE || "jika-store-finder";
  // Development/test charges: set SHOPIFY_BILLING_TEST=true in .env; omit or false in production
  const isTest = process.env.SHOPIFY_BILLING_TEST === "true";

  return await billing.request({
    plan: plan,
    isTest,
    returnUrl: `https://${session.shop}/admin/apps/${handle}/app/pricing`,
  });
};

/** Check icon for feature lists — purple like reference */
function IconCheckAccent() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={18} height={18} aria-hidden focusable="false">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// eslint-disable-next-line react/prop-types -- decorative icon by plan id
function PlanIcon({ variant }) {
  const base = {
    width: 56,
    height: 56,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 28px",
    flexShrink: 0,
  };

  if (variant === "pro") {
    return (
      <div
        style={{
          ...base,
          background: "linear-gradient(135deg, #e9d5ff 0%, #c4b5fd 45%, #a5b4fc 100%)",
          boxShadow: "0 8px 24px rgba(129, 140, 248, 0.35)",
        }}
        aria-hidden
      >
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 2.5l2.2 5.5L20 9l-5 4.2L16.5 22 12 18.8 7.5 22 9 13.2 4 9l5.8-1L12 2.5z"
            fill="#5b21b6"
            opacity={0.95}
          />
          <path d="M12 7v5l3 2.5" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (variant === "enterprise") {
    return (
      <div
        style={{
          ...base,
          background: "linear-gradient(135deg, #dbeafe 0%, #93c5fd 50%, #60a5fa 100%)",
          boxShadow: "0 8px 24px rgba(59, 130, 246, 0.28)",
        }}
        aria-hidden
      >
        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 16.5V7a2 2 0 012-2h2m8 0h2a2 2 0 012 2v9.5M4 16.5A2.5 2.5 0 006.5 19h11a2.5 2.5 0 002.5-2.5M4 16.5V9m16 7.5V9"
            stroke="#1d4ed8"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path d="M9 21V11h6v10" stroke="#2563eb" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{
        ...base,
        background: "linear-gradient(135deg, #ccfbf1 0%, #5eead4 50%, #2dd4bf 100%)",
        boxShadow: "0 8px 24px rgba(20, 184, 166, 0.3)",
      }}
      aria-hidden
    >
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 21s-6-5.2-6-10a6 6 0 1112 0c0 4.8-6 10-6 10z"
          fill="#0f766e"
          opacity={0.9}
        />
        <circle cx="12" cy="11" r="2.25" fill="#ecfdf5" />
      </svg>
    </div>
  );
}

// eslint-disable-next-line react/prop-types -- internal presentational helper
function PlanFeatureRow({ children }) {
  return (
    <div
      role="listitem"
      className="pricing-feature-row"
    >
      <span className="pricing-feature-row__check" aria-hidden>
        <IconCheckAccent />
      </span>
      <p className="pricing-feature-row__text">{children}</p>
    </div>
  );
}

function planCtaLabel(planId, isCurrent, isThisSubmitting) {
  if (isCurrent) {
    return "Current plan";
  }
  if (isThisSubmitting) {
    return "Continue to billing…";
  }
  if (planId === "BASIC") {
    return "Select Basic";
  }
  if (planId === "PRO") {
    return "Select Pro";
  }
  if (planId === "ENTERPRISE") {
    return "Select Enterprise";
  }
  return "Select plan";
}

export default function Pricing() {
  const { currentPlan } = useLoaderData();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";
  const submittingPlan = isSubmitting ? fetcher.formData?.get("plan") : null;
  const error = fetcher.data?.error;

  const plans = [
    {
      id: "BASIC",
      name: "Basic (钩子版)",
      price: "5",
      priceSuffix: null,
      tagline: "超低门槛，中小卖家首选",
      addonsNote: "此方案不支持加购功能。",
      features: [
        "Google Maps API 支持",
        "无限门店点位展示",
        "Classic / Mobile-First 版型",
        "标准 CSV 批量导入",
        "GBP 基础信息同步",
      ],
    },
    {
      id: "PRO",
      name: "Pro (营销版)",
      price: "19",
      priceSuffix: null,
      tagline: "重视通路营销与运营效率",
      addonsNote: "可加购 HubSpot Connector（+$15/mo）。",
      features: [
        "包含 Basic 全部功能",
        "Luxury / Dealer Hub 版型",
        "Google Sheets 实时同步",
        "GBP 评论与星等显示",
        "据点限定优惠 Banners",
      ],
      popular: true,
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise (企业版)",
      price: "49",
      priceSuffix: "+",
      tagline: "B2B 品牌商、跨境大卖家",
      addonsNote: "可加购 HubSpot Connector（+$15/mo）。",
      features: [
        "包含 Pro 全部功能",
        "Mapbox / Google 双引擎",
        "CSS 深度客制化支持",
        "Magento 迁移顾问服务",
        "商品 Collection 联动过滤",
      ],
    },
  ];

  const activePlan = plans.find(p => currentPlan.includes(p.id.toUpperCase()));

  return (
    <s-page heading="Plans & pricing" suppressHydrationWarning>
      <style>
        {`
          .pricing-surface {
            --pricing-purple: #7c3aed;
            --pricing-purple-deep: #5b21b6;
            --pricing-text: #0f172a;
            --pricing-muted: #64748b;
            --pricing-border: #e2e8f0;
            font-family: Inter, system-ui, -apple-system, sans-serif;
            background: linear-gradient(180deg, #eceff3 0%, #f4f6f9 28%, #eef1f5 100%);
            padding: 40px clamp(20px, 4vw, 40px) 56px;
            min-height: 100%;
            box-sizing: border-box;
          }
          .pricing-hero {
            text-align: center;
            max-width: 40rem;
            margin: 0 auto 40px;
          }
          .pricing-hero__eyebrow {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: var(--pricing-muted);
            margin-bottom: 12px;
          }
          .pricing-hero__title {
            font-size: clamp(1.5rem, 3vw, 1.875rem);
            font-weight: 700;
            color: var(--pricing-text);
            letter-spacing: -0.02em;
            margin: 0 0 12px;
            line-height: 1.2;
          }
          .pricing-hero__sub {
            font-size: 15px;
            line-height: 1.55;
            color: var(--pricing-muted);
            margin: 0;
          }
          .pricing-status-banner {
            max-width: 1180px;
            margin: 0 auto 32px;
            background: #f0fdf4;
            color: #166534;
            border: 1px solid #bbf7d0;
            border-radius: 12px;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 2px 10px rgba(22, 101, 52, 0.05);
          }
          .pricing-status-banner__text {
            font-weight: 600;
            font-size: 15px;
          }
          .pricing-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 28px;
            align-items: stretch;
            max-width: 1180px;
            margin: 0 auto;
            width: 100%;
          }
          .pricing-card {
            position: relative;
            border-radius: 20px;
            padding: 40px 32px 36px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            min-width: 0;
            transition: box-shadow 220ms ease, transform 220ms ease;
          }
          @media (prefers-reduced-motion: reduce) {
            .pricing-card { transition: none; }
          }
          .pricing-card--plain {
            background: #ffffff;
            border: 1px solid var(--pricing-border);
            box-shadow: 0 12px 40px -8px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04);
          }
          .pricing-card--plain:hover {
            box-shadow: 0 20px 48px -8px rgba(15, 23, 42, 0.12);
            transform: translateY(-3px);
          }
          .pricing-card--highlight {
            background: linear-gradient(152deg, #faf5ff 0%, #f5f3ff 50%, #eef2ff 60%, #ecfeff 100%);
            border: 1px solid rgba(129, 140, 248, 0.5);
            box-shadow: 0 20px 50px -12px rgba(99, 102, 241, 0.22), 0 10px 30px -10px rgba(15, 23, 42, 0.1);
          }
          .pricing-card--highlight:hover {
            box-shadow: 0 28px 56px -12px rgba(99, 102, 241, 0.28), 0 14px 36px -10px rgba(15, 23, 42, 0.12);
            transform: translateY(-3px);
          }
          @media (prefers-reduced-motion: reduce) {
            .pricing-card--plain:hover,
            .pricing-card--highlight:hover { transform: none; }
          }
          .pricing-card__ribbon {
            position: absolute;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #a855f7, #6366f1);
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            padding: 8px 14px;
            border-radius: 10px;
            box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
            z-index: 1;
          }
          .pricing-card__body {
            text-align: left;
            width: 100%;
          }
          .pricing-card__title-row {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
          }
          .pricing-card__title {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--pricing-text);
            margin: 0;
            letter-spacing: -0.02em;
          }
          .pricing-card__pill {
            font-size: 11px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 999px;
            background: #f1f5f9;
            color: var(--pricing-muted);
            border: 1px solid var(--pricing-border);
          }
          .pricing-card__pill--current {
            background: #ecfdf5;
            color: #047857;
            border-color: #6ee7b7;
          }
          .pricing-card__price-block {
            margin-bottom: 10px;
          }
          .pricing-card__price-row {
            display: flex;
            align-items: baseline;
            gap: 6px;
            flex-wrap: wrap;
          }
          .pricing-card__amount {
            font-size: 2.5rem;
            font-weight: 800;
            letter-spacing: -0.04em;
            line-height: 1;
            color: var(--pricing-text);
          }
          .pricing-card__suffix {
            font-size: 1.5rem;
            font-weight: 700;
            color: #47586e;
          }
          .pricing-card__period {
            font-size: 14px;
            color: var(--pricing-muted);
            margin: 8px 0 0;
          }
          .pricing-card__tagline {
            font-size: 15px;
            line-height: 1.5;
            color: #47586e;
            margin: 0 0 28px;
          }
          .pricing-cta {
            display: block;
            width: 100%;
            padding: 14px 20px;
            border-radius: 14px;
            font-size: 15px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            border: none;
            margin-bottom: 28px;
            transition: background 180ms ease, transform 180ms ease, opacity 180ms ease;
          }
          .pricing-cta--active {
            background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
            color: #ffffff;
            box-shadow: 0 4px 16px rgba(15, 23, 42, 0.35);
          }
          .pricing-cta--active:hover:not(:disabled) {
            background: linear-gradient(180deg, #334155 0%, #1e293b 100%);
            transform: translateY(-1px);
          }
          .pricing-cta--active:disabled {
            opacity: 0.65;
            cursor: not-allowed;
            transform: none;
          }
          .pricing-cta--current {
            background: #e5e7eb;
            color: #6b7280;
            box-shadow: none;
            cursor: not-allowed;
          }
          .pricing-card__divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.45), transparent);
            margin: 0 0 22px;
          }
          .pricing-card--highlight .pricing-card__divider {
            background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.25), transparent);
          }
          .pricing-card__section-label {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--pricing-muted);
            margin: 0 0 14px;
          }
          .pricing-feature-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin: 0;
            padding: 0;
            list-style: none;
          }
          .pricing-feature-row {
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }
          .pricing-feature-row__check {
            flex-shrink: 0;
            margin-top: 2px;
            color: var(--pricing-purple);
          }
          .pricing-feature-row__text {
            margin: 0;
            font-size: 14px;
            line-height: 1.45;
            color: var(--pricing-text);
          }
          .pricing-card__addons {
            margin: 20px 0 0;
            font-size: 13px;
            line-height: 1.45;
            color: var(--pricing-muted);
          }
          .pricing-trust {
            max-width: 1180px;
            margin: 44px auto 0;
            background: #ffffff;
            border: 1px solid var(--pricing-border);
            border-radius: 20px;
            padding: 28px 32px;
            box-shadow: 0 10px 36px -12px rgba(15, 23, 42, 0.07);
            text-align: center;
          }
          .pricing-trust__title {
            margin: 0 0 16px;
            font-size: 1rem;
            font-weight: 700;
            color: var(--pricing-text);
          }
          .pricing-trust__items {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px 28px;
          }
          .pricing-trust__item {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: var(--pricing-muted);
          }
          .pricing-trust__item svg {
            color: var(--pricing-purple);
          }
        `}
      </style>

      <div className="pricing-surface">
        <header className="pricing-hero">
          <p className="pricing-hero__eyebrow">Billing via Shopify</p>
          <h2 className="pricing-hero__title">Choose the right plan for your stores</h2>
          {error && (
            <div style={{ padding: "12px", background: "#fee2e2", color: "#b91c1c", borderRadius: "8px", margin: "16px 0", textAlign: "left" }}>
              <strong>Error:</strong> {error}
            </div>
          )}
          <p className="pricing-hero__sub">
            Compare what is included on each tier, then continue to Shopify checkout to activate or change your
            subscription. Support is available 24/7.
          </p>
        </header>

        {activePlan && (
          <div className="pricing-status-banner">
            <span style={{ color: "#22c55e" }} aria-hidden>
              <IconCheckAccent />
            </span>
            <span className="pricing-status-banner__text">
              您当前订阅：{activePlan.name}
            </span>
          </div>
        )}

        <div
          className="pricing-grid"
          aria-busy={isSubmitting}
          aria-live="polite"
        >
          {plans.map((plan) => {
            const isCurrent = currentPlan.includes(plan.id);
            const isThisSubmitting = submittingPlan === plan.id;
            const isHighlight = plan.popular;
            const cardClass = `pricing-card ${isHighlight ? "pricing-card--highlight" : "pricing-card--plain"}`;
            const iconVariant =
              plan.id === "ENTERPRISE" ? "enterprise" : plan.id === "PRO" ? "pro" : "basic";

            return (
              <div key={plan.id} className={cardClass}>
                {plan.popular ? (
                  <span className="pricing-card__ribbon">Most popular</span>
                ) : null}

                <PlanIcon variant={iconVariant} />

                <div className="pricing-card__body">
                  <div className="pricing-card__title-row">
                    <h3 className="pricing-card__title">{plan.name}</h3>
                    {isCurrent ? (
                      <span className="pricing-card__pill pricing-card__pill--current">Your plan</span>
                    ) : null}
                  </div>

                  <div className="pricing-card__price-block">
                    <div className="pricing-card__price-row">
                      <span className="pricing-card__amount">${plan.price}</span>
                      {plan.priceSuffix ? (
                        <span className="pricing-card__suffix">{plan.priceSuffix}</span>
                      ) : null}
                    </div>
                    <p className="pricing-card__period">
                      USD / month
                      {plan.priceSuffix ? " · 企业方案可另议" : ""}
                    </p>
                  </div>

                  <p className="pricing-card__tagline">{plan.tagline}</p>

                  <fetcher.Form method="post">
                    <input type="hidden" name="plan" value={plan.id} />
                    <button
                      type="submit"
                      className={`pricing-cta ${isCurrent ? "pricing-cta--current" : "pricing-cta--active"}`}
                      disabled={isCurrent || isSubmitting}
                    >
                      {planCtaLabel(plan.id, isCurrent, isThisSubmitting)}
                    </button>
                  </fetcher.Form>

                  <div className="pricing-card__divider" />

                  <p className="pricing-card__section-label">Included</p>
                  <div className="pricing-feature-list" role="list">
                    {plan.features.map((feature) => (
                      <PlanFeatureRow key={feature}>{feature}</PlanFeatureRow>
                    ))}
                  </div>

                  <p className="pricing-card__addons">{plan.addonsNote}</p>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="pricing-trust">
          <h3 className="pricing-trust__title">Trusted by Shopify merchants</h3>
          <div className="pricing-trust__items">
            {["7-day free trial", "Cancel anytime", "Priority support"].map((label) => (
              <span key={label} className="pricing-trust__item">
                <IconCheckAccent />
                {label}
              </span>
            ))}
          </div>
        </footer>
      </div>
    </s-page>
  );
}
