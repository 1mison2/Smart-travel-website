import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { resolveImageUrl } from "../utils/api";

export default function LocationDetails() {
  const { id } = useParams();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewImage, setPreviewImage] = useState("");

  const [activities, setActivities] = useState([]);
  const [cafes, setCafes] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [localListings, setLocalListings] = useState([]);

  const stayEatRef = useRef(null);
  const [showAllStayEat, setShowAllStayEat] = useState(false);

  const activityListings = useMemo(
    () => localListings.filter((item) => item.type === "activity"),
    [localListings]
  );
  const stayEatListings = useMemo(
    () => localListings.filter((item) => ["hotel", "cafe", "restaurant"].includes(item.type)),
    [localListings]
  );
  const stayEatVisible = useMemo(
    () => (showAllStayEat ? stayEatListings : stayEatListings.slice(0, 3)),
    [showAllStayEat, stayEatListings]
  );

  const fetchNearbyByType = async (lat, lng, type, limit = 8) => {
    const { data } = await api.get(
      `/api/places/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(
        lng
      )}&type=${encodeURIComponent(type)}&radius=6000&limit=${limit}`
    );
    return Array.isArray(data?.places) ? data.places : [];
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/locations/${id}`);
        if (!active) return;
        const current = data;
        setLocation(current);

        const searchCity = current.district || current.name || "";
        const [allLocationsRes, listingsRes] = await Promise.all([
          api.get("/api/locations"),
          api.get(`/api/listings?city=${encodeURIComponent(searchCity)}`),
        ]);
        if (!active) return;

        const allLocations = Array.isArray(allLocationsRes.data) ? allLocationsRes.data : [];
        const nextRecommendations = allLocations
          .filter((item) => item._id !== current._id)
          .filter((item) =>
            [item.province, item.district]
              .filter(Boolean)
              .some((part) => [current.province, current.district].filter(Boolean).includes(part))
          )
          .slice(0, 6);
        setRecommendations(nextRecommendations);

        const listings = Array.isArray(listingsRes.data?.listings) ? listingsRes.data.listings : [];
        setLocalListings(listings);

        if (current.latitude && current.longitude) {
          const [activityPlaces, cafePlaces, restaurantPlaces, hotelPlaces] = await Promise.all([
            fetchNearbyByType(current.latitude, current.longitude, "tourist_attraction", 9),
            fetchNearbyByType(current.latitude, current.longitude, "cafe", 6),
            fetchNearbyByType(current.latitude, current.longitude, "restaurant", 6),
            fetchNearbyByType(current.latitude, current.longitude, "lodging", 6),
          ]);
          if (!active) return;
          setActivities(activityPlaces);
          setCafes(cafePlaces);
          setRestaurants(restaurantPlaces);
          setHotels(hotelPlaces);
        }
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load destination details");
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [id]);

  const handleToggleStayEat = () => {
    setShowAllStayEat((prev) => {
      const next = !prev;
      if (!prev && stayEatRef.current) {
        stayEatRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return next;
    });
  };

  const imageCandidates = Array.from(new Set([
    location?.image ? resolveImageUrl(location.image) : "",
    ...(Array.isArray(location?.images) ? location.images.map((img) => resolveImageUrl(img)) : []),
    ...activities.map((p) => p.photo).filter(Boolean),
    ...hotels.map((p) => p.photo).filter(Boolean),
    ...restaurants.map((p) => p.photo).filter(Boolean),
  ].filter(Boolean)));

  const heroImage =
    imageCandidates[0] ||
    "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1400&auto=format&fit=crop";

  useEffect(() => {
    if (!previewImage) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setPreviewImage("");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewImage]);

  if (loading)
    return (
      <div className="travel-shell">
        <div className="travel-container">Loading destination details...</div>
      </div>
    );
  if (error || !location)
    return (
      <div className="travel-shell">
        <div className="travel-container">
          <p className="travel-alert travel-alert-error">{error || "Destination not found"}</p>
        </div>
      </div>
    );

  return (
    <div className="travel-shell">
      <div className="travel-container">
        <header className="hub-hero">
          <div className="hub-hero__content">
            <p className="travel-kicker">Destination Hub</p>
            <h1 className="hub-hero__title">{location.name} - Explore, Plan & Book</h1>
            <p className="hub-hero__subtitle">
              Discover top activities, real places to stay and eat, and plan your trip in a dedicated booking flow.
            </p>
            <div className="hub-hero__meta">
              <span>{location.district || "District"}</span>
              <span>{location.province || "Province"}</span>
              <span>{location.category || "Destination"}</span>
            </div>
            <div className="hub-action-row">
              <Link to={`/plan-trip?locationId=${location._id}`} className="travel-btn travel-btn-primary">
                Plan trip
              </Link>
            </div>
            <article className="hub-hero__about">
              <h2 className="hub-section-title">About this destination</h2>
              <p className="hub-copy">{location.description}</p>
              <div className="hub-pills">
                <span className="hub-pill">Avg Local Cost: NPR {location.averageCost || "-"}</span>
                <span className="hub-pill">{location.district || "District"}</span>
                <span className="hub-pill">{location.province || "Province"}</span>
              </div>
            </article>
          </div>
          <div className="hub-hero__image">
            <img src={heroImage} alt={location.name} />
          </div>
        </header>

        <section className="hub-top-grid hub-top-grid--single">
          <article className="travel-card hub-panel">
            <h2 className="hub-section-title">Photo gallery</h2>
            <div className="hub-gallery">
              {imageCandidates.slice(0, 6).map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  className="hub-gallery__item"
                  onClick={() => setPreviewImage(img)}
                >
                  <img src={img} alt={`gallery-${idx}`} />
                </button>
              ))}
              {!imageCandidates.length && <EmptyState text="No extra photos available yet." />}
            </div>
          </article>
        </section>

        <SectionHeader title="What you can do here" subtitle="Activities & Attractions" />
        <p className="hub-helper">Browse activities and attractions available around this destination.</p>
        <div className="hub-card-grid">
          {activityListings.map((listing) => (
            <ListingSelectionCard
              key={listing._id}
              listing={listing}
            />
          ))}
          {activities.slice(0, 9).map((item) => (
            <PlaceCard key={item.placeId} item={item} />
          ))}
          {!activityListings.length && !activities.length && (
            <EmptyState text="No activity suggestions available right now." />
          )}
        </div>

        <SectionHeader title="Stay, Eat & Book" subtitle="Hotels, Cafes & Restaurants" />
        <div className="hub-section-actions" ref={stayEatRef}>
          <p className="hub-helper">Choose your stay or food spot, then plan and book from the Plan Trip page.</p>
          {stayEatListings.length > 3 && (
            <button type="button" className="travel-btn travel-btn-soft" onClick={handleToggleStayEat}>
              {showAllStayEat ? "Show less" : "See all"}
            </button>
          )}
        </div>
        <div className="hub-card-grid">
          {stayEatVisible.map((listing) => (
            <ListingSelectionCard
              key={listing._id}
              listing={listing}
            />
          ))}
          {hotels.slice(0, 2).map((item) => (
            <PlaceCard key={item.placeId} item={item} />
          ))}
          {cafes.slice(0, 2).map((item) => (
            <PlaceCard key={item.placeId} item={item} />
          ))}
          {restaurants.slice(0, 2).map((item) => (
            <PlaceCard key={item.placeId} item={item} />
          ))}
          {!stayEatListings.length && !hotels.length && !cafes.length && !restaurants.length && (
            <EmptyState text="No stays or food suggestions found for this destination yet." />
          )}
        </div>

        <section className="hub-recommend">
          <div className="hub-recommend__head">
            <SectionHeader title="Recommended nearby locations" subtitle="Continue exploring around this region" compact />
            <Link to="/destination-search" className="hub-link">
              Search more destinations
            </Link>
          </div>
          <div className="hub-card-grid">
            {recommendations.map((item) => (
              <article key={item._id} className="travel-card hub-panel">
                <h3>{item.name}</h3>
                <p className="hub-copy">{[item.district, item.province, item.category].filter(Boolean).join(" - ")}</p>
                <Link to={`/locations/${item._id}`} className="hub-link">
                  Open destination
                </Link>
              </article>
            ))}
            {!recommendations.length && <EmptyState text="No nearby recommendations available yet." />}
          </div>
        </section>

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
              <img src={previewImage} alt={`${location.name} preview`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, compact = false }) {
  return (
    <div className={compact ? "hub-section-head hub-section-head--compact" : "hub-section-head"}>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <article className="hub-empty">
      <p>{text}</p>
    </article>
  );
}

function PlaceCard({ item }) {
  return (
    <article className="travel-card hub-place">
      <div>
        <h3>{item.name}</h3>
        <p>{item.address || "Address unavailable"}</p>
      </div>
      <div className="hub-place__meta">
        <span>Rating {item.rating || 0}</span>
        <span>{item.distanceKm ?? "-"} km</span>
      </div>
      {item.mapUri && (
        <a href={item.mapUri} target="_blank" rel="noreferrer" className="hub-link">
          Open in Maps
        </a>
      )}
    </article>
  );
}

function ListingSelectionCard({ listing, selected, onSelect }) {
  const isSelectable = typeof onSelect === "function";
  return (
    <article
      className={`hub-listing ${selected ? "hub-listing--selected" : ""}`}
      role={isSelectable ? "button" : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      onClick={isSelectable ? () => onSelect(listing) : undefined}
      onKeyDown={
        isSelectable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(listing);
            }
          : undefined
      }
    >
      <div className="hub-listing__media">
        <img
          src={resolveImageUrl(listing.photos?.[0]) || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1400&auto=format&fit=crop"}
          alt={listing.title}
        />
      </div>
      <div className="hub-listing__head">
        <h3>{listing.title}</h3>
        <span className="travel-badge">{listing.type}</span>
      </div>
      <p className="hub-listing__meta">
        NPR {listing.pricePerUnit} / {listing.type === "hotel" ? "night" : "booking"}
      </p>
      <p className="hub-listing__rating">Rating: {Number(listing.rating || 0).toFixed(1)} / 5</p>
      <div className="hub-action-row">
        <Link
          to={`/places/${listing._id}`}
          className="travel-btn travel-btn-soft"
          onClick={(e) => e.stopPropagation()}
        >
          View details
        </Link>
        {isSelectable && (
          <button
            type="button"
            className="travel-btn travel-btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(listing);
            }}
          >
            {selected ? "Unselect" : "Select"}
          </button>
        )}
      </div>
    </article>
  );
}
