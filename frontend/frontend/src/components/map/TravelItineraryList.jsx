export default function TravelItineraryList({ locations, onRemoveLocation }) {
  return (
    <section className="travel-map__card">
      <div className="travel-map__card-header">
        <div>
          <p className="travel-map__eyebrow">Itinerary</p>
          <h2>Selected destinations</h2>
        </div>
        <span className="travel-map__pill">{locations.length} stops</span>
      </div>

      {locations.length ? (
        <div className="travel-map__itinerary-list">
          {locations.map((location, index) => (
            <article key={location.id} className="travel-map__itinerary-item">
              <div>
                <strong>Day {index + 1}</strong>
                <h3>{location.name}</h3>
                <p>
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
              </div>
              <button type="button" onClick={() => onRemoveLocation(location.id)}>
                Remove
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="travel-map__empty">
          No destinations selected yet. Turn on add mode and click the map.
        </p>
      )}
    </section>
  );
}
