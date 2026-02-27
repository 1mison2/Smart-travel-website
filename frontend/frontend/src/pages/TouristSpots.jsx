import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  name: "",
  location: "",
  description: "",
  category: "",
  estimatedCost: "",
  estimatedTime: "",
  imageUrl: "",
};

export default function TouristSpots() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [spots, setSpots] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSpots = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/tourist-spots");
      setSpots(data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load tourist spots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpots();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!isAdmin) {
      setError("Only admins can create tourist spots.");
      return;
    }

    if (!form.name || !form.location || !form.category) {
      setError("Name, location, and category are required.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim(),
      estimatedCost: form.estimatedCost === "" ? undefined : Number(form.estimatedCost),
      estimatedTime: form.estimatedTime === "" ? undefined : Number(form.estimatedTime),
      imageUrl: form.imageUrl.trim() || undefined,
    };

    try {
      setSubmitting(true);
      const { data } = await api.post("/api/tourist-spots", payload);
      setSpots((prev) => [data, ...prev]);
      setForm(emptyForm);
      setMessage("Tourist spot created.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create tourist spot");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tourist-spots">
      <header className="tourist-spots__hero">
        <div className="tourist-spots__hero-content">
          <p className="tourist-spots__kicker">Smart Travel</p>
          <h1>Tourist Spots</h1>
          <p className="tourist-spots__subtitle">Add and explore destinations curated by the community.</p>
          <div className="tourist-spots__stats">
            <div>
              <span className="tourist-spots__stat-label">Total spots</span>
              <strong className="tourist-spots__stat-value">{spots.length}</strong>
            </div>
            <div>
              <span className="tourist-spots__stat-label">Status</span>
              <strong className="tourist-spots__stat-value">{loading ? "Loading" : "Live"}</strong>
            </div>
          </div>
        </div>
        <div className="tourist-spots__user">
          <span>Signed in as</span>
          <strong>{user?.name || user?.email || "Traveler"}</strong>
        </div>
      </header>

      <section className="tourist-spots__grid">
        {isAdmin ? (
          <form className="spot-form" onSubmit={onSubmit}>
            <h2>Add new spot</h2>
            <div className="spot-form__row">
              <label>
                Name *
                <input name="name" value={form.name} onChange={onChange} placeholder="Phewa Lake" />
              </label>
              <label>
                Location *
                <input name="location" value={form.location} onChange={onChange} placeholder="Pokhara" />
              </label>
            </div>
            <div className="spot-form__row">
              <label>
                Category *
                <input name="category" value={form.category} onChange={onChange} placeholder="Nature" />
              </label>
              <label>
                Image URL
                <input name="imageUrl" value={form.imageUrl} onChange={onChange} placeholder="https://..." />
              </label>
            </div>
            <label>
              Description
              <textarea name="description" value={form.description} onChange={onChange} rows={3} />
            </label>
            <div className="spot-form__row">
              <label>
                Estimated Cost
                <input
                  type="number"
                  min="0"
                  name="estimatedCost"
                  value={form.estimatedCost}
                  onChange={onChange}
                  placeholder="0"
                />
              </label>
              <label>
                Estimated Time (hours)
                <input
                  type="number"
                  min="0"
                  name="estimatedTime"
                  value={form.estimatedTime}
                  onChange={onChange}
                  placeholder="2"
                />
              </label>
            </div>
            {error && <p className="spot-form__error">{error}</p>}
            {message && <p className="spot-form__success">{message}</p>}
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create spot"}
            </button>
          </form>
        ) : (
          <section className="spot-form spot-form--readonly" aria-live="polite">
            <h2>Spot creation restricted</h2>
            <p>Only admin accounts can add new tourist spots.</p>
          </section>
        )}

        <section className="spot-list">
          <div className="spot-list__header">
            <div>
              <h2>All spots</h2>
              <p className="spot-list__meta">{spots.length} destination(s)</p>
            </div>
            <button type="button" onClick={loadSpots} disabled={loading}>
              Refresh
            </button>
          </div>

          {loading ? (
            <p>Loading spots...</p>
          ) : (
            <div className="spot-list__grid">
              {spots.length === 0 && (
                <div className="spot-empty">
                  <h3>No tourist spots yet</h3>
                  <p>Be the first to add a must-see place for fellow travelers.</p>
                </div>
              )}
              {spots.map((spot) => (
                <article key={spot._id} className="spot-card">
                  <div className="spot-card__image">
                    {spot.imageUrl ? (
                      <img src={spot.imageUrl} alt={spot.name} />
                    ) : (
                      <div className="spot-card__placeholder">
                        <span>{spot.name?.slice(0, 1) || "S"}</span>
                      </div>
                    )}
                  </div>
                  <div className="spot-card__content">
                    <div>
                      <h3>{spot.name}</h3>
                      <p className="spot-card__meta">
                        {spot.location} - {spot.category}
                      </p>
                    </div>
                    {spot.description && <p className="spot-card__desc">{spot.description}</p>}
                    <div className="spot-card__footer">
                      <span className="spot-card__pill">Cost: {spot.estimatedCost || 0}</span>
                      <span className="spot-card__pill">Time: {spot.estimatedTime || 0}h</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <style>{`
        :root {
          --ocean: #0f766e;
          --sky: #60a5fa;
          --ink: #0f172a;
          --muted: #64748b;
          --card: #ffffff;
          --line: rgba(148, 163, 184, 0.25);
          --shadow: 0 25px 60px rgba(15, 23, 42, 0.08);
        }

        .tourist-spots {
          padding: 40px 20px 70px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: "Plus Jakarta Sans", "Sora", "DM Sans", system-ui, sans-serif;
          color: var(--ink);
          position: relative;
        }

        .tourist-spots::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 10% 0%, rgba(96, 165, 250, 0.18), transparent 50%),
            radial-gradient(circle at 100% 10%, rgba(16, 185, 129, 0.18), transparent 45%);
          pointer-events: none;
          z-index: -1;
        }

        .tourist-spots__hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 28px;
          background: linear-gradient(135deg, rgba(96, 165, 250, 0.18), rgba(16, 185, 129, 0.12));
          border-radius: 24px;
          padding: 26px 28px;
          border: 1px solid var(--line);
          box-shadow: var(--shadow);
        }

        .tourist-spots__hero-content {
          max-width: 520px;
        }

        .tourist-spots__kicker {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.72rem;
          color: var(--ocean);
          font-weight: 600;
          margin: 0 0 8px;
        }

        .tourist-spots h1 {
          margin: 0 0 6px;
          font-size: clamp(2.2rem, 3.2vw, 3rem);
        }

        .tourist-spots__subtitle {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 1rem;
        }

        .tourist-spots__user {
          background: rgba(255, 255, 255, 0.85);
          padding: 14px 18px;
          border-radius: 16px;
          border: 1px solid var(--line);
          font-size: 0.85rem;
          display: grid;
          gap: 4px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        }

        .tourist-spots__stats {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .tourist-spots__stat-label {
          display: block;
          color: var(--muted);
          font-size: 0.78rem;
          margin-bottom: 4px;
        }

        .tourist-spots__stat-value {
          font-size: 1.1rem;
        }

        .tourist-spots__grid {
          display: grid;
          grid-template-columns: minmax(300px, 380px) 1fr;
          gap: 28px;
        }

        .spot-form {
          background: var(--card);
          border-radius: 22px;
          padding: 22px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: var(--shadow);
          display: grid;
          gap: 14px;
          position: sticky;
          top: 24px;
          align-self: start;
        }

        .spot-form h2 {
          margin: 0;
          font-size: 1.35rem;
        }

        .spot-form__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .spot-form label {
          display: grid;
          gap: 6px;
          font-size: 0.85rem;
          color: #334155;
        }

        .spot-form input,
        .spot-form textarea {
          border: 1px solid rgba(148, 163, 184, 0.4);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 0.9rem;
          background: #f8fafc;
        }

        .spot-form input:focus,
        .spot-form textarea:focus {
          outline: 2px solid rgba(96, 165, 250, 0.35);
          border-color: rgba(96, 165, 250, 0.6);
          background: #ffffff;
        }

        .spot-form button {
          border: none;
          padding: 12px 16px;
          border-radius: 999px;
          background: linear-gradient(135deg, #60a5fa, #0f766e);
          color: white;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 16px 30px rgba(15, 118, 110, 0.2);
        }

        .spot-form button[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spot-form__error {
          color: #b91c1c;
          font-size: 0.85rem;
        }

        .spot-form__success {
          color: #047857;
          font-size: 0.85rem;
        }

        .spot-list {
          display: grid;
          gap: 16px;
        }

        .spot-list__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .spot-list__meta {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 0.85rem;
        }

        .spot-list__header button {
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.9);
          padding: 8px 12px;
          border-radius: 999px;
          cursor: pointer;
          font-weight: 600;
        }

        .spot-list__grid {
          display: grid;
          gap: 16px;
        }

        .spot-card {
          display: grid;
          grid-template-columns: 190px 1fr;
          gap: 16px;
          background: var(--card);
          border-radius: 20px;
          border: 1px solid rgba(226, 232, 240, 0.85);
          overflow: hidden;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
          animation: fadeUp 0.4s ease;
        }

        .spot-card__image {
          min-height: 140px;
          background: linear-gradient(135deg, rgba(96, 165, 250, 0.25), rgba(16, 185, 129, 0.2));
          display: grid;
        }

        .spot-card__image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .spot-card__placeholder {
          display: grid;
          place-items: center;
          font-size: 2rem;
          font-weight: 700;
          color: #0f766e;
          background: rgba(255, 255, 255, 0.6);
        }

        .spot-card__content {
          padding: 16px 18px;
          display: grid;
          gap: 8px;
        }

        .spot-card__meta {
          margin: 4px 0 0;
          color: #6b7280;
          font-size: 0.85rem;
        }

        .spot-card__desc {
          margin: 0;
          color: #334155;
        }

        .spot-card__footer {
          display: flex;
          gap: 16px;
          font-size: 0.85rem;
          color: #475569;
          flex-wrap: wrap;
        }

        .spot-card__pill {
          background: rgba(15, 118, 110, 0.1);
          color: #0f766e;
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 600;
        }

        .spot-empty {
          background: var(--card);
          border: 1px dashed rgba(148, 163, 184, 0.5);
          border-radius: 20px;
          padding: 32px;
          text-align: center;
          color: var(--muted);
        }

        .spot-empty h3 {
          margin: 0 0 6px;
          color: #0f172a;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 900px) {
          .tourist-spots__grid {
            grid-template-columns: 1fr;
          }

          .spot-form__row {
            grid-template-columns: 1fr;
          }

          .spot-card {
            grid-template-columns: 1fr;
          }

          .spot-card__image {
            height: 180px;
          }

          .tourist-spots__hero {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
