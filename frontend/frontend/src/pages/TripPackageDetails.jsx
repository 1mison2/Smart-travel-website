import React, { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, MapPin, ShieldCheck, Sparkles, Star, Users, XCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { resolveImageUrl } from "../utils/api";

export default function TripPackageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState({
    guests: 1,
    addOns: [],
    booking: false,
    bookingError: "",
  });

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        setLoading(true);
        const [packageRes, locationsRes] = await Promise.all([
          api.get(`/api/trip-packages/${id}`),
          api.get("/api/locations"),
        ]);
        const data = packageRes.data;
        const tripPackage = data?.tripPackage || null;
        setPkg(tripPackage);
        setLocations(Array.isArray(locationsRes.data) ? locationsRes.data : []);
        setBooking((current) => ({
          ...current,
          guests: Number(tripPackage?.minGuests || 1),
          addOns: [],
          bookingError: "",
        }));
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load trip package");
      } finally {
        setLoading(false);
      }
    };
    fetchPackage();
  }, [id]);

  const addOnListings = Array.isArray(pkg?.addOnListings) ? pkg.addOnListings : [];
  const selectedAddOns = booking.addOns || [];
  const guestCount = Number(booking.guests || pkg?.minGuests || 1);
  const basePrice = Number(pkg?.discountPrice || pkg?.basePrice || 0);
  const addOnUnitTotal = addOnListings
    .filter((item) => selectedAddOns.includes(String(item._id)))
    .reduce((sum, item) => sum + Number(item.pricePerUnit || item.pricing?.price || 0), 0);
  const total = (basePrice + addOnUnitTotal) * guestCount;

  const locationImageMap = useMemo(() => {
    const pairs = (Array.isArray(locations) ? locations : []).map((location) => [
      String(location?.name || "").trim().toLowerCase(),
      resolveImageUrl(location?.image || location?.images?.[0] || ""),
    ]);
    return new Map(pairs.filter(([, image]) => Boolean(image)));
  }, [locations]);

  const packageImage =
    locationImageMap.get(String(pkg?.location || "").trim().toLowerCase()) ||
    resolveImageUrl(pkg?.coverImage) ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80";

  const activityDetails = useMemo(() => {
    if (!pkg) return [];
    const itineraryDays = Array.isArray(pkg.itineraryDays) ? pkg.itineraryDays : [];
    return Array.from(
      new Map(
        itineraryDays
          .flatMap((day) => (Array.isArray(day.activities) ? day.activities : []))
          .map((activity) => {
            const listing = activity?.listingId;
            if (listing?._id) return [String(listing._id), listing];
            if (!activity?.title) return null;
            return [
              `title:${activity.title}`,
              {
                _id: `title:${activity.title}`,
                title: activity.title,
                description: activity.notes || "Included activity",
                location: { address: pkg.location || "Nepal" },
                pricePerUnit: 0,
                capacity: 0,
                rating: 0,
                amenities: [],
              },
            ];
          })
          .filter(Boolean)
      ).values()
    );
  }, [pkg]);

  const onToggleAddOn = (listingId) => {
    setBooking((prev) => {
      const current = prev.addOns || [];
      const exists = current.includes(listingId);
      const nextAddOns = exists ? current.filter((id) => id !== listingId) : [...current, listingId];
      return { ...prev, addOns: nextAddOns };
    });
  };

  const onBook = async () => {
    if (!pkg?._id) return;
    try {
      setBooking((prev) => ({ ...prev, booking: true, bookingError: "" }));
      const { data } = await api.post(`/api/trip-packages/${pkg._id}/book`, {
        guests: guestCount,
        addOnListingIds: selectedAddOns,
      });
      const bookingId = data?.booking?._id;
      if (bookingId) {
        navigate(`/payment?bookingId=${bookingId}`);
      } else {
        navigate("/bookings");
      }
    } catch (err) {
      setBooking((prev) => ({
        ...prev,
        booking: false,
        bookingError: err?.response?.data?.message || "Failed to book trip package",
      }));
    }
  };

  if (loading) {
    return <div className="trip-package-detail-page"><div className="trip-package-detail-shell">Loading package details...</div></div>;
  }

  if (error || !pkg) {
    return <div className="trip-package-detail-page"><div className="trip-package-detail-shell"><p className="trip-package-detail-error">{error || "Package not found"}</p></div></div>;
  }

  const highlights = Array.isArray(pkg.highlights) ? pkg.highlights : [];
  const included = Array.isArray(pkg.included) ? pkg.included : [];
  const excluded = Array.isArray(pkg.excluded) ? pkg.excluded : [];
  const itineraryDays = Array.isArray(pkg.itineraryDays) && pkg.itineraryDays.length ? pkg.itineraryDays : [{ dayNumber: 1, title: pkg.title, summary: pkg.description }];
  const tripDays = getTripDays(pkg.startDate, pkg.endDate);

  return (
    <div className="trip-package-detail-page">
      <div className="trip-package-detail-shell">
        <div className="trip-package-detail-topbar">
          <Link to="/trip-packages" className="trip-package-detail-back">Back to packages</Link>
          <span className="trip-package-detail-kicker">{pkg.isFeatured ? "Featured Package" : pkg.tripType || "Trip Package"}</span>
        </div>

        <header className="trip-package-detail-hero">
          <div className="trip-package-detail-hero__media">
            <img
              src={packageImage}
              alt={pkg.title}
            />
            <div className="trip-package-detail-hero__veil" />
          </div>

          <div className="trip-package-detail-hero__content">
            <h1>{pkg.title}</h1>
            <p>{pkg.shortDescription || pkg.description}</p>
            <div className="trip-package-detail-hero__meta">
              <span><MapPin size={15} /> {pkg.location || "Nepal"}{pkg.region ? `, ${pkg.region}` : ""}</span>
              <span><Calendar size={15} /> {tripDays} days</span>
              <span><Users size={15} /> {pkg.minGuests || 1} - {pkg.maxGuests || pkg.capacity || 1} guests</span>
              {Number(pkg.rating || 0) > 0 && <span><Star size={15} /> {Number(pkg.rating).toFixed(1)}</span>}
            </div>
            {!!highlights.length && (
              <div className="trip-package-detail-chips">
                {highlights.map((item) => (
                  <span key={item} className="trip-package-detail-chip">{item}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        <section className="trip-package-detail-layout">
          <div className="trip-package-detail-main">
            <section className="trip-package-detail-panel">
              <div className="trip-package-detail-section-head">
                <h2>Package overview</h2>
                <span>{formatDate(pkg.startDate)} - {formatDate(pkg.endDate)}</span>
              </div>
              <p className="trip-package-detail-copy">{pkg.description || pkg.shortDescription}</p>
              <div className="trip-package-detail-facts">
                <span><ShieldCheck size={15} /> {pkg.bestSeason || "Flexible season"}</span>
                <span><Sparkles size={15} /> {pkg.difficulty || "All levels"}</span>
                <span><CheckCircle2 size={15} /> {pkg.tripType || "Curated travel"}</span>
              </div>
            </section>

            <div className="trip-package-detail-columns">
              <section className="trip-package-detail-panel">
                <h2>Included</h2>
                {included.length ? (
                  <ul className="trip-package-detail-list trip-package-detail-list--ok">
                    {included.map((item) => (
                      <li key={item}><CheckCircle2 size={15} /> {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="trip-package-detail-empty">No included items listed.</p>
                )}
              </section>

              <section className="trip-package-detail-panel">
                <h2>Excluded</h2>
                {excluded.length ? (
                  <ul className="trip-package-detail-list trip-package-detail-list--warn">
                    {excluded.map((item) => (
                      <li key={item}><XCircle size={15} /> {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="trip-package-detail-empty">No excluded items listed.</p>
                )}
              </section>
            </div>

            <section className="trip-package-detail-panel">
              <div className="trip-package-detail-section-head">
                <h2>Day-by-day itinerary</h2>
                <span>{itineraryDays.length} planned days</span>
              </div>
              <div className="trip-package-detail-itinerary">
                {itineraryDays.map((day, index) => {
                  const activityNames = Array.isArray(day.activities)
                    ? day.activities.map((activity) => activity.title || activity.listingId?.title).filter(Boolean)
                    : [];
                  return (
                    <article key={`${pkg._id}-day-${index}`} className="trip-package-detail-day">
                      <div className="trip-package-detail-day__badge">Day {day.dayNumber || index + 1}</div>
                      <div className="trip-package-detail-day__content">
                        <h3>{day.title || `Day ${day.dayNumber || index + 1}`}</h3>
                        <p>{day.summary || "Travel, stays, and experiences will be organized for this day."}</p>
                        <div className="trip-package-detail-day__meta">
                          <span>Hotel: {day.hotelName || day.hotelListingId?.title || "TBD"}</span>
                          <span>Meals: {Array.isArray(day.meals) && day.meals.length ? day.meals.join(", ") : "TBD"}</span>
                          <span>Transport: {day.transport || "TBD"}</span>
                        </div>
                        {activityNames.length > 0 && (
                          <div className="trip-package-detail-chips">
                            {activityNames.map((item) => (
                              <span key={`${pkg._id}-${day.dayNumber}-${item}`} className="trip-package-detail-chip trip-package-detail-chip--soft">{item}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="trip-package-detail-panel">
              <div className="trip-package-detail-section-head">
                <h2>Activities included</h2>
                <span>{activityDetails.length} curated stops</span>
              </div>
              {activityDetails.length > 0 ? (
                <div className="trip-package-detail-activity-grid">
                  {activityDetails.map((activity) => (
                    <article key={activity._id || activity.title} className="trip-package-detail-activity">
                      <div className="trip-package-detail-activity__head">
                        <h3>{activity.title}</h3>
                        {Number(activity.rating || 0) > 0 && (
                          <span><Star size={14} /> {Number(activity.rating).toFixed(1)}</span>
                        )}
                      </div>
                      <p>{activity.description || "Included in this package itinerary."}</p>
                      <div className="trip-package-detail-activity__meta">
                        <span>Address: {activity.location?.address || activity.location?.name || pkg.location || "Nepal"}</span>
                        <span>Price: {pkg.currency || "NPR"} {Number(activity.pricePerUnit || 0)}</span>
                        <span>Capacity: {activity.capacity || "Flexible"}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="trip-package-detail-empty">Detailed activities will appear after itinerary items are linked.</p>
              )}
            </section>

            {(pkg.paymentPolicy || pkg.cancellationPolicy) && (
              <div className="trip-package-detail-columns">
                <section className="trip-package-detail-panel">
                  <h2>Payment policy</h2>
                  <p className="trip-package-detail-copy">{pkg.paymentPolicy || "Payment terms will be confirmed during checkout."}</p>
                </section>
                <section className="trip-package-detail-panel">
                  <h2>Cancellation policy</h2>
                  <p className="trip-package-detail-copy">{pkg.cancellationPolicy || "Cancellation terms are not listed yet."}</p>
                </section>
              </div>
            )}

            {Array.isArray(pkg.faqs) && pkg.faqs.length > 0 && (
              <section className="trip-package-detail-panel">
                <h2>Frequently asked questions</h2>
                <div className="trip-package-detail-faqs">
                  {pkg.faqs.map((faq, index) => (
                    <article key={`${pkg._id}-faq-${index}`} className="trip-package-detail-faq">
                      <h3>{faq.question}</h3>
                      <p>{faq.answer}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="trip-package-detail-sidebar">
            <section className="trip-package-detail-bookbox">
              <p className="trip-package-detail-bookbox__label">From</p>
              <strong>{pkg.currency || "NPR"} {basePrice}</strong>
              <small>per person before add-ons</small>

              {addOnListings.length > 0 && (
                <div className="trip-package-detail-addon-list">
                  {addOnListings.map((item) => {
                    const price = Number(item.pricePerUnit || item.pricing?.price || 0);
                    const checked = selectedAddOns.includes(String(item._id));
                    return (
                      <label key={item._id} className={`trip-package-detail-addon ${checked ? "is-selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleAddOn(String(item._id))}
                        />
                        <span>{item.title}</span>
                        <strong>{pkg.currency || "NPR"} {price}</strong>
                      </label>
                    );
                  })}
                </div>
              )}

              <label className="trip-package-detail-input">
                Guests
                <input
                  type="number"
                  min={pkg.minGuests || 1}
                  max={pkg.maxGuests || pkg.capacity || 1}
                  value={guestCount}
                  onChange={(e) => setBooking((prev) => ({ ...prev, guests: e.target.value }))}
                />
              </label>

              <div className="trip-package-detail-total">
                <p><span>Package x {guestCount}</span><strong>{pkg.currency || "NPR"} {basePrice * guestCount}</strong></p>
                <p><span>Add-ons x {guestCount}</span><strong>{pkg.currency || "NPR"} {addOnUnitTotal * guestCount}</strong></p>
                <h3>Total: {pkg.currency || "NPR"} {total}</h3>
                <small>Pricing updates automatically based on guest count and selected add-ons.</small>
              </div>

              <button
                type="button"
                className="trip-package-detail-bookbtn"
                onClick={onBook}
                disabled={booking.booking}
              >
                {booking.booking ? "Booking..." : "Continue to booking"}
              </button>
              {booking.bookingError && <p className="trip-package-detail-error">{booking.bookingError}</p>}
            </section>
          </aside>
        </section>
      </div>

      <style>{`
        .trip-package-detail-page {
          padding: 28px 18px 60px;
        }
        .trip-package-detail-shell {
          max-width: 1240px;
          margin: 0 auto;
          font-family: "Manrope", "Plus Jakarta Sans", "DM Sans", system-ui, sans-serif;
          color: #0f172a;
        }
        .trip-package-detail-topbar {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .trip-package-detail-back {
          color: #1d4ed8;
          font-weight: 700;
          text-decoration: none;
        }
        .trip-package-detail-kicker {
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 0.78rem;
          font-weight: 800;
        }
        .trip-package-detail-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
          overflow: hidden;
          border-radius: 34px;
          background: #17385a;
          box-shadow: 0 24px 44px rgba(15, 23, 42, 0.12);
          margin-bottom: 22px;
        }
        .trip-package-detail-hero__media {
          position: relative;
          min-height: 420px;
        }
        .trip-package-detail-hero__media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .trip-package-detail-hero__veil {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(255,255,255,0.08), rgba(23,56,90,0.08));
        }
        .trip-package-detail-hero__content {
          display: grid;
          align-content: center;
          gap: 18px;
          padding: 36px;
          color: #f8fafc;
          background:
            radial-gradient(circle at top right, rgba(125, 211, 252, 0.12), transparent 34%),
            linear-gradient(180deg, rgba(23,56,90,0.98), rgba(19,49,79,0.96));
        }
        .trip-package-detail-hero__content h1 {
          margin: 0;
          font-size: clamp(2rem, 3vw, 3.2rem);
          line-height: 1.08;
          font-family: "Playfair Display", serif;
        }
        .trip-package-detail-hero__content p {
          margin: 0;
          color: rgba(248, 250, 252, 0.88);
          line-height: 1.7;
        }
        .trip-package-detail-hero__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 16px;
        }
        .trip-package-detail-hero__meta span,
        .trip-package-detail-facts span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-weight: 700;
        }
        .trip-package-detail-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 20px;
          align-items: start;
        }
        .trip-package-detail-main,
        .trip-package-detail-sidebar {
          display: grid;
          gap: 18px;
        }
        .trip-package-detail-panel,
        .trip-package-detail-bookbox {
          display: grid;
          gap: 14px;
          padding: 22px;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(226, 232, 240, 0.92);
          box-shadow: 0 18px 34px rgba(15, 23, 42, 0.05);
        }
        .trip-package-detail-section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .trip-package-detail-panel h2,
        .trip-package-detail-panel h3 {
          margin: 0;
        }
        .trip-package-detail-copy,
        .trip-package-detail-empty,
        .trip-package-detail-faq p {
          margin: 0;
          color: #475569;
          line-height: 1.7;
        }
        .trip-package-detail-facts,
        .trip-package-detail-chips,
        .trip-package-detail-day__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 14px;
        }
        .trip-package-detail-chip {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 0.82rem;
          font-weight: 700;
        }
        .trip-package-detail-chip--soft {
          background: #fff7ed;
          color: #c2410c;
        }
        .trip-package-detail-columns {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
        .trip-package-detail-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }
        .trip-package-detail-list li {
          display: flex;
          gap: 8px;
          color: #334155;
          line-height: 1.55;
        }
        .trip-package-detail-list--ok svg { color: #059669; }
        .trip-package-detail-list--warn svg { color: #dc2626; }
        .trip-package-detail-itinerary,
        .trip-package-detail-faqs {
          display: grid;
          gap: 12px;
        }
        .trip-package-detail-day {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 14px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(248, 250, 252, 0.8);
          border: 1px solid rgba(226, 232, 240, 0.86);
        }
        .trip-package-detail-day__badge {
          padding: 10px 12px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid #e2e8f0;
          font-weight: 700;
          color: #e25a4f;
          height: fit-content;
        }
        .trip-package-detail-day__content {
          display: grid;
          gap: 10px;
        }
        .trip-package-detail-day__content p {
          margin: 0;
          color: #475569;
          line-height: 1.6;
        }
        .trip-package-detail-activity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }
        .trip-package-detail-activity {
          display: grid;
          gap: 10px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255, 248, 244, 0.72);
          border: 1px solid rgba(255, 228, 220, 0.9);
        }
        .trip-package-detail-activity__head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: start;
        }
        .trip-package-detail-activity__head span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #b45309;
          font-weight: 700;
          font-size: 0.84rem;
        }
        .trip-package-detail-activity p {
          margin: 0;
          color: #475569;
        }
        .trip-package-detail-activity__meta {
          display: grid;
          gap: 6px;
          color: #334155;
          font-size: 0.86rem;
        }
        .trip-package-detail-bookbox__label {
          margin: 0;
          color: #64748b;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-weight: 800;
        }
        .trip-package-detail-bookbox strong {
          font-size: 1.6rem;
        }
        .trip-package-detail-bookbox small {
          color: #64748b;
        }
        .trip-package-detail-addon-list {
          display: grid;
          gap: 8px;
        }
        .trip-package-detail-addon {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: rgba(255, 255, 255, 0.88);
          font-size: 0.9rem;
          cursor: pointer;
        }
        .trip-package-detail-addon.is-selected {
          border-color: rgba(255, 111, 97, 0.4);
          background: #fff1ef;
        }
        .trip-package-detail-addon input {
          accent-color: #ff6f61;
        }
        .trip-package-detail-input {
          display: grid;
          gap: 6px;
          color: #475569;
          font-size: 0.9rem;
        }
        .trip-package-detail-input input {
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 10px 12px;
        }
        .trip-package-detail-total {
          display: grid;
          gap: 8px;
        }
        .trip-package-detail-total p {
          margin: 0;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          color: #475569;
        }
        .trip-package-detail-total h3 {
          margin: 4px 0 0;
        }
        .trip-package-detail-bookbtn {
          border: none;
          border-radius: 999px;
          padding: 14px 20px;
          background: linear-gradient(135deg, #ff7d57, #ff5f57);
          color: #fff;
          font-weight: 800;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 18px 28px rgba(255, 111, 97, 0.24);
        }
        .trip-package-detail-bookbtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .trip-package-detail-faq {
          padding: 14px;
          border-radius: 16px;
          background: rgba(248, 250, 252, 0.78);
          border: 1px solid rgba(226, 232, 240, 0.86);
        }
        .trip-package-detail-faq h3 {
          margin: 0 0 6px;
        }
        .trip-package-detail-error {
          color: #b91c1c;
          margin: 0;
        }
        @media (max-width: 960px) {
          .trip-package-detail-hero,
          .trip-package-detail-layout,
          .trip-package-detail-columns {
            grid-template-columns: 1fr;
          }
          .trip-package-detail-hero__media {
            min-height: 280px;
          }
        }
        @media (max-width: 640px) {
          .trip-package-detail-page {
            padding-left: 14px;
            padding-right: 14px;
          }
          .trip-package-detail-hero__content,
          .trip-package-detail-panel,
          .trip-package-detail-bookbox {
            padding: 16px;
          }
          .trip-package-detail-day {
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
