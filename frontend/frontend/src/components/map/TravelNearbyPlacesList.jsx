import { resolveImageUrl } from "../../utils/api";

function getPlaceImage(place) {
  return (
    resolveImageUrl(place.photo) ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop"
  );
}

export default function TravelNearbyPlacesList({
  places,
  loading,
  error,
  source,
  selectedPlaceIds,
  onAddPlace,
}) {
  return (
    <section className="travel-map__card">
      <div className="travel-map__card-header">
        <div>
          <p className="travel-map__eyebrow">Nearby Explorer</p>
          <h2>Suggested places</h2>
        </div>
        <span className="travel-map__pill">{places.length} found</span>
      </div>

      <p className="travel-map__copy">
        Browse attractions, cafes, restaurants, and stays near the current map focus, then add
        any result into the itinerary.
      </p>

      {source ? (
        <p className="travel-map__subtle">
          Source: {source === "local_fallback" ? "Smart Travel database fallback" : "Google Places"}
        </p>
      ) : null}

      {loading ? <p className="travel-map__empty">Loading nearby places...</p> : null}
      {!loading && error ? <p className="travel-map__error">{error}</p> : null}

      {!loading && !error && !places.length ? (
        <p className="travel-map__empty">No nearby places matched this filter yet.</p>
      ) : null}

      {!!places.length && (
        <div className="travel-map__nearby-list">
          {places.map((place) => {
            const isSelected = selectedPlaceIds.has(place.placeId);
            return (
              <article key={place.placeId} className="travel-map__nearby-card">
                <div className="travel-map__nearby-media">
                  <img src={getPlaceImage(place)} alt={place.name} />
                </div>
                <div className="travel-map__nearby-body">
                  <div className="travel-map__nearby-copy">
                    <h3>{place.name}</h3>
                    <p>{place.address || "Address unavailable"}</p>
                  </div>
                  <div className="travel-map__nearby-meta">
                    <span>Rating {Number(place.rating || 0).toFixed(1)}</span>
                    <span>{place.distanceKm ?? "-"} km away</span>
                  </div>
                  <div className="travel-map__nearby-actions">
                    <button type="button" onClick={() => onAddPlace(place)} disabled={isSelected}>
                      {isSelected ? "Added" : "Add to route"}
                    </button>
                    {place.mapUri ? (
                      <a href={place.mapUri} target="_blank" rel="noreferrer">
                        Open in Maps
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
