import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { resolveImageUrl } from "../utils/api";

export default function LocationDetails() {
  const { id } = useParams();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/locations/${id}`);
        if (!active) return;
        setLocation(data);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load location details");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <div className="location-page"><p className="location-page__hint">Loading location details...</p></div>;
  }

  if (error || !location) {
    return (
      <div className="location-page">
        <p className="location-page__error">{error || "Location not found"}</p>
        <Link to="/explore" className="location-btn location-btn--ghost">Back to Explore</Link>
        <style>{baseStyles}</style>
      </div>
    );
  }

  return (
    <div className="location-page">
      <article className="location-card">
        <div className="location-card__image">
          {location.image ? (
            <img src={resolveImageUrl(location.image)} alt={location.name} />
          ) : (
            <div className="location-card__placeholder">{location.name?.slice(0, 1) || "L"}</div>
          )}
        </div>
        <div className="location-card__content">
          <p className="location-card__kicker">Destination Details</p>
          <h1>{location.name}</h1>
          <p className="location-card__meta">
            {[location.district, location.province, location.category].filter(Boolean).join(" - ")}
          </p>
          <p className="location-card__description">{location.description}</p>

          <div className="location-card__stats">
            <div>
              <span>Average Cost</span>
              <strong>${location.averageCost || 0}</strong>
            </div>
            <div>
              <span>Latitude</span>
              <strong>{location.latitude}</strong>
            </div>
            <div>
              <span>Longitude</span>
              <strong>{location.longitude}</strong>
            </div>
          </div>

          <div className="location-card__actions">
            <Link to={`/plan-trip?locationId=${location._id}`} className="location-btn location-btn--primary">
              Plan Trip
            </Link>
            <Link to="/explore" className="location-btn location-btn--ghost">
              Explore More Locations
            </Link>
          </div>
        </div>
      </article>
      <style>{baseStyles}</style>
    </div>
  );
}

const baseStyles = `
  .location-page {
    max-width: 1050px;
    margin: 0 auto;
    padding: 28px 20px 60px;
    font-family: "Plus Jakarta Sans", "Sora", "DM Sans", system-ui, sans-serif;
    color: #0f172a;
  }

  .location-page__hint,
  .location-page__error {
    margin: 0 0 14px;
    font-size: 0.95rem;
  }

  .location-page__error {
    color: #b91c1c;
  }

  .location-card {
    background: #fff;
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 16px 34px rgba(15, 23, 42, 0.1);
    display: grid;
    grid-template-columns: minmax(280px, 44%) 1fr;
  }

  .location-card__image {
    min-height: 300px;
    background: #dbeafe;
  }

  .location-card__image img,
  .location-card__placeholder {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .location-card__placeholder {
    display: grid;
    place-items: center;
    font-size: 3rem;
    font-weight: 700;
    color: #1d4ed8;
  }

  .location-card__content {
    padding: 24px;
    display: grid;
    gap: 10px;
  }

  .location-card__kicker {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.75rem;
    color: #0f766e;
    font-weight: 600;
  }

  .location-card__content h1 {
    margin: 0;
    font-size: clamp(1.8rem, 3vw, 2.4rem);
  }

  .location-card__meta {
    margin: 0;
    color: #475569;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .location-card__description {
    margin: 2px 0 0;
    color: #334155;
    line-height: 1.7;
  }

  .location-card__stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .location-card__stats div {
    background: #f8fafc;
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 14px;
    padding: 10px 12px;
    display: grid;
    gap: 2px;
  }

  .location-card__stats span {
    color: #64748b;
    font-size: 0.78rem;
  }

  .location-card__stats strong {
    font-size: 1rem;
  }

  .location-card__actions {
    margin-top: 6px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .location-btn {
    text-decoration: none;
    border-radius: 999px;
    font-size: 0.9rem;
    padding: 10px 14px;
    font-weight: 600;
  }

  .location-btn--primary {
    color: #fff;
    background: linear-gradient(135deg, #0284c7, #0f766e);
  }

  .location-btn--ghost {
    color: #0f766e;
    background: #fff;
    border: 1px solid rgba(15, 118, 110, 0.3);
  }

  @media (max-width: 860px) {
    .location-card {
      grid-template-columns: 1fr;
    }

    .location-card__image {
      height: 250px;
    }

    .location-card__stats {
      grid-template-columns: 1fr;
    }
  }
`;
