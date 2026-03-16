import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { resolveImageUrl } from "../utils/api";

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const dayAfter = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
};

const emptyForm = {
  title: "",
  startDate: "",
  endDate: "",
  price: "",
  summary: "",
};

export default function PlanTrip() {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get("locationId");

  const [form, setForm] = useState(emptyForm);
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listings, setListings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bookingForm, setBookingForm] = useState({
    checkIn: tomorrow(),
    checkOut: dayAfter(),
    guests: 1,
  });
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const eligibleTypes = useMemo(
    () => new Set(["activity", "hotel", "restaurant", "cafe"]),
    []
  );

  const eligibleListings = useMemo(
    () => listings.filter((item) => eligibleTypes.has(item.type)),
    [listings, eligibleTypes]
  );

  useEffect(() => {
    let active = true;
    if (!locationId) return undefined;

    const loadLocation = async () => {
      try {
        setLoadingLocation(true);
        const { data } = await api.get(`/api/locations/${locationId}`);
        if (!active) return;
        setLocation(data);
        setForm((prev) => ({
          ...prev,
          title: prev.title || `Trip to ${data.name || "Destination"}`,
        }));
      } catch (_err) {
        if (!active) return;
        setLocation(null);
      } finally {
        if (active) setLoadingLocation(false);
      }
    };

    loadLocation();
    return () => {
      active = false;
    };
  }, [locationId]);

  useEffect(() => {
    let active = true;
    const fetchListings = async () => {
      if (!location) return;
      try {
        setLoadingListings(true);
        const searchCity = location.district || location.name || "";
        const { data } = await api.get(`/api/listings?city=${encodeURIComponent(searchCity)}`);
        if (!active) return;
        const next = Array.isArray(data?.listings) ? data.listings : [];
        setListings(next);
      } catch (_err) {
        if (!active) return;
        setListings([]);
      } finally {
        if (active) setLoadingListings(false);
      }
    };
    fetchListings();
    return () => {
      active = false;
    };
  }, [location]);

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingError("");
    setBookingForm((prev) => ({
      ...prev,
      [name]: name === "guests" ? Number(value) : value,
    }));
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const onBookSelected = async () => {
    setBookingMessage("");
    setBookingError("");

    if (!selectedIds.length) {
      setBookingError("Select at least one activity, hotel, restaurant, or cafe.");
      return;
    }

    if (!bookingForm.checkIn || !bookingForm.checkOut) {
      setBookingError("Select check-in and check-out dates.");
      return;
    }

    if (bookingForm.checkOut < bookingForm.checkIn) {
      setBookingError("Check-out cannot be before check-in.");
      return;
    }

    try {
      setBookingSaving(true);
      const payloadBase = {
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut,
        guests: bookingForm.guests || 1,
      };
      const results = await Promise.allSettled(
        selectedIds.map((listingId) =>
          api.post("/api/bookings", {
            listingId,
            ...payloadBase,
          })
        )
      );
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - successCount;
      if (successCount) {
        setBookingMessage(
          `Booked ${successCount} item${successCount === 1 ? "" : "s"}. You can pay later from the Bookings page.`
        );
        setSelectedIds([]);
      }
      if (failCount) {
        setBookingError(
          `${failCount} booking${failCount === 1 ? "" : "s"} failed. Try again or reduce your selection.`
        );
      }
    } catch (_err) {
      setBookingError("Failed to complete bookings. Please try again.");
    } finally {
      setBookingSaving(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!form.title.trim() || !form.startDate || !form.endDate) {
      setError("Trip title, start date, and end date are required.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError("End date cannot be before start date.");
      return;
    }

    const summaryParts = [form.summary.trim()].filter(Boolean);
    if (location) {
      summaryParts.unshift(
        `Planned for ${location.name}${location.district ? `, ${location.district}` : ""}${location.province ? `, ${location.province}` : ""}.`
      );
    }

    const payload = {
      title: form.title.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      price: form.price ? Number(form.price) : 0,
      summary: summaryParts.join(" "),
    };

    try {
      setSaving(true);
      await api.post("/api/user/trips", payload);
      setMessage("Trip planned successfully. You can view it in My Trips.");
      setForm((prev) => ({ ...emptyForm, title: location ? `Trip to ${location.name}` : "" }));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save trip plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="plan-page">
      <header className="plan-page__hero">
        <div>
          <p className="plan-page__kicker">Plan Trip</p>
          <h1>Create your itinerary plan</h1>
          <p>Choose travel dates, budget, and notes. Save now, update later.</p>
        </div>
        <div className="plan-page__hero-links">
          <Link to="/explore">Explore Locations</Link>
          <Link to="/my-trips">My Trips</Link>
        </div>
      </header>

      {loadingLocation && <p className="plan-page__hint">Loading selected location...</p>}
      {location && (
        <div className="plan-page__location">
          <strong>{location.name}</strong>
          <span>{[location.district, location.province, location.category].filter(Boolean).join(" - ")}</span>
        </div>
      )}

      <section className="plan-book">
        <div className="plan-book__head">
          <div>
            <h2>Plan & book your activities</h2>
            <p>Select multiple activities, hotels, cafes, and restaurants — then book them all at once.</p>
          </div>
          <Link to="/bookings" className="plan-book__link">Go to Bookings</Link>
        </div>

        <div className="plan-book__form">
          <input
            className="plan-input"
            type="date"
            name="checkIn"
            min={minDate}
            value={bookingForm.checkIn}
            onChange={onBookingChange}
          />
          <input
            className="plan-input"
            type="date"
            name="checkOut"
            min={bookingForm.checkIn || minDate}
            value={bookingForm.checkOut}
            onChange={onBookingChange}
          />
          <input
            className="plan-input"
            type="number"
            min="1"
            name="guests"
            value={bookingForm.guests}
            onChange={onBookingChange}
            placeholder="Guests"
          />
          <button
            type="button"
            className="plan-book__cta"
            onClick={onBookSelected}
            disabled={bookingSaving}
          >
            {bookingSaving ? "Booking..." : "Book selected"}
          </button>
        </div>

        {bookingError && <p className="plan-book__error">{bookingError}</p>}
        {bookingMessage && <p className="plan-book__success">{bookingMessage}</p>}

        {loadingListings && <p className="plan-book__hint">Loading listings for this destination...</p>}
        {!loadingListings && !eligibleListings.length && (
          <p className="plan-book__hint">No bookable listings found for this destination yet.</p>
        )}

        <div className="plan-book__grid">
          {eligibleListings.map((listing) => (
            <article key={listing._id} className={`plan-card ${selectedIds.includes(listing._id) ? "plan-card--selected" : ""}`}>
              <label className="plan-card__check">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(listing._id)}
                  onChange={() => toggleSelect(listing._id)}
                />
                <span>Select</span>
              </label>
              <div className="plan-card__media">
                <img
                  src={
                    resolveImageUrl(listing.photos?.[0]) ||
                    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop"
                  }
                  alt={listing.title}
                />
              </div>
              <div className="plan-card__body">
                <div className="plan-card__head">
                  <h3>{listing.title}</h3>
                  <span>{listing.type}</span>
                </div>
                <p>NPR {listing.pricePerUnit} / {listing.type === "hotel" ? "night" : "booking"}</p>
                <Link to={`/places/${listing._id}`} className="plan-card__link">View details</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <form className="plan-form" onSubmit={onSubmit}>
        <div className="plan-form__row">
          <label>
            Trip title *
            <input
              name="title"
              value={form.title}
              onChange={onChange}
              placeholder="Trip to Pokhara"
              required
            />
          </label>
          <label>
            Estimated total budget
            <input
              type="number"
              min="0"
              name="price"
              value={form.price}
              onChange={onChange}
              placeholder="5000"
            />
          </label>
        </div>

        <div className="plan-form__row">
          <label>
            Start date *
            <input type="date" name="startDate" min={minDate} value={form.startDate} onChange={onChange} required />
          </label>
          <label>
            End date *
            <input type="date" name="endDate" min={form.startDate || minDate} value={form.endDate} onChange={onChange} required />
          </label>
        </div>

        <label>
          Trip notes
          <textarea
            name="summary"
            rows={5}
            value={form.summary}
            onChange={onChange}
            placeholder="Add activities, transport notes, and priorities."
          />
        </label>

        {error && <p className="plan-form__error">{error}</p>}
        {message && <p className="plan-form__success">{message}</p>}

        <div className="plan-form__actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Trip Plan"}
          </button>
          <Link to="/my-trips" className="plan-form__secondary">Go to My Trips</Link>
        </div>
      </form>

      <style>{`
        .plan-page {
          max-width: 920px;
          margin: 0 auto;
          padding: 28px 20px 60px;
          font-family: "Plus Jakarta Sans", "Sora", "DM Sans", system-ui, sans-serif;
          color: #0f172a;
        }

        .plan-page__hero {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.16), rgba(16, 185, 129, 0.12));
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 24px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
          margin-bottom: 18px;
        }

        .plan-page__kicker {
          margin: 0 0 6px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.72rem;
          color: #0f766e;
          font-weight: 600;
        }

        .plan-page__hero h1 {
          margin: 0 0 6px;
          font-size: clamp(1.8rem, 3vw, 2.4rem);
        }

        .plan-page__hero p {
          margin: 0;
          color: #475569;
        }

        .plan-page__hero-links {
          display: grid;
          gap: 8px;
          text-align: right;
        }

        .plan-page__hero-links a {
          text-decoration: none;
          color: #0f766e;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .plan-page__hint {
          margin: 0 0 10px;
          color: #475569;
          font-size: 0.9rem;
        }

        .plan-page__location {
          background: #fff;
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 14px;
          padding: 10px 12px;
          display: grid;
          gap: 2px;
          margin-bottom: 12px;
        }

        .plan-page__location span {
          color: #64748b;
          font-size: 0.86rem;
        }

        .plan-book {
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 24px;
          padding: 20px;
          margin-bottom: 18px;
          display: grid;
          gap: 16px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.2);
        }

        .plan-book__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .plan-book__head h2 {
          margin: 0 0 6px;
          font-size: clamp(1.3rem, 2.6vw, 1.9rem);
        }

        .plan-book__head p {
          margin: 0;
          color: rgba(226, 232, 240, 0.8);
        }

        .plan-book__link {
          color: #38bdf8;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .plan-book__form {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .plan-input {
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          padding: 10px 12px;
          background: rgba(15, 23, 42, 0.4);
          color: #e2e8f0;
        }

        .plan-input::placeholder {
          color: rgba(226, 232, 240, 0.6);
        }

        .plan-book__cta {
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #38bdf8, #14b8a6);
          color: #0f172a;
          font-weight: 700;
          cursor: pointer;
          padding: 10px 12px;
        }

        .plan-book__cta[disabled] {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .plan-book__hint {
          margin: 0;
          color: rgba(226, 232, 240, 0.7);
          font-size: 0.9rem;
        }

        .plan-book__error {
          margin: 0;
          color: #fecaca;
          font-size: 0.9rem;
        }

        .plan-book__success {
          margin: 0;
          color: #a7f3d0;
          font-size: 0.9rem;
        }

        .plan-book__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .plan-card {
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 18px;
          overflow: hidden;
          display: grid;
          gap: 8px;
          padding-bottom: 10px;
        }

        .plan-card--selected {
          border-color: rgba(56, 189, 248, 0.8);
          box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25);
        }

        .plan-card__check {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px 0;
          font-size: 0.85rem;
          color: rgba(226, 232, 240, 0.8);
        }

        .plan-card__media img {
          width: 100%;
          height: 140px;
          object-fit: cover;
          display: block;
        }

        .plan-card__body {
          padding: 0 12px 10px;
          display: grid;
          gap: 6px;
        }

        .plan-card__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
        }

        .plan-card__head h3 {
          margin: 0;
          font-size: 1rem;
        }

        .plan-card__head span {
          text-transform: capitalize;
          font-size: 0.75rem;
          color: rgba(226, 232, 240, 0.7);
        }

        .plan-card__link {
          color: #38bdf8;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .plan-form {
          background: #fff;
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 24px;
          padding: 20px;
          display: grid;
          gap: 14px;
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
        }

        .plan-form__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .plan-form label {
          display: grid;
          gap: 6px;
          font-size: 0.88rem;
          color: #334155;
        }

        .plan-form input,
        .plan-form textarea {
          border: 1px solid rgba(148, 163, 184, 0.45);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 0.92rem;
          background: #f8fafc;
        }

        .plan-form textarea {
          resize: vertical;
        }

        .plan-form__error {
          margin: 0;
          color: #b91c1c;
          font-size: 0.88rem;
        }

        .plan-form__success {
          margin: 0;
          color: #047857;
          font-size: 0.88rem;
        }

        .plan-form__actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .plan-form button {
          border: none;
          border-radius: 999px;
          padding: 10px 16px;
          background: linear-gradient(135deg, #0284c7, #0f766e);
          color: #fff;
          font-weight: 600;
          cursor: pointer;
        }

        .plan-form button[disabled] {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .plan-form__secondary {
          text-decoration: none;
          border: 1px solid rgba(15, 118, 110, 0.3);
          color: #0f766e;
          padding: 9px 13px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.88rem;
        }

        @media (max-width: 720px) {
          .plan-page__hero {
            flex-direction: column;
            align-items: flex-start;
          }

          .plan-page__hero-links {
            text-align: left;
          }

          .plan-book__head {
            flex-direction: column;
            align-items: flex-start;
          }

          .plan-book__form {
            grid-template-columns: 1fr;
          }

          .plan-form__row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
