import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const destinationSuggestions = ["Pokhara", "Kathmandu", "Chitwan", "Lumbini", "Nagarkot"];

export default function DestinationSearch() {
  const [destination, setDestination] = useState("Pokhara");
  const [type, setType] = useState("hotel");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listings, setListings] = useState([]);
  const [discoveries, setDiscoveries] = useState([]);

  const onSearch = async (e) => {
    e.preventDefault();
    if (!destination.trim()) return;
    try {
      setLoading(true);
      setError("");
      const [listingRes, placesRes] = await Promise.all([
        api.get(`/api/listings?city=${encodeURIComponent(destination.trim())}&type=${encodeURIComponent(type)}`),
        api.get(`/api/places/search?query=${encodeURIComponent(destination.trim())}`),
      ]);
      setListings(Array.isArray(listingRes.data?.listings) ? listingRes.data.listings : []);
      setDiscoveries(Array.isArray(placesRes.data?.results) ? placesRes.data.results : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to search destination data");
      setListings([]);
      setDiscoveries([]);
    } finally {
      setLoading(false);
    }
  };

  const discoveryTop = useMemo(() => discoveries.slice(0, 6), [discoveries]);

  return (
    <div className="travel-shell">
      <div className="travel-container">
        <header className="travel-hero">
          <p className="travel-kicker">Smart Travel Nepal</p>
          <h1 className="travel-title">Find stays and activities like a real travel app</h1>
          <p className="travel-subtitle">
            Search destination, compare listings, view details, then continue to booking and payment.
          </p>

          <form onSubmit={onSearch} className="travel-search-form">
            <input
              className="travel-input"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Destination (Pokhara)"
            />
            <select
              className="travel-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="hotel">Hotels</option>
              <option value="activity">Activities</option>
              <option value="cafe">Cafes</option>
              <option value="restaurant">Restaurants</option>
            </select>
            <button className="travel-btn travel-btn-primary">
              Search
            </button>
            <div className="flex items-center justify-end text-xs text-slate-600">
              {loading ? "Loading..." : `${listings.length} listing(s) found`}
            </div>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {destinationSuggestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDestination(item)}
                className="rounded-full border border-teal-300 bg-white/80 px-3 py-1 text-xs font-medium text-teal-800"
              >
                {item}
              </button>
            ))}
          </div>
        </header>

        {error && <p className="travel-alert travel-alert-error">{error}</p>}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Bookable Listings</h2>
            <Link to="/bookings" className="text-sm font-semibold text-teal-700 hover:underline">
              View booking history
            </Link>
          </div>

          {!loading && listings.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600">
              No listings found for this destination yet. Add some from admin panel or try another city.
            </div>
          )}

          <div className="travel-grid-3">
            {listings.map((listing) => (
              <article key={listing._id} className="travel-card">
                <div className="h-40 bg-slate-100">
                  {listing.photos?.[0] ? (
                    <img src={listing.photos[0]} alt={listing.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">No photo</div>
                  )}
                </div>
                <div className="travel-card-body">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{listing.title}</h3>
                    <span className="travel-badge">
                      {listing.type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {[listing.location?.district, listing.location?.province].filter(Boolean).join(", ")}
                  </p>
                  <p className="mt-2 text-sm text-slate-700 line-clamp-2">{listing.description || "No description yet."}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">
                      NPR {listing.pricePerUnit} {listing.type === "hotel" ? "/ night" : "/ booking"}
                    </p>
                    <p className="text-xs text-slate-500">Rating {listing.rating || 0}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      to={`/places/${listing._id}`}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      View details
                    </Link>
                    <Link
                      to={`/book/${listing._id}`}
                      className="rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Book now
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">Nearby Discoveries</h2>
          <div className="travel-grid-3">
            {discoveryTop.map((item) => (
              <article key={item.id} className="travel-card travel-card-body">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-slate-600">
                  {[item.district, item.province, item.category].filter(Boolean).join(" - ")}
                </p>
                <p className="mt-1 text-sm text-slate-700">Avg. cost: NPR {item.averageCost || "-"}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
