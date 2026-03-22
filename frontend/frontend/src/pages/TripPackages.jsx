import React, { useEffect, useMemo, useState } from "react";
import { Calendar, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function TripPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingState, setBookingState] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/trip-packages");
        setPackages(Array.isArray(data?.packages) ? data.packages : []);
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load trip packages");
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const setPackageState = (id, next) => {
    setBookingState((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
  };

  const onToggleAddOn = (pkgId, listingId) => {
    setBookingState((prev) => {
      const current = prev[pkgId]?.addOns || [];
      const exists = current.includes(listingId);
      const nextAddOns = exists ? current.filter((id) => id !== listingId) : [...current, listingId];
      return { ...prev, [pkgId]: { ...prev[pkgId], addOns: nextAddOns } };
    });
  };

  const onBook = async (pkg) => {
    const state = bookingState[pkg._id] || {};
    const guests = Number(state.guests || 1);
    const addOns = state.addOns || [];
    setPackageState(pkg._id, { booking: true });
    try {
      const { data } = await api.post(`/api/trip-packages/${pkg._id}/book`, {
        guests,
        addOnListingIds: addOns,
      });
      setPackageState(pkg._id, { booking: false, success: true });
      const bookingId = data?.booking?._id;
      if (bookingId) {
        navigate(`/payment?bookingId=${bookingId}`);
      } else {
        navigate("/bookings");
      }
    } catch (err) {
      setPackageState(pkg._id, {
        booking: false,
        error: err?.response?.data?.message || "Failed to book trip package",
      });
    }
  };

  return (
    <div className="trip-packages-page">
      <header className="trip-packages-hero">
        <div>
          <p className="trip-packages-kicker">Trip Packages</p>
          <h1>Book a complete trip, then add hotels or activities</h1>
          <p>Choose a package and customize your add-ons before checkout.</p>
        </div>
      </header>

      {error && <p className="trip-packages-error">{error}</p>}
      {loading && <p className="trip-packages-hint">Loading trip packages...</p>}
      {!loading && packages.length === 0 && <p className="trip-packages-hint">No trip packages available yet.</p>}

      <section className="trip-packages-grid">
        {packages.map((pkg) => {
          const state = bookingState[pkg._id] || {};
          const addOnListings = Array.isArray(pkg.addOnListings) ? pkg.addOnListings : [];
          const selectedAddOns = state.addOns || [];
          const addOnTotal = addOnListings
            .filter((item) => selectedAddOns.includes(String(item._id)))
            .reduce((sum, item) => sum + Number(item.pricePerUnit || item.pricing?.price || 0), 0);
          const basePrice = Number(pkg.basePrice || 0);
          const total = basePrice + addOnTotal;

          return (
            <article key={pkg._id} className="trip-package-card">
              <div className="trip-package-media">
                <img src={pkg.coverImage || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"} alt={pkg.title} />
              </div>
              <div className="trip-package-body">
                <div>
                  <h2>{pkg.title}</h2>
                  <p className="trip-package-meta">
                    <MapPin size={14} /> {pkg.location || "Nepal"}
                  </p>
                  <p className="trip-package-meta">
                    <Calendar size={14} /> {formatDate(pkg.startDate)} - {formatDate(pkg.endDate)}
                  </p>
                  <p className="trip-package-meta">
                    <Users size={14} /> Capacity: {pkg.capacity || 1}
                  </p>
                </div>
                <div className="trip-package-price">
                  <span>Base price</span>
                  <strong>{pkg.currency || "NPR"} {basePrice}</strong>
                </div>
              </div>

              {addOnListings.length > 0 && (
                <div className="trip-package-addons">
                  <p className="trip-package-section-title">Add-ons</p>
                  <div className="trip-package-addon-list">
                    {addOnListings.map((item) => {
                      const price = Number(item.pricePerUnit || item.pricing?.price || 0);
                      const checked = selectedAddOns.includes(String(item._id));
                      return (
                        <label key={item._id} className={`trip-addon ${checked ? "is-selected" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleAddOn(pkg._id, String(item._id))}
                          />
                          <span>{item.title}</span>
                          <strong>{pkg.currency || "NPR"} {price}</strong>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="trip-package-actions">
                <div>
                  <label className="trip-package-label">
                    Guests
                    <input
                      type="number"
                      min="1"
                      max={pkg.capacity || 1}
                      value={state.guests || 1}
                      onChange={(e) => setPackageState(pkg._id, { guests: e.target.value })}
                    />
                  </label>
                  <p className="trip-package-total">Total: {pkg.currency || "NPR"} {total}</p>
                </div>
                <button
                  type="button"
                  className="trip-package-btn"
                  onClick={() => onBook(pkg)}
                  disabled={state.booking}
                >
                  {state.booking ? "Booking..." : "Book Trip"}
                </button>
              </div>
              {state.error && <p className="trip-packages-error">{state.error}</p>}
            </article>
          );
        })}
      </section>

      <style>{`
        .trip-packages-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 18px 60px;
          font-family: "Plus Jakarta Sans", "Sora", "DM Sans", system-ui, sans-serif;
          color: #0f172a;
        }
        .trip-packages-hero {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(16, 185, 129, 0.12));
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .trip-packages-kicker {
          margin: 0 0 6px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.72rem;
          color: #0f766e;
          font-weight: 600;
        }
        .trip-packages-hero h1 { margin: 0 0 6px; font-size: clamp(1.6rem, 3vw, 2.2rem); }
        .trip-packages-hero p { margin: 0; color: #475569; }
        .trip-packages-error { color: #b91c1c; margin: 10px 0; }
        .trip-packages-hint { color: #475569; margin: 10px 0; }
        .trip-packages-grid { display: grid; gap: 16px; }
        .trip-package-card {
          background: #fff;
          border: 1px solid rgba(15, 118, 110, 0.2);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }
        .trip-package-media img {
          width: 100%;
          height: 220px;
          object-fit: cover;
          display: block;
        }
        .trip-package-body {
          padding: 16px;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .trip-package-body h2 { margin: 0 0 6px; font-size: 1.2rem; }
        .trip-package-meta {
          margin: 4px 0;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9rem;
        }
        .trip-package-price {
          display: grid;
          gap: 4px;
          background: #f8fafc;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(15, 118, 110, 0.18);
        }
        .trip-package-price span { color: #64748b; font-size: 0.8rem; }
        .trip-package-price strong { font-size: 1.1rem; }
        .trip-package-addons {
          padding: 0 16px 12px;
          border-top: 1px solid rgba(15, 118, 110, 0.12);
        }
        .trip-package-section-title {
          margin: 12px 0 8px;
          font-weight: 700;
          color: #0f766e;
        }
        .trip-package-addon-list {
          display: grid;
          gap: 8px;
        }
        .trip-addon {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: #fff;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .trip-addon.is-selected {
          border-color: rgba(16, 185, 129, 0.5);
          background: #f0fdf4;
        }
        .trip-addon input { accent-color: #0f766e; }
        .trip-package-actions {
          padding: 14px 16px 18px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .trip-package-label {
          display: grid;
          gap: 6px;
          font-size: 0.85rem;
          color: #475569;
        }
        .trip-package-label input {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 6px 10px;
          max-width: 120px;
        }
        .trip-package-total {
          margin: 6px 0 0;
          font-weight: 700;
          color: #0f172a;
        }
        .trip-package-btn {
          border: none;
          border-radius: 999px;
          padding: 10px 16px;
          background: linear-gradient(135deg, #0f766e, #0284c7);
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }
        .trip-package-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
