import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../utils/api";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

          .plan-form__row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
