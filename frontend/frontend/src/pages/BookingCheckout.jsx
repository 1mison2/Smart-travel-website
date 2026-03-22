import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";

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

export default function BookingCheckout() {
  const { listingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialQuery = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [listing, setListing] = useState(null);
  const [form, setForm] = useState({
    checkIn: initialQuery.get("checkIn") || tomorrow(),
    checkOut: initialQuery.get("checkOut") || dayAfter(),
    guests: Number(initialQuery.get("guests") || 1),
    notes: "",
  });
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setLoading(true);
        const [listingRes, quoteRes] = await Promise.all([
          api.get(`/api/listings/${listingId}`),
          api.post("/api/bookings/quote", {
            listingId,
            checkIn: form.checkIn,
            checkOut: form.checkOut,
            guests: form.guests,
          }),
        ]);
        if (!active) return;
        setListing(listingRes.data?.listing || null);
        setQuote(quoteRes.data?.quote || null);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load booking checkout");
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [listingId]);

  const refreshQuote = async (nextForm) => {
    try {
      const { data } = await api.post("/api/bookings/quote", {
        listingId,
        checkIn: nextForm.checkIn,
        checkOut: nextForm.checkOut,
        guests: Number(nextForm.guests),
      });
      setQuote(data?.quote || null);
      setError("");
    } catch (err) {
      setQuote(null);
      setError(err?.response?.data?.message || "Unable to refresh quote");
    }
  };

  const onChange = async (e) => {
    const { name, value } = e.target;
    const next = { ...form, [name]: name === "guests" ? Number(value) : value };
    setForm(next);
    if (["checkIn", "checkOut", "guests"].includes(name)) {
      await refreshQuote(next);
    }
  };

  const onCreateBooking = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");
      const { data } = await api.post("/api/bookings", {
        listingId,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: Number(form.guests),
        notes: form.notes,
      });
      const bookingId = data?.booking?._id;
      setSuccessMessage("Booking created. Redirecting to payment...");
      setTimeout(() => {
        if (bookingId) navigate(`/payment?bookingId=${bookingId}`);
        else navigate("/bookings");
      }, 600);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="travel-shell"><div className="travel-container">Loading checkout...</div></div>;
  if (error && !listing) return <div className="travel-shell"><div className="travel-container"><p className="travel-alert travel-alert-error">{error}</p></div></div>;

  const pricing = quote?.pricing;
  const isSessionBooking = ["activity", "cafe", "restaurant"].includes(listing?.type);

  return (
    <div className="travel-shell">
      <div className="travel-container travel-grid-2">
        <section className="travel-card" style={{ padding: "20px" }}>
          <p className="travel-kicker">Booking Checkout</p>
          <h1 className="travel-title" style={{ fontSize: "2rem", marginTop: "8px" }}>Complete your booking</h1>
          <p className="mt-1 text-sm text-slate-600">Selected: {listing?.title}</p>

          <form onSubmit={onCreateBooking} className="mt-5 grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                {isSessionBooking ? "Reservation date" : "Check-in"}
                <input
                  type="date"
                  name="checkIn"
                  min={minDate}
                  value={form.checkIn}
                  onChange={onChange}
                  className="travel-input"
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                {isSessionBooking ? "End date (optional same day)" : "Check-out"}
                <input
                  type="date"
                  name="checkOut"
                  min={form.checkIn || minDate}
                  value={form.checkOut}
                  onChange={onChange}
                  className="travel-input"
                  required
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm">
              Guests
              <input
                type="number"
                name="guests"
                min="1"
                max={listing?.capacity || 10}
                value={form.guests}
                onChange={onChange}
                className="travel-input"
              />
            </label>

            <label className="grid gap-1 text-sm">
              Special request
              <textarea
                name="notes"
                rows={4}
                value={form.notes}
                onChange={onChange}
                className="travel-textarea"
                placeholder="Airport pickup, room preference, etc."
              />
            </label>

            {error && <p className="travel-alert travel-alert-error">{error}</p>}
            {successMessage && <p className="travel-alert travel-alert-success">{successMessage}</p>}

            <button
              type="submit"
              disabled={submitting || !pricing}
              className="travel-btn travel-btn-primary"
            >
              {submitting ? "Creating booking..." : "Create booking"}
            </button>
          </form>
        </section>

        <aside className="travel-summary">
          <h2 className="text-lg font-semibold">Price summary</h2>
          {pricing ? (
            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between">
                <span>{isSessionBooking ? "Session price" : "Unit price"}</span>
                <span>NPR {pricing.unitPrice}</span>
              </div>
              <div className="flex justify-between">
                <span>Nights</span>
                <span>{pricing.nights}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>NPR {pricing.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Service fee</span>
                <span>NPR {pricing.serviceFee}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (13%)</span>
                <span>NPR {pricing.tax}</span>
              </div>
              <div className="my-1 border-t border-slate-200" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>NPR {pricing.total}</span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">Quote unavailable</p>
          )}

          <div className="mt-5">
            <Link to={`/places/${listingId}`} className="text-sm font-semibold text-teal-700 hover:underline">
              View place details
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
