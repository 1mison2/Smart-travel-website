import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

export default function LocationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activities, setActivities] = useState([]);
  const [cafes, setCafes] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [localListings, setLocalListings] = useState([]);

  const [itinerary, setItinerary] = useState(null);
  const [itinerarySummary, setItinerarySummary] = useState(null);
  const [plannerLoading, setPlannerLoading] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    listingId: "",
    checkIn: tomorrow(),
    checkOut: dayAfter(),
    guests: 1,
  });
  const [quote, setQuote] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingFocusPulse, setBookingFocusPulse] = useState(false);
  const bookingPanelRef = useRef(null);
  const quoteDebounceRef = useRef(null);

  const [planForm, setPlanForm] = useState({
    budget: 15000,
    durationDays: 3,
    interests: "nature,food,culture",
  });

  const selectedListing = useMemo(
    () => localListings.find((item) => item._id === bookingForm.listingId) || null,
    [localListings, bookingForm.listingId]
  );
  const activityListings = useMemo(
    () => localListings.filter((item) => item.type === "activity"),
    [localListings]
  );
  const stayEatListings = useMemo(
    () => localListings.filter((item) => ["hotel", "cafe", "restaurant"].includes(item.type)),
    [localListings]
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
        if (listings.length) setBookingForm((prev) => ({ ...prev, listingId: listings[0]._id }));

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

  const onGenerateItinerary = async (e) => {
    e.preventDefault();
    if (!location) return;
    try {
      setPlannerLoading(true);
      const { data } = await api.post("/api/itineraries/generate", {
        destination: location.name,
        budget: Number(planForm.budget),
        durationDays: Number(planForm.durationDays),
        interests: String(planForm.interests)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setItinerary(data?.itinerary || null);
      setItinerarySummary(data?.summary || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to generate itinerary");
    } finally {
      setPlannerLoading(false);
    }
  };

  const onBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingError("");
    setBookingForm((prev) => ({ ...prev, [name]: name === "guests" ? Number(value) : value }));
  };

  const refreshQuoteFor = async (listingId, payload = {}) => {
    if (!listingId) return;
    try {
      setBookingError("");
      const { data } = await api.post("/api/bookings/quote", {
        listingId,
        checkIn: payload.checkIn || bookingForm.checkIn,
        checkOut: payload.checkOut || bookingForm.checkOut,
        guests: payload.guests || bookingForm.guests,
      });
      setQuote(data?.quote || null);
    } catch (err) {
      setQuote(null);
      setBookingError(err?.response?.data?.message || "Failed to fetch quote");
    }
  };

  const onRefreshQuote = async () => {
    await refreshQuoteFor(bookingForm.listingId);
  };

  const handleSelectListing = async (listing) => {
    if (bookingForm.listingId === listing._id) {
      setBookingForm((prev) => ({ ...prev, listingId: "" }));
      setQuote(null);
      setBookingError("");
      return;
    }
    const next = {
      listingId: listing._id,
      checkIn: bookingForm.checkIn,
      checkOut: bookingForm.checkOut,
      guests: bookingForm.guests,
    };
    setBookingForm((prev) => ({ ...prev, listingId: listing._id }));
    await refreshQuoteFor(listing._id, next);
    if (bookingPanelRef.current) {
      bookingPanelRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setBookingFocusPulse(true);
      setTimeout(() => setBookingFocusPulse(false), 1200);
    }
  };

  const handleClearSelection = () => {
    setBookingForm((prev) => ({ ...prev, listingId: "" }));
    setQuote(null);
    setBookingError("");
  };

  useEffect(() => {
    if (!bookingForm.listingId) {
      setQuote(null);
      return;
    }
    if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    quoteDebounceRef.current = setTimeout(() => {
      refreshQuoteFor(bookingForm.listingId);
    }, 250);
    return () => {
      if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    };
  }, [bookingForm.listingId, bookingForm.checkIn, bookingForm.checkOut, bookingForm.guests]);

  const onContinueToCheckout = () => {
    if (!bookingForm.listingId) return;
    const params = new URLSearchParams({
      checkIn: bookingForm.checkIn,
      checkOut: bookingForm.checkOut,
      guests: String(bookingForm.guests || 1),
    });
    navigate(`/book/${bookingForm.listingId}?${params.toString()}`);
  };

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

  const imageCandidates = [
    location.image ? resolveImageUrl(location.image) : "",
    ...(Array.isArray(location.images) ? location.images.map((img) => resolveImageUrl(img)) : []),
    ...activities.map((p) => p.photo).filter(Boolean),
    ...hotels.map((p) => p.photo).filter(Boolean),
    ...restaurants.map((p) => p.photo).filter(Boolean),
  ].filter(Boolean);

  return (
    <div className="travel-shell">
      <div className="travel-container">
        <header className="hub-hero">
          <div className="hub-hero__content">
            <p className="travel-kicker">Destination Hub</p>
            <h1 className="hub-hero__title">{location.name} - Explore, Plan & Book</h1>
            <p className="hub-hero__subtitle">
              Discover top activities, real places to stay and eat, smart itinerary suggestions, and complete your booking in one flow.
            </p>
            <div className="hub-hero__meta">
              <span>{location.district || "District"}</span>
              <span>{location.province || "Province"}</span>
              <span>{location.category || "Destination"}</span>
            </div>
          </div>
          <div className="hub-hero__image">
            <img src={imageCandidates[0] || "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1400&auto=format&fit=crop"} alt={location.name} />
          </div>
        </header>

        <section className="hub-top-grid">
          <article className="travel-card hub-panel">
            <h2 className="hub-section-title">About this destination</h2>
            <p className="hub-copy">{location.description}</p>
            <div className="hub-pills">
              <span className="hub-pill">Avg Local Cost: NPR {location.averageCost || "-"}</span>
              <span className="hub-pill">{location.district || "District"}</span>
              <span className="hub-pill">{location.province || "Province"}</span>
            </div>
          </article>
          <article className="travel-card hub-panel">
            <h2 className="hub-section-title">Photo gallery</h2>
            <div className="hub-gallery">
              {imageCandidates.slice(0, 6).map((img, idx) => (
                <figure key={`${img}-${idx}`} className="hub-gallery__item">
                  <img src={img} alt={`gallery-${idx}`} />
                </figure>
              ))}
              {!imageCandidates.length && <EmptyState text="No extra photos available yet." />}
            </div>
          </article>
        </section>

        <SectionHeader title="What you can do here" subtitle="Activities & Attractions" />
        <p className="hub-helper">Select any card to instantly load it into the booking panel below.</p>
        <div className="hub-card-grid">
          {activityListings.map((listing) => (
            <ListingSelectionCard
              key={listing._id}
              listing={listing}
              selected={bookingForm.listingId === listing._id}
              onSelect={handleSelectListing}
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
        <p className="hub-helper">Choose your stay or food spot and continue booking without leaving this page.</p>
        <div className="hub-card-grid">
          {stayEatListings.map((listing) => (
            <ListingSelectionCard
              key={listing._id}
              listing={listing}
              selected={bookingForm.listingId === listing._id}
              onSelect={handleSelectListing}
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

        <div className="hub-tools">
          <article className="travel-summary hub-tool">
            <h2 className="hub-section-title">Plan itinerary for this destination</h2>
            <form className="hub-form" onSubmit={onGenerateItinerary}>
              <input
                className="travel-input"
                type="number"
                min="1000"
                value={planForm.budget}
                onChange={(e) => setPlanForm((p) => ({ ...p, budget: e.target.value }))}
                placeholder="Budget (NPR)"
              />
              <input
                className="travel-input"
                type="number"
                min="1"
                max="10"
                value={planForm.durationDays}
                onChange={(e) => setPlanForm((p) => ({ ...p, durationDays: e.target.value }))}
                placeholder="Days"
              />
              <input
                className="travel-input"
                value={planForm.interests}
                onChange={(e) => setPlanForm((p) => ({ ...p, interests: e.target.value }))}
                placeholder="Interests (food,nature,culture)"
              />
              <button className="travel-btn travel-btn-primary" disabled={plannerLoading}>
                {plannerLoading ? "Generating..." : "Generate itinerary"}
              </button>
            </form>
            {itinerarySummary && (
              <div className="hub-mini-card">
                <p>Estimated cost: NPR {itinerarySummary.totalEstimatedCost}</p>
                <p>Budget gap: NPR {itinerarySummary.budgetGap}</p>
              </div>
            )}
            {itinerary?.days?.length > 0 && (
              <div className="hub-day-list">
                {itinerary.days.slice(0, 3).map((day) => (
                  <div key={day.day} className="hub-day-item">
                    <strong>{day.title}</strong>
                    <span>{day.places?.map((p) => p.name).slice(0, 3).join(", ")}</span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article
            ref={bookingPanelRef}
            className={`travel-summary hub-tool ${bookingFocusPulse ? "hub-book-focus" : ""}`}
          >
            <h2 className="hub-section-title">Book from this page</h2>
            <p className="hub-copy" style={{ marginTop: 0 }}>
              Selected listing: <strong>{selectedListing?.title || "None"}</strong>
            </p>
            <p className="hub-copy" style={{ marginTop: "-2px", fontSize: "0.85rem" }}>
              Next step: continue to checkout. Payment will be done on a separate final page.
            </p>
            {selectedListing?._id && (
              <Link to={`/places/${selectedListing._id}`} className="hub-link">
                View selected place details, photos and reviews
              </Link>
            )}
            <div className="hub-form">
              <select className="travel-select" name="listingId" value={bookingForm.listingId} onChange={onBookingChange}>
                <option value="">Select listing</option>
                {localListings.map((listing) => (
                  <option key={listing._id} value={listing._id}>
                    {listing.title} ({listing.type})
                  </option>
                ))}
              </select>
              <input className="travel-input" type="date" name="checkIn" value={bookingForm.checkIn} onChange={onBookingChange} />
              <input className="travel-input" type="date" name="checkOut" value={bookingForm.checkOut} onChange={onBookingChange} />
              <input className="travel-input" type="number" min="1" name="guests" value={bookingForm.guests} onChange={onBookingChange} />
            </div>
            <div className="hub-action-row">
              <button className="travel-btn travel-btn-soft" type="button" onClick={onRefreshQuote}>
                Get quote
              </button>
              <button
                className="travel-btn travel-btn-soft"
                type="button"
                onClick={handleClearSelection}
                disabled={!bookingForm.listingId}
              >
                Clear selection
              </button>
              <button
                className="travel-btn travel-btn-primary"
                type="button"
                onClick={onContinueToCheckout}
                disabled={!bookingForm.listingId}
              >
                Continue to checkout
              </button>
            </div>
            {quote?.pricing && (
              <div className="hub-mini-card">
                <p>Subtotal: NPR {quote.pricing.subtotal}</p>
                <p>Service fee: NPR {quote.pricing.serviceFee}</p>
                <p>Tax: NPR {quote.pricing.tax}</p>
                <p className="hub-mini-card__total">Total: NPR {quote.pricing.total}</p>
              </div>
            )}
            {bookingError && <p className="travel-alert travel-alert-error">{bookingError}</p>}
          </article>
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
  return (
    <article
      className={`hub-listing ${selected ? "hub-listing--selected" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(listing)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(listing);
      }}
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
      </div>
    </article>
  );
}
