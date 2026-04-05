import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DestinationReviewPanel from "../components/DestinationReviewPanel";
import api, { resolveImageUrl } from "../utils/api";

export default function PlaceDetails() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gallery, setGallery] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState("");
  const [previewImage, setPreviewImage] = useState("");

  const normalizeGallery = (photos) => {
    const items = (Array.isArray(photos) ? photos : [])
      .map((item) => resolveImageUrl(item))
      .filter(Boolean);
    return Array.from(new Set(items));
  };

  useEffect(() => {
    if (!previewImage) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setPreviewImage("");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewImage]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/listings/${id}`);
        if (!active) return;
        const nextListing = data?.listing || null;
        setListing(nextListing);
        const nextGallery = normalizeGallery(nextListing?.photos);
        setGallery(nextGallery);
        setSelectedPhoto(nextGallery[0] || "");
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load place details");
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div className="travel-shell"><div className="travel-container">Loading place details...</div></div>;
  if (error || !listing) return <div className="travel-shell"><div className="travel-container"><p className="travel-alert travel-alert-error">{error || "Place not found"}</p></div></div>;

  const reviews = Array.isArray(listing.reviews) ? listing.reviews : [];
  const amenities = Array.isArray(listing.amenities) ? listing.amenities.filter(Boolean) : [];
  const coverPhoto =
    gallery[0] || "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1400&auto=format&fit=crop";

  return (
    <div className="travel-shell">
      <div className="travel-container place-page">
        <div className="place-page__topbar">
          <Link to="/destination-search" className="hub-link">
            Back to search
          </Link>
          <span className="place-chip">{listing.type}</span>
        </div>

        <header className="place-hero">
          <img src={coverPhoto} alt={listing.title} />
          <div className="place-hero__overlay">
            <h1>{listing.title}</h1>
            <p>{[listing.location?.name, listing.location?.district, listing.location?.province].filter(Boolean).join(", ")}</p>
          </div>
        </header>

        <section className="place-layout">
          <article className="travel-card place-main">
            <h2>About this place</h2>
            <p className="hub-copy">{listing.description || "No description provided yet."}</p>

            <div className="place-stats">
              <InfoStat label="Price" value={`NPR ${listing.pricePerUnit} ${listing.type === "hotel" ? "/ night" : "/ booking"}`} />
              <InfoStat label="Rating" value={`${Number(listing.rating || 0).toFixed(1)} / 5`} />
              <InfoStat label="Capacity" value={`${listing.capacity || 1} guests`} />
              <InfoStat label="Category" value={capitalize(listing.type || "-")} />
            </div>

            <div className="place-actions">
              <Link to={`/book/${listing._id}`} className="travel-btn travel-btn-primary">
                Choose this and continue
              </Link>
              <Link
                to={`/map-explorer?lat=${listing.location?.lat || ""}&lng=${listing.location?.lng || ""}&type=tourist_attraction`}
                className="travel-btn travel-btn-soft"
              >
                Explore nearby
              </Link>
            </div>

            {!!amenities.length && (
              <div className="place-amenities">
                <h3>Amenities</h3>
                <div className="hub-pills">
                  {amenities.slice(0, 10).map((item) => (
                    <span key={item} className="hub-pill">{item}</span>
                  ))}
                </div>
              </div>
            )}
          </article>

          <aside className="travel-summary place-side">
            <h2>Quick details</h2>
            <p className="hub-copy">
              {listing.location?.address || "Address not provided"}
            </p>
            <p className="hub-copy">
              Destination: <strong>{listing.location?.name || "-"}</strong>
            </p>
            <p className="hub-copy">
              District/Province: <strong>{[listing.location?.district, listing.location?.province].filter(Boolean).join(", ") || "-"}</strong>
            </p>
          </aside>
        </section>

        {!!gallery.length && (
          <section className="place-gallery">
            <h2>Photos</h2>
            <div className="place-gallery__thumbs">
              {gallery.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  className={`place-thumb ${selectedPhoto === img ? "place-thumb--active" : ""}`}
                  onClick={() => {
                    setSelectedPhoto(img);
                    setPreviewImage(img);
                  }}
                >
                  <img src={img} alt={`${listing.title}-${idx + 1}`} />
                </button>
              ))}
            </div>
          </section>
        )}

        {previewImage && (
          <div
            className="hub-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            onClick={() => setPreviewImage("")}
          >
            <div className="hub-lightbox__inner" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="hub-lightbox__close"
                onClick={() => setPreviewImage("")}
                aria-label="Close image preview"
              >
                x
              </button>
              <img src={previewImage} alt={`${listing.title} preview`} />
            </div>
          </div>
        )}

        <section className="place-reviews">
          <h2>Guest reviews</h2>
          {reviews.length ? (
            <div className="place-reviews__grid">
              {reviews.map((review, index) => (
                <article key={`${review.author}-${index}`} className="travel-card place-review-card">
                  <div className="place-review-card__head">
                    <p>{review.author}</p>
                    <span>{Number(review.rating || 0).toFixed(1)} / 5</span>
                  </div>
                  <p>{review.comment}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="hub-copy">
              No reviews added yet. Add sample reviews from admin panel to make this look more realistic for demo.
            </p>
          )}
        </section>

        <DestinationReviewPanel
          destination={listing.title}
          title={`Reviews for ${listing.title}`}
          subtitle="Share feedback for this specific place right from the details page."
          emptyText={`No community reviews for ${listing.title} yet. Be the first to post one.`}
        />
      </div>
    </div>
  );
}

function InfoStat({ label, value }) {
  return (
    <div className="place-stat">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function capitalize(text) {
  const str = String(text || "");
  if (!str) return "";
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}
