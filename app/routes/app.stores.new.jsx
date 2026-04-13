/**
 * Developed by eBrook Group.
 * Copyright © 2026 eBrook Group (https://www.ebrook.com.tw)
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import "../styles/dash-theme.css";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await prisma.settings.findUnique({ where: { shop: session.shop } });
  return { googleMapsApiKey: settings?.googleMapsApiKey ?? null };
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
  const { googleMapsApiKey } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const isSubmitting = fetcher.state === "submitting";

  // ── Controlled form fields ─────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("");
  const [zip, setZip] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [phone, setPhone] = useState("");

  // ── Validation errors ──────────────────────────────────────────────────────
  const [errors, setErrors] = useState({});

  // ── Modal state ────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState(null);

  // ── Modal map refs ─────────────────────────────────────────────────────────
  const modalMapDivRef = useRef(null);
  const modalSearchRef = useRef(null);
  const modalMapRef = useRef(null);
  const modalMarkerRef = useRef(null);

  useEffect(() => {
    if (fetcher.data?.success) navigate("/app/stores");
  }, [fetcher.data, navigate]);

  function handleSave() {
    const errs = {};
    if (!name.trim()) errs.name = "Store name is required.";
    if (!address.trim()) errs.address = "Street address is required.";
    if (!city.trim()) errs.city = "City is required.";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    fetcher.submit(document.querySelector("form"));
  }

  // ── Init map when modal opens ──────────────────────────────────────────────
  useEffect(() => {
    if (!modalOpen || !googleMapsApiKey) return;

    const doInit = () => {
      if (!modalMapDivRef.current || modalMapRef.current) return;

      const map = new window.google.maps.Map(modalMapDivRef.current, {
        center: { lat: 25.033, lng: 121.5654 },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapId: "DEMO_MAP_ID",
      });
      modalMapRef.current = map;

      const marker = new window.google.maps.marker.AdvancedMarkerElement({ map, gmpDraggable: true, position: null });
      modalMarkerRef.current = marker;

      marker.addListener("dragend", () => {
        const pos = marker.position;
        const lat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
        const lng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
        reverseGeocode(lat, lng);
      });

      map.addListener("click", (e) => {
        marker.position = e.latLng;
        reverseGeocode(e.latLng.lat(), e.latLng.lng());
      });

      if (modalSearchRef.current) {
        const ac = new window.google.maps.places.Autocomplete(modalSearchRef.current, {
          fields: ["address_components", "geometry", "name", "formatted_phone_number", "international_phone_number"],
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place.geometry) return;
          if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
          } else {
            map.setCenter(place.geometry.location);
            map.setZoom(17);
          }
          marker.position = place.geometry.location;
          buildPending(
            place.address_components ?? [],
            place.geometry.location.lat(),
            place.geometry.location.lng(),
            place.name ?? "",
            place.international_phone_number ?? place.formatted_phone_number ?? ""
          );
        });
      }
    };

    if (window.google?.maps?.marker) {
      doInit();
    } else {
      let script = document.getElementById("google-maps-admin");
      if (!script) {
        script = document.createElement("script");
        script.id = "google-maps-admin";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places,marker`;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", doInit);
    }

    return () => {
      modalMapRef.current = null;
      modalMarkerRef.current = null;
      const s = document.getElementById("google-maps-admin");
      if (s) s.removeEventListener("load", doInit);
    };
  }, [modalOpen, googleMapsApiKey]);

  function reverseGeocode(latVal, lngVal) {
    new window.google.maps.Geocoder().geocode(
      { location: { lat: latVal, lng: lngVal } },
      (results, status) => {
        if (status === "OK" && results[0])
          buildPending(results[0].address_components, latVal, lngVal, "", "");
      }
    );
  }

  function buildPending(components, latVal, lngVal, placeName, placePhone) {
    const get = (t) => components.find((c) => c.types.includes(t))?.long_name ?? "";
    setPending({
      name: placeName,
      address: [get("street_number"), get("route")].filter(Boolean).join(" "),
      city: get("locality") || get("sublocality_level_1") || get("administrative_area_level_3") || get("administrative_area_level_2"),
      province: get("administrative_area_level_1"),
      country: get("country"),
      zip: get("postal_code"),
      lat: String(latVal),
      lng: String(lngVal),
      phone: placePhone,
    });
  }

  function confirmModal() {
    if (!pending) return;
    if (pending.name) setName(pending.name);
    setAddress(pending.address);
    setCity(pending.city);
    setProvince(pending.province);
    setCountry(pending.country);
    setZip(pending.zip);
    setLat(pending.lat);
    setLng(pending.lng);
    if (pending.phone) setPhone(pending.phone);
    closeModal();
  }

  function openModal() {
    setPending(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  return (
    <>
      {/* ── Map picker modal ──────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="dash-modal-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="dash-modal">
            <div className="dash-modal-header">
              <h2 className="dash-modal-title">Pick location from map</h2>
              <button className="dash-modal-close" onClick={closeModal} aria-label="Close">✕</button>
            </div>

            <div className="dash-modal-body">
              <div className="dash-modal-left">
                <p className="dash-subtle" style={{ marginTop: 0 }}>
                  Search for an address or click on the map to select a location.
                </p>
                <input
                  ref={modalSearchRef}
                  type="text"
                  placeholder="Search address…"
                  className="dash-map-search-input"
                  autoComplete="off"
                />

                {pending ? (
                  <div className="dash-modal-preview">
                    {[
                      ["Name", pending.name],
                      ["Phone", pending.phone],
                      ["Address", pending.address],
                      ["City", pending.city],
                      ["Province", pending.province],
                      ["Country", pending.country],
                      ["Zip", pending.zip],
                      ["Lat / Lng", pending.lat && `${parseFloat(pending.lat).toFixed(5)}, ${parseFloat(pending.lng).toFixed(5)}`],
                    ]
                      .filter(([, v]) => v)
                      .map(([label, value]) => (
                        <div key={label} className="dash-modal-preview-row">
                          <span className="dash-modal-preview-label">{label}</span>
                          <span>{value}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="dash-modal-empty-hint">No location selected yet</div>
                )}
              </div>

              <div ref={modalMapDivRef} className="dash-modal-map" />
            </div>

            <div className="dash-modal-footer">
              <button className="dash-btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="dash-btn-primary" disabled={!pending} onClick={confirmModal}>
                Confirm location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main page ─────────────────────────────────────────────────────── */}
      <s-page
        heading="Add New Store"
        back-action={{ content: "Stores", onAction: () => navigate("/app/stores") }}
        suppressHydrationWarning
      >
        <div className="dash-surface">
          <div className="dash-toolbar">
            {googleMapsApiKey && (
              <button type="button" className="dash-btn-secondary" onClick={openModal}>
                Pick from map
              </button>
            )}
            <button
              type="button"
              className="dash-btn-primary"
              disabled={isSubmitting}
              onClick={handleSave}
            >
              {isSubmitting ? "Saving…" : "Save store"}
            </button>
          </div>

          <form method="post">
            <div className="dash-layout">
              {/* ── Left column ─────────────────────────────────────────── */}
              <div>
                <div className="dash-card">
                  <div className="dash-form-stack">
                    <h2 className="dash-card-title">General information</h2>
                    <div className="dash-form-field">
                      <label className="dash-label dash-label--required">Store Name</label>
                      <input
                        className={`dash-input${errors.name ? " dash-input--error" : ""}`}
                        type="text"
                        name="name"
                        placeholder="e.g. JIKA Downtown"
                        value={name}
                        onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: undefined })); }}
                      />
                      {errors.name && <span className="dash-field-error">{errors.name}</span>}
                    </div>

                    <div>
                      <h3 className="dash-card-title" style={{ fontSize: "1rem", marginBottom: 12 }}>
                        Location details
                      </h3>
                      <div className="dash-form-stack">
                        <div className="dash-form-field">
                          <label className="dash-label dash-label--required">Street Address</label>
                          <input
                            className={`dash-input${errors.address ? " dash-input--error" : ""}`}
                            type="text"
                            name="address"
                            placeholder="123 Fashion St."
                            value={address}
                            onChange={(e) => { setAddress(e.target.value); if (errors.address) setErrors((p) => ({ ...p, address: undefined })); }}
                          />
                          {errors.address && <span className="dash-field-error">{errors.address}</span>}
                        </div>
                        <div className="dash-two-col dash-two-col--2-1">
                          <div className="dash-form-field">
                            <label className="dash-label dash-label--required">City</label>
                            <input
                              className={`dash-input${errors.city ? " dash-input--error" : ""}`}
                              type="text"
                              name="city"
                              value={city}
                              onChange={(e) => { setCity(e.target.value); if (errors.city) setErrors((p) => ({ ...p, city: undefined })); }}
                            />
                            {errors.city && <span className="dash-field-error">{errors.city}</span>}
                          </div>
                          <div className="dash-form-field">
                            <label className="dash-label">Province / State</label>
                            <input className="dash-input" type="text" name="province" value={province} onChange={(e) => setProvince(e.target.value)} />
                          </div>
                        </div>
                        <div className="dash-two-col">
                          <div className="dash-form-field">
                            <label className="dash-label">Country</label>
                            <input className="dash-input" type="text" name="country" value={country} onChange={(e) => setCountry(e.target.value)} />
                          </div>
                          <div className="dash-form-field">
                            <label className="dash-label">Zip / Postal Code</label>
                            <input className="dash-input" type="text" name="zip" value={zip} onChange={(e) => setZip(e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dash-card">
                  <div className="dash-form-stack">
                    <h2 className="dash-card-title">Contact & online</h2>
                    <div className="dash-two-col">
                      <div className="dash-form-field">
                        <label className="dash-label">Phone Number</label>
                        <input
                          className="dash-input"
                          type="tel"
                          name="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                      <s-text-field label="Email Address" name="email" type="email" />
                    </div>
                    <s-text-field label="Store Website URL" name="website" type="url" placeholder="https://..." />
                  </div>
                </div>
              </div>

              {/* ── Right column ─────────────────────────────────────────── */}
              <div>
                <div className="dash-card">
                  <div className="dash-form-stack">
                    <h2 className="dash-card-title">Map coordinates</h2>
                    <p className="dash-subtle">Coordinates pin the store accurately on Google Maps.</p>
                    <div className="dash-two-col">
                      <div className="dash-form-field">
                        <label className="dash-label">Latitude</label>
                        <input className="dash-input" type="number" name="latitude" step="any" placeholder="40.7128" value={lat} onChange={(e) => setLat(e.target.value)} />
                      </div>
                      <div className="dash-form-field">
                        <label className="dash-label">Longitude</label>
                        <input className="dash-input" type="number" name="longitude" step="any" placeholder="-74.0060" value={lng} onChange={(e) => setLng(e.target.value)} />
                      </div>
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
    </>
  );
}
