import React, { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, MapPin, ShieldCheck, Sparkles, Users, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function TripPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingState, setBookingState] = useState({});
  const [expandedId, setExpandedId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/trip-packages");
        const list = Array.isArray(data?.packages) ? data.packages : [];
        setPackages(list);
        setExpandedId((prev) => prev || list[0]?._id || "");
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
    const guests = Number(state.guests || pkg.minGuests || 1);
    const addOns = state.addOns || [];
    setPackageState(pkg._id, { booking: true, error: "" });
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

  const cheapestPackage = useMemo(() => {
    if (!packages.length) return null;
    return packages.reduce((lowest, current) => {
      const currentPrice = Number(current.discountPrice || current.basePrice || 0);
      const lowestPrice = Number(lowest.discountPrice || lowest.basePrice || 0);
      return currentPrice < lowestPrice ? current : lowest;
    }, packages[0]);
  }, [packages]);

  return (
    <div className="trip-packages-page">
      <header className="trip-packages-hero">
        <div className="trip-packages-hero__copy">
          <p className="trip-packages-kicker">Trip Packages</p>
          <h1>Book a final-ready Nepal package system with real trip structure</h1>
          <p>
            Explore packages with itinerary days, hotel plans, activity planning, policies, inclusions, exclusions,
            and optional add-ons before you pay.
          </p>
          <div className="trip-packages-hero__badges">
            <span><ShieldCheck size={15} /> Verified package content</span>
            <span><Sparkles size={15} /> Day-wise itinerary</span>
            <span><CheckCircle2 size={15} /> Flexible add-ons</span>
          </div>
        </div>
        <div className="trip-packages-hero__stats">
          <div>
            <span>Live packages</span>
            <strong>{packages.length}</strong>
          </div>
          <div>
            <span>Starting from</span>
            <strong>{cheapestPackage ? `${cheapestPackage.currency || "NPR"} ${Number(cheapestPackage.discountPrice || cheapestPackage.basePrice || 0)}` : "-"}</strong>
          </div>
          <div>
            <span>Coverage</span>
            <strong>Nepal routes</strong>
          </div>
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
          const guestCount = Number(state.guests || pkg.minGuests || 1);
          const basePrice = Number(pkg.discountPrice || pkg.basePrice || 0);
          const total = basePrice + addOnTotal;
          const tripDays = getTripDays(pkg.startDate, pkg.endDate);
          const isExpanded = expandedId === pkg._id;
          const highlights = Array.isArray(pkg.highlights) ? pkg.highlights : [];
          const included = Array.isArray(pkg.included) ? pkg.included : [];
          const excluded = Array.isArray(pkg.excluded) ? pkg.excluded : [];
          const itineraryDays = Array.isArray(pkg.itineraryDays) ? pkg.itineraryDays : [];

          return (
            <article key={pkg._id} className={`trip-package-card ${isExpanded ? "is-expanded" : ""}`}>
              <div className="trip-package-shell">
                <div className="trip-package-media">
                  <img
                    src={pkg.coverImage || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"}
                    alt={pkg.title}
                  />
                  <div className="trip-package-media__overlay">
                    <div>
                      <p className="trip-package-media__kicker">{pkg.tripType || "Nepal trip package"}</p>
                      <h2>{pkg.title}</h2>
                      <p>{pkg.shortDescription || pkg.description || "Structured travel package with stays and experiences."}</p>
                    </div>
                    <span className="trip-package-media__badge">{tripDays} days</span>
                  </div>
                </div>

                <div className="trip-package-body">
                  <div className="trip-package-main">
                    <div className="trip-package-meta-grid">
                      <p className="trip-package-meta"><MapPin size={14} /> {pkg.location || "Nepal"}{pkg.region ? `, ${pkg.region}` : ""}</p>
                      <p className="trip-package-meta"><Calendar size={14} /> {formatDate(pkg.startDate)} - {formatDate(pkg.endDate)}</p>
                      <p className="trip-package-meta"><Users size={14} /> Guests {pkg.minGuests || 1} - {pkg.maxGuests || pkg.capacity || 1}</p>
                      <p className="trip-package-meta"><Sparkles size={14} /> {pkg.difficulty || "All levels"}{pkg.bestSeason ? ` • ${pkg.bestSeason}` : ""}</p>
                    </div>

                    {highlights.length > 0 && (
                      <div className="trip-package-chips">
                        {highlights.slice(0, 4).map((item) => (
                          <span key={item} className="trip-package-chip">{item}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <aside className="trip-package-price">
                    <span>Package price</span>
                    <strong>{pkg.currency || "NPR"} {basePrice}</strong>
                    {pkg.discountPrice > 0 && (
                      <small>Regular price {pkg.currency || "NPR"} {pkg.basePrice}</small>
                    )}
                    <button
                      type="button"
                      className="trip-package-toggle"
                      onClick={() => setExpandedId((prev) => (prev === pkg._id ? "" : pkg._id))}
                    >
                      {isExpanded ? "Hide details" : "View details"}
                    </button>
                  </aside>
                </div>

                {isExpanded && (
                  <div className="trip-package-details">
                    <div className="trip-package-columns">
                      <section className="trip-package-panel">
                        <h3>Included</h3>
                        {included.length ? (
                          <ul className="trip-package-list trip-package-list--ok">
                            {included.map((item) => (
                              <li key={item}><CheckCircle2 size={15} /> {item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="trip-package-empty">No included items listed.</p>
                        )}
                      </section>

                      <section className="trip-package-panel">
                        <h3>Excluded</h3>
                        {excluded.length ? (
                          <ul className="trip-package-list trip-package-list--warn">
                            {excluded.map((item) => (
                              <li key={item}><XCircle size={15} /> {item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="trip-package-empty">No excluded items listed.</p>
                        )}
                      </section>
                    </div>

                    <section className="trip-package-panel">
                      <div className="trip-package-section__head">
                        <h3>Day-wise itinerary</h3>
                        <span>{itineraryDays.length || tripDays} planned days</span>
                      </div>
                      <div className="trip-itinerary">
                        {(itineraryDays.length ? itineraryDays : [{ dayNumber: 1, title: pkg.title, summary: pkg.description }]).map((day, index) => {
                          const activityNames = Array.isArray(day.activities)
                            ? day.activities.map((activity) => activity.title || activity.listingId?.title).filter(Boolean)
                            : [];
                          return (
                            <article key={`${pkg._id}-day-${index}`} className="trip-itinerary-day">
                              <div className="trip-itinerary-day__badge">Day {day.dayNumber || index + 1}</div>
                              <div className="trip-itinerary-day__content">
                                <h4>{day.title || `Day ${day.dayNumber || index + 1}`}</h4>
                                <p>{day.summary || "Travel, stays, and experiences will be organized for this day."}</p>
                                <div className="trip-itinerary-day__meta">
                                  <span>Hotel: {day.hotelName || day.hotelListingId?.title || "TBD"}</span>
                                  <span>Meals: {Array.isArray(day.meals) && day.meals.length ? day.meals.join(", ") : "TBD"}</span>
                                  <span>Transport: {day.transport || "TBD"}</span>
                                </div>
                                {activityNames.length > 0 && (
                                  <div className="trip-package-chips trip-package-chips--soft">
                                    {activityNames.map((item) => (
                                      <span key={`${pkg._id}-${day.dayNumber}-${item}`} className="trip-package-chip">{item}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>

                    <div className="trip-package-columns">
                      <section className="trip-package-panel">
                        <h3>Policies</h3>
                        <div className="trip-policy">
                          <strong>Payment policy</strong>
                          <p>{pkg.paymentPolicy || "Payment terms will be confirmed during checkout."}</p>
                        </div>
                        <div className="trip-policy">
                          <strong>Cancellation policy</strong>
                          <p>{pkg.cancellationPolicy || "Cancellation terms are not listed yet."}</p>
                        </div>
                      </section>

                      <section className="trip-package-panel">
                        <h3>Customize and book</h3>
                        {addOnListings.length > 0 && (
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
                        )}

                        <div className="trip-package-actions">
                          <label className="trip-package-label">
                            Guests
                            <input
                              type="number"
                              min={pkg.minGuests || 1}
                              max={pkg.maxGuests || pkg.capacity || 1}
                              value={guestCount}
                              onChange={(e) => setPackageState(pkg._id, { guests: e.target.value })}
                            />
                          </label>

                          <div className="trip-package-total-box">
                            <p className="trip-package-total-row"><span>Package</span><strong>{pkg.currency || "NPR"} {basePrice}</strong></p>
                            <p className="trip-package-total-row"><span>Add-ons</span><strong>{pkg.currency || "NPR"} {addOnTotal}</strong></p>
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
                      </section>
                    </div>

                    {Array.isArray(pkg.faqs) && pkg.faqs.length > 0 && (
                      <section className="trip-package-panel">
                        <h3>Frequently asked questions</h3>
                        <div className="trip-package-faqs">
                          {pkg.faqs.map((faq, index) => (
                            <article key={`${pkg._id}-faq-${index}`} className="trip-package-faq">
                              <h4>{faq.question}</h4>
                              <p>{faq.answer}</p>
                            </article>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <style>{`
        .trip-packages-page {
          max-width: 1240px;
          margin: 0 auto;
          padding: 28px 18px 60px;
          font-family: "Manrope", "Plus Jakarta Sans", "DM Sans", system-ui, sans-serif;
          color: #1f2937;
        }
        .trip-packages-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.9fr);
          gap: 18px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 248, 244, 0.9)),
            linear-gradient(135deg, rgba(255, 160, 122, 0.08), rgba(125, 211, 252, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.82);
          border-radius: 32px;
          padding: 28px;
          margin-bottom: 22px;
          box-shadow: 0 22px 42px rgba(15, 23, 42, 0.07);
          backdrop-filter: blur(14px);
        }
        .trip-packages-kicker {
          margin: 0 0 8px;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 700;
        }
        .trip-packages-hero h1 {
          margin: 0 0 10px;
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1.06;
          letter-spacing: -0.03em;
          font-family: "Playfair Display", serif;
        }
        .trip-packages-hero p {
          margin: 0;
          color: #475569;
          line-height: 1.7;
          max-width: 58ch;
        }
        .trip-packages-hero__badges {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 16px;
        }
        .trip-packages-hero__badges span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(255, 255, 255, 0.82);
          font-size: 0.84rem;
          font-weight: 600;
          color: #0f172a;
        }
        .trip-packages-hero__stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          align-self: end;
        }
        .trip-packages-hero__stats div {
          display: grid;
          gap: 6px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.82);
        }
        .trip-packages-hero__stats span {
          color: #64748b;
          font-size: 0.75rem;
        }
        .trip-packages-hero__stats strong {
          font-size: 1rem;
        }
        .trip-packages-error { color: #b91c1c; margin: 10px 0; }
        .trip-packages-hint { color: #475569; margin: 10px 0; }
        .trip-packages-grid { display: grid; gap: 20px; }
        .trip-package-card {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.82);
          box-shadow: 0 20px 38px rgba(15, 23, 42, 0.06);
          overflow: hidden;
          backdrop-filter: blur(14px);
        }
        .trip-package-shell { display: grid; gap: 0; }
        .trip-package-media {
          position: relative;
          min-height: 320px;
        }
        .trip-package-media img {
          width: 100%;
          height: 100%;
          min-height: 320px;
          object-fit: cover;
          display: block;
        }
        .trip-package-media__overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          padding: 24px;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.06), rgba(15, 23, 42, 0.72));
          color: white;
        }
        .trip-package-media__overlay h2 {
          margin: 0 0 8px;
          font-size: clamp(1.6rem, 3vw, 2.4rem);
        }
        .trip-package-media__overlay p {
          margin: 0;
          max-width: 48ch;
          color: rgba(255, 255, 255, 0.88);
          line-height: 1.6;
        }
        .trip-package-media__kicker {
          margin: 0 0 8px !important;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 0.74rem;
          color: rgba(255, 255, 255, 0.7) !important;
          font-weight: 700;
        }
        .trip-package-media__badge {
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.24);
          backdrop-filter: blur(12px);
          font-weight: 700;
          white-space: nowrap;
        }
        .trip-package-body {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: start;
          padding: 22px 24px;
          border-bottom: 1px solid #e2e8f0;
        }
        .trip-package-meta-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 18px;
          margin-bottom: 14px;
        }
        .trip-package-meta {
          margin: 0;
          color: #475569;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.92rem;
        }
        .trip-package-price {
          min-width: 200px;
          display: grid;
          gap: 6px;
          padding: 16px;
          border-radius: 18px;
          background: linear-gradient(180deg, #fff8f4, rgba(255, 255, 255, 0.92));
          border: 1px solid rgba(255, 228, 220, 0.9);
        }
        .trip-package-price span { color: #64748b; font-size: 0.8rem; }
        .trip-package-price strong { font-size: 1.28rem; }
        .trip-package-price small { color: #64748b; }
        .trip-package-toggle {
          border: none;
          background: rgba(255, 111, 97, 0.12);
          color: #e25a4f;
          font-weight: 700;
          border-radius: 999px;
          padding: 10px 12px;
          cursor: pointer;
        }
        .trip-package-details {
          display: grid;
          gap: 18px;
          padding: 0 24px 24px;
        }
        .trip-package-columns {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
        .trip-package-panel {
          display: grid;
          gap: 12px;
          padding: 18px;
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.82);
          background: rgba(255, 255, 255, 0.88);
        }
        .trip-package-panel h3,
        .trip-package-panel h4 {
          margin: 0;
        }
        .trip-package-section__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .trip-package-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .trip-package-chip {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: #fff9f6;
          border: 1px solid rgba(255, 228, 220, 0.9);
          color: #334155;
          font-size: 0.84rem;
          font-weight: 600;
        }
        .trip-package-chips--soft .trip-package-chip {
          background: #fff7ed;
          border-color: #fed7aa;
        }
        .trip-package-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }
        .trip-package-list li {
          display: flex;
          gap: 8px;
          color: #334155;
          line-height: 1.55;
        }
        .trip-package-list--ok svg { color: #059669; }
        .trip-package-list--warn svg { color: #dc2626; }
        .trip-package-empty {
          margin: 0;
          color: #64748b;
        }
        .trip-itinerary {
          display: grid;
          gap: 12px;
        }
        .trip-itinerary-day {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 14px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(255, 255, 255, 0.82);
        }
        .trip-itinerary-day__badge {
          padding: 10px 12px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid #e2e8f0;
          font-weight: 700;
          color: #e25a4f;
          height: fit-content;
        }
        .trip-itinerary-day__content h4 {
          margin: 0 0 6px;
        }
        .trip-itinerary-day__content p {
          margin: 0;
          color: #475569;
          line-height: 1.6;
        }
        .trip-itinerary-day__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 16px;
          margin: 10px 0 0;
          color: #334155;
          font-size: 0.9rem;
        }
        .trip-policy strong {
          display: block;
          margin-bottom: 6px;
        }
        .trip-policy p {
          margin: 0;
          color: #475569;
          line-height: 1.6;
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
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.82);
          background: rgba(255, 255, 255, 0.88);
          font-size: 0.9rem;
          cursor: pointer;
        }
        .trip-addon.is-selected {
          border-color: rgba(255, 111, 97, 0.4);
          background: #fff1ef;
        }
        .trip-addon input { accent-color: #ff6f61; }
        .trip-package-actions {
          display: grid;
          gap: 12px;
        }
        .trip-package-label {
          display: grid;
          gap: 6px;
          font-size: 0.86rem;
          color: #475569;
        }
        .trip-package-label input {
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 8px 12px;
          max-width: 120px;
        }
        .trip-package-total-box {
          display: grid;
          gap: 6px;
        }
        .trip-package-total-row {
          margin: 0;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          color: #475569;
          font-size: 0.9rem;
        }
        .trip-package-total {
          margin: 2px 0 0;
          font-weight: 800;
          color: #0f172a;
          font-size: 1.02rem;
        }
        .trip-package-btn {
          border: none;
          border-radius: 999px;
          padding: 12px 18px;
          background: linear-gradient(135deg, #ff6f61, #e25a4f);
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(255, 111, 97, 0.24);
        }
        .trip-package-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .trip-package-faqs {
          display: grid;
          gap: 10px;
        }
        .trip-package-faq {
          padding: 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(255, 255, 255, 0.82);
        }
        .trip-package-faq h4 {
          margin: 0 0 6px;
        }
        .trip-package-faq p {
          margin: 0;
          color: #475569;
          line-height: 1.6;
        }
        @media (max-width: 960px) {
          .trip-packages-hero,
          .trip-package-columns,
          .trip-package-body {
            grid-template-columns: 1fr;
          }
          .trip-packages-hero__stats {
            grid-template-columns: 1fr;
          }
          .trip-package-price {
            min-width: 0;
          }
        }
        @media (max-width: 640px) {
          .trip-packages-page {
            padding-left: 14px;
            padding-right: 14px;
          }
          .trip-packages-hero,
          .trip-package-body,
          .trip-package-details {
            padding-left: 16px;
            padding-right: 16px;
          }
          .trip-package-media {
            min-height: 260px;
          }
          .trip-package-media img {
            min-height: 260px;
          }
          .trip-package-media__overlay {
            padding: 18px 16px;
            flex-direction: column;
            align-items: start;
          }
          .trip-itinerary-day {
            grid-template-columns: 1fr;
          }
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

function getTripDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diff = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
}
