import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DestinationReviewPanel from "../components/DestinationReviewPanel";
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
  const [hikingRoutes, setHikingRoutes] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [localListings, setLocalListings] = useState([]);
  const [childLocations, setChildLocations] = useState([]);

  const stayEatRef = useRef(null);
  const [showAllStayEat, setShowAllStayEat] = useState(false);
  const activityRef = useRef(null);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllInsidePlaces, setShowAllInsidePlaces] = useState(false);
  const galleryRef = useRef(null);
  const insideRef = useRef(null);
  const nearbyRef = useRef(null);

  const activityListings = useMemo(
    () => localListings.filter((item) => item.type === "activity"),
    [localListings]
  );
  const activityListingVisible = useMemo(
    () => (showAllActivities ? activityListings : activityListings.slice(0, 3)),
    [showAllActivities, activityListings]
  );
  const nearbyActivityVisible = useMemo(
    () => (showAllActivities ? activities.slice(0, 9) : activities.slice(0, 3)),
    [showAllActivities, activities]
  );
  const stayEatListings = useMemo(
    () => localListings.filter((item) => ["hotel", "cafe", "restaurant"].includes(item.type)),
    [localListings]
  );
  const stayEatVisible = useMemo(
    () => (showAllStayEat ? stayEatListings : stayEatListings.slice(0, 3)),
    [showAllStayEat, stayEatListings]
  );
  const visibleChildLocations = useMemo(
    () => (showAllInsidePlaces ? childLocations : childLocations.slice(0, 6)),
    [showAllInsidePlaces, childLocations]
  );

  const fetchNearbyByType = async ({ lat, lng, type, limit = 8, radius = 6000, query = "" }) => {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      type,
      radius: String(radius),
      limit: String(limit),
    });
    if (query) params.set("query", query);
    const { data } = await api.get(`/api/places/nearby?${params.toString()}`);
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

        const { data: allLocationsData } = await api.get("/api/locations");
        if (!active) return;

        const allLocations = Array.isArray(allLocationsData) ? allLocationsData : [];
        const directChildren = allLocations.filter(
          (item) => getParentId(item) && getParentId(item) === current._id
        );
        const scopedLocationNames = Array.from(
          new Set([current.name, ...directChildren.map((item) => item.name)].filter(Boolean))
        );
        const isHubLocation = directChildren.length > 0;

        setChildLocations(directChildren);

        const listingsRes = await api.get(
          `/api/listings?locationNames=${encodeURIComponent(scopedLocationNames.join(","))}`
        );
        if (!active) return;

        const nextRecommendations = buildRecommendations({
          allLocations,
          current,
          isHubLocation,
        }).slice(0, 6);
        setRecommendations(nextRecommendations);

        const listings = Array.isArray(listingsRes.data?.listings) ? listingsRes.data.listings : [];
        setLocalListings(listings);

        if (current.latitude && current.longitude) {
          const nearbyRadius = isHubLocation ? 12000 : 4500;
          const [activityPlaces, cafePlaces, restaurantPlaces, hotelPlaces] = await Promise.all([
            fetchNearbyByType({ lat: current.latitude, lng: current.longitude, type: "tourist_attraction", limit: 9, radius: nearbyRadius }),
            fetchNearbyByType({ lat: current.latitude, lng: current.longitude, type: "cafe", limit: 6, radius: nearbyRadius }),
            fetchNearbyByType({ lat: current.latitude, lng: current.longitude, type: "restaurant", limit: 6, radius: nearbyRadius }),
            fetchNearbyByType({ lat: current.latitude, lng: current.longitude, type: "lodging", limit: 6, radius: nearbyRadius }),
          ]);
          if (!active) return;
          setActivities(activityPlaces);
          setCafes(cafePlaces);
          setRestaurants(restaurantPlaces);
          setHotels(hotelPlaces);

          const routePlaces = await fetchNearbyByType({
            lat: current.latitude,
            lng: current.longitude,
            type: "tourist_attraction",
            limit: 6,
            radius: nearbyRadius,
            query: `${current.name} hiking route`,
          });
          if (!active) return;
          setHikingRoutes(filterHikingRoutes(routePlaces, current));
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

  const handleToggleActivities = () => {
    setShowAllActivities((prev) => {
      const next = !prev;
      if (!prev && activityRef.current) {
        activityRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return next;
    });
  };

  const handleToggleInsidePlaces = () => {
    setShowAllInsidePlaces((prev) => {
      const next = !prev;
      if (!prev && insideRef.current) {
        insideRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const quickFacts = [
    { label: "Activities", value: activityListings.length + activities.length },
    { label: "Stay & Food", value: stayEatListings.length + hotels.length + cafes.length + restaurants.length },
    { label: "Places Inside", value: childLocations.length },
    { label: "Nearby Hubs", value: recommendations.length },
  ].filter((item) => item.value > 0);

  const quickLinks = [
    { label: "Gallery", ref: galleryRef, visible: imageCandidates.length > 0 },
    { label: "Inside Places", ref: insideRef, visible: childLocations.length > 0 },
    { label: "Activities", ref: activityRef, visible: activityListings.length > 0 || activities.length > 0 },
    { label: "Stay & Eat", ref: stayEatRef, visible: stayEatListings.length > 0 || hotels.length > 0 || cafes.length > 0 || restaurants.length > 0 },
    { label: "Nearby", ref: nearbyRef, visible: recommendations.length > 0 },
  ].filter((item) => item.visible);

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
            <h1 className="hub-hero__title">{location.name}</h1>
            <p className="hub-hero__subtitle">
              Discover top activities, real places to stay and eat, and plan your trip in a dedicated booking flow.
            </p>
            <div className="hub-hero__meta">
              <span>{location.district || "District"}</span>
              <span>{location.province || "Province"}</span>
              <span>{location.category || "Destination"}</span>
              {location.parentLocationId?.name && <span>Inside {location.parentLocationId.name}</span>}
            </div>
            <div className="hub-hero__actions">
              <Link to={`/itinerary-planner?locationId=${location._id}`} className="travel-btn travel-btn-primary">
                AI Trip Planner
              </Link>
              <button
                type="button"
                className="travel-btn travel-btn-soft"
                onClick={() => galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                View gallery
              </button>
            </div>
            {!!quickFacts.length && (
              <div className="hub-stats">
                {quickFacts.map((item) => (
                  <article key={item.label} className="hub-stat-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
            )}
            {!!quickLinks.length && (
              <div className="hub-quick-nav">
                {quickLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="hub-quick-nav__item"
                    onClick={() => item.ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
            <article className="hub-hero__about">
              <h2 className="hub-section-title">About this destination</h2>
              <p className="hub-copy">{location.description}</p>
              <div className="hub-pills">
                <span className="hub-pill">Avg Local Cost: NPR {location.averageCost || "-"}</span>
                <span className="hub-pill">{location.district || "District"}</span>
                <span className="hub-pill">{location.province || "Province"}</span>
                {location.parentLocationId?.name && <span className="hub-pill">Parent Area: {location.parentLocationId.name}</span>}
              </div>
            </article>
          </div>
          <div className="hub-hero__image">
            <img src={heroImage} alt={location.name} />
            <div className="hub-hero__image-badge">
              <span>Plan smarter</span>
              <strong>Explore local highlights</strong>
            </div>
          </div>
        </header>

        <section className="hub-top-grid hub-top-grid--single" ref={galleryRef}>
          <article className="travel-card hub-panel hub-section-panel">
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

        {!!childLocations.length && (
          <section className="hub-recommend hub-section-panel" ref={insideRef}>
            <div className="hub-recommend__head">
              <SectionHeader
                title={`Places inside ${location.name}`}
                compact
              />
              {childLocations.length > 6 && (
                <button type="button" className="travel-btn travel-btn-soft" onClick={handleToggleInsidePlaces}>
                  {showAllInsidePlaces ? "Show less" : "See more"}
                </button>
              )}
            </div>
            <div className="hub-card-grid">
              {visibleChildLocations.map((item) => (
                <Link
                  key={item._id}
                  to={`/locations/${item._id}`}
                  className="travel-card hub-child-card"
                >
                  <div className="hub-child-card__media">
                    <img
                      src={
                        resolveImageUrl(item.image) ||
                        resolveImageUrl(item.images?.[0]) ||
                        heroImage
                      }
                      alt={item.name}
                    />
                  </div>
                  <div className="hub-child-card__body">
                    <h3>{item.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="hub-section-panel" ref={activityRef}>
          <SectionHeader title="What you can do here" subtitle="Activities & Attractions" />
          <div className="hub-section-actions">
            <p className="hub-helper">Browse activities and attractions available around this destination.</p>
            {activityListings.length + activities.length > 6 && (
              <button type="button" className="travel-btn travel-btn-soft" onClick={handleToggleActivities}>
                {showAllActivities ? "Show less" : "See all"}
              </button>
            )}
          </div>
          <div className="hub-card-grid">
            {activityListingVisible.map((listing) => (
              <ListingSelectionCard
                key={listing._id}
                listing={listing}
              />
            ))}
            {nearbyActivityVisible.map((item) => (
              <PlaceCard key={item.placeId} item={item} />
            ))}
            {!activityListings.length && !activities.length && (
              <EmptyState text="No activity suggestions available right now." />
            )}
          </div>
        </section>

        <section className="hub-section-panel" ref={stayEatRef}>
          <SectionHeader title="Stay, Eat & Book" subtitle="Hotels, Cafes & Restaurants" />
          <div className="hub-section-actions">
            <p className="hub-helper">Choose your stay or food spot, then generate your itinerary in the AI Trip Planner.</p>
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
        </section>

        {!!hikingRoutes.length && (
          <section className="hub-section-panel">
            <SectionHeader title="Routes & Hikes" subtitle="Nearby hiking routes and scenic trail ideas" />
            <div className="hub-card-grid">
              {hikingRoutes.map((item) => (
                <PlaceCard key={item.placeId} item={item} />
              ))}
            </div>
          </section>
        )}

        <section className="hub-recommend hub-section-panel" ref={nearbyRef}>
          <div className="hub-recommend__head">
            <SectionHeader
              title={childLocations.length ? "Nearby destination hubs" : "Recommended nearby locations"}
              subtitle={childLocations.length ? "Continue exploring other major areas" : "Continue exploring around this area"}
              compact
            />
          </div>
          <div className="hub-card-grid">
            {recommendations.map((item) => (
              <Link
                key={item._id}
                to={`/locations/${item._id}`}
                className="travel-card hub-child-card"
              >
                <div className="hub-child-card__media">
                  <img
                    src={
                      resolveImageUrl(item.image) ||
                      resolveImageUrl(item.images?.[0]) ||
                      heroImage
                    }
                    alt={item.name}
                  />
                </div>
                <div className="hub-child-card__body">
                  <h3>{item.name}</h3>
                </div>
              </Link>
            ))}
            {!recommendations.length && <EmptyState text="No nearby recommendations available yet." />}
          </div>
        </section>

        <DestinationReviewPanel
          destination={location.name}
          title={`Reviews for ${location.name}`}
          subtitle="Travelers can rate this destination directly from its detail page."
          emptyText={`No reviews for ${location.name} yet. Share the first one.`}
        />

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
      {!!subtitle && <p>{subtitle}</p>}
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
      <div className="hub-place__media">
        <img
          src={item.photo || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop"}
          alt={item.name}
        />
      </div>
      <div className="hub-place__body">
        <div>
          <h3>{item.name}</h3>
          <p>{item.address || "Address unavailable"}</p>
        </div>
        <div className="hub-place__meta">
          <span>Rating {item.rating || 0}</span>
          <span>{item.distanceKm ?? "-"} km away</span>
        </div>
        {item.mapUri && (
          <a href={item.mapUri} target="_blank" rel="noreferrer" className="hub-link">
            Open in Maps
          </a>
        )}
      </div>
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

function getParentId(location) {
  if (!location?.parentLocationId) return "";
  if (typeof location.parentLocationId === "string") return location.parentLocationId;
  return location.parentLocationId?._id || "";
}

function normalizeAreaText(value) {
  return String(value || "").trim().toLowerCase();
}

function sameArea(left, right) {
  return normalizeAreaText(left) && normalizeAreaText(left) === normalizeAreaText(right);
}

function isSameLocation(source, target) {
  const sameName = normalizeAreaText(source?.name) && normalizeAreaText(source?.name) === normalizeAreaText(target?.name);
  const sourceLat = Number(source?.latitude);
  const sourceLng = Number(source?.longitude);
  const targetLat = Number(target?.location?.lat ?? target?.latitude);
  const targetLng = Number(target?.location?.lng ?? target?.longitude);
  const sameCoords =
    Number.isFinite(sourceLat) &&
    Number.isFinite(sourceLng) &&
    Number.isFinite(targetLat) &&
    Number.isFinite(targetLng) &&
    Math.abs(sourceLat - targetLat) < 0.0005 &&
    Math.abs(sourceLng - targetLng) < 0.0005;

  return sameName || sameCoords || Number(target?.distanceKm) === 0;
}

function isHikingLikePlace(place) {
  const text = [
    place?.name,
    place?.address,
    ...(Array.isArray(place?.categories) ? place.categories : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return [
    "hike",
    "hiking",
    "trail",
    "trek",
    "route",
    "viewpoint",
    "hill",
    "peak",
    "camp",
    "forest",
    "walk",
  ].some((token) => text.includes(token));
}

function isHubLikePlace(place, current) {
  const name = normalizeAreaText(place?.name);
  const currentName = normalizeAreaText(current?.name);
  const text = [
    place?.name,
    place?.address,
    ...(Array.isArray(place?.categories) ? place.categories : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const genericHubTerms = [
    "city",
    "destination",
    "municipality",
    "metropolitan",
    "town",
    "province",
    "district",
  ];

  return (
    (!!currentName && name === currentName) ||
    genericHubTerms.some((token) => text.includes(token))
  );
}

function filterHikingRoutes(places, current) {
  return (Array.isArray(places) ? places : [])
    .filter((place) => !isSameLocation(current, place))
    .filter((place) => !isHubLikePlace(place, current))
    .filter((place) => isHikingLikePlace(place));
}

function buildRecommendations({ allLocations, current, isHubLocation }) {
  const currentParentId = getParentId(current);
  const candidates = allLocations.filter((item) => item._id !== current._id);
  const matchesRegion = (item) =>
    sameArea(item.district, current.district) || sameArea(item.province, current.province);

  if (isHubLocation) {
    const topLevelCandidates = candidates.filter((item) => !getParentId(item));
    const regionalHubs = topLevelCandidates.filter(matchesRegion);
    return regionalHubs.sort((a, b) => calculateDistance(current, a) - calculateDistance(current, b));
  }

  if (currentParentId) {
    return candidates
      .filter((item) => getParentId(item) === currentParentId)
      .sort((a, b) => calculateDistance(current, a) - calculateDistance(current, b));
  }

  return candidates
    .filter(matchesRegion)
    .sort((a, b) => calculateDistance(current, a) - calculateDistance(current, b));
}

function calculateDistance(source, target) {
  const lat1 = Number(source?.latitude);
  const lng1 = Number(source?.longitude);
  const lat2 = Number(target?.latitude);
  const lng2 = Number(target?.longitude);
  if ([lat1, lng1, lat2, lng2].some((value) => Number.isNaN(value))) return Number.MAX_SAFE_INTEGER;

  const toRad = (value) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
