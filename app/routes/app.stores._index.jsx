/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { useState, useRef, useEffect } from "react";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
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

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const ids = formData.getAll("ids");

  await prisma.store.deleteMany({
    where: { id: { in: ids }, shop: session.shop },
  });

  return { success: true };
};

export default function StoresIndex() {
  const { stores } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [selected, setSelected] = useState(new Set());
  const [confirmModal, setConfirmModal] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const allChecked = stores.length > 0 && selected.size === stores.length;
  const indeterminate = selected.size > 0 && selected.size < stores.length;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleAll(e) {
    setSelected(e.target.checked ? new Set(stores.map((s) => s.id)) : new Set());
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function executeConfirm() {
    if (confirmModal.type === "single") {
      fetch(`/app/stores/${confirmModal.id}`, { method: "DELETE" }).then(() => window.location.reload());
    } else {
      const form = new FormData();
      selected.forEach((id) => form.append("ids", id));
      fetcher.submit(form, { method: "POST" });
      setSelected(new Set());
    }
    setConfirmModal(null);
  }

  return (
    <s-page heading="Stores" suppressHydrationWarning>
      {/* ── Confirm delete modal ─────────────────────────────────────────── */}
      {confirmModal && (
        <div className="dash-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmModal(null); }}>
          <div className="dash-confirm-modal">
            <div className="dash-confirm-icon">🗑</div>
            <h2 className="dash-confirm-title">Delete {confirmModal.type === "bulk" ? "stores" : "store"}?</h2>
            <p className="dash-confirm-body">
              {confirmModal.type === "bulk"
                ? `You're about to delete ${confirmModal.count} store${confirmModal.count > 1 ? "s" : ""}. This action cannot be undone.`
                : <>You're about to delete <strong>{confirmModal.name}</strong>. This action cannot be undone.</>}
            </p>
            <div className="dash-confirm-actions">
              <button type="button" className="dash-btn-secondary" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button type="button" className="dash-btn-danger" onClick={executeConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dash-surface">
        <div className="dash-toolbar dash-toolbar--split">
          <h2>Manage your store locations</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button type="button" className="dash-btn-secondary" onClick={() => navigate("/app/stores/import")}>
              Import CSV
            </button>
            <button type="button" className="dash-btn-primary" onClick={() => navigate("/app/stores/new")}>
              Add store
            </button>
          </div>
        </div>

        {/* ── Bulk actions dropdown ─────────────────────────────────────── */}
        {stores.length > 0 && (
          <div className="dash-dropdown" ref={dropdownRef} style={{ marginBottom: 8 }}>
            <button
              type="button"
              className="dash-btn-secondary dash-dropdown-trigger"
              onClick={() => setDropdownOpen((o) => !o)}
            >
              Bulk actions
              <svg className={`dash-dropdown-caret${dropdownOpen ? " dash-dropdown-caret--open" : ""}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {dropdownOpen && (
              <div className="dash-dropdown-menu">
                <button
                  type="button"
                  className={`dash-dropdown-item dash-dropdown-item--danger${selected.size === 0 ? " dash-dropdown-item--disabled" : ""}`}
                  disabled={selected.size === 0}
                  onClick={() => {
                    setDropdownOpen(false);
                    setConfirmModal({ type: "bulk", count: selected.size });
                  }}
                >
                  Delete selected
                  {selected.size > 0 && <span className="dash-dropdown-badge">{selected.size}</span>}
                </button>
              </div>
            )}
          </div>
        )}

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
                    <th className="dash-th dash-th--checkbox">
                      <input
                        type="checkbox"
                        className="dash-checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = indeterminate; }}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="dash-th">Name</th>
                    <th className="dash-th">Address</th>
                    <th className="dash-th">City</th>
                    <th className="dash-th dash-td--actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => (
                    <tr key={store.id} className={`dash-tr${selected.has(store.id) ? " dash-tr--selected" : ""}`}>
                      <td className="dash-td dash-td--checkbox">
                        <input
                          type="checkbox"
                          className="dash-checkbox"
                          checked={selected.has(store.id)}
                          onChange={() => toggleOne(store.id)}
                        />
                      </td>
                      <td className="dash-td">{store.name}</td>
                      <td className="dash-td">{store.address}</td>
                      <td className="dash-td">{store.city}</td>
                      <td className="dash-td dash-td--actions">
                        <button
                          type="button"
                          className="dash-btn-ghost"
                          onClick={() => navigate(`/app/stores/${store.id}`)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="dash-btn-ghost dash-btn-ghost--danger"
                          onClick={() => setConfirmModal({ type: "single", id: store.id, name: store.name })}
                        >
                          Delete
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
