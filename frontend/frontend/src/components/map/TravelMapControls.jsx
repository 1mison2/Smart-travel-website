const travelModes = [
  { value: "driving-car", label: "Driving" },
  { value: "foot-walking", label: "Walking" },
];

const nearbyTypes = [
  { value: "tourist_attraction", label: "Attractions" },
  { value: "lodging", label: "Hotels" },
  { value: "restaurant", label: "Restaurants" },
  { value: "cafe", label: "Cafes" },
];

export default function TravelMapControls({
  addModeEnabled,
  pendingName,
  onPendingNameChange,
  travelMode,
  onTravelModeChange,
  onToggleAddMode,
  onGenerateRoute,
  onClearMap,
  onUseCurrentLocation,
  loadingRoute,
  loadingLocation,
  loadingNearby,
  nearbyType,
  onNearbyTypeChange,
  nearbyQuery,
  onNearbyQueryChange,
  onSearchNearby,
  stats,
  error,
  hasEnoughLocations,
}) {
  return (
    <section className="travel-map__card">
      <div className="travel-map__card-header">
        <div>
          <p className="travel-map__eyebrow">Planner Controls</p>
          <h2>Build your route</h2>
        </div>
      </div>

      <p className="travel-map__copy">
        Click <strong>Add Location</strong>, then click anywhere on the map to place itinerary
        points in order.
      </p>

      <label className="travel-map__field">
        <span>Location name</span>
        <input
          type="text"
          value={pendingName}
          onChange={(event) => onPendingNameChange(event.target.value)}
          placeholder="Pokhara, Chitwan, Lumbini..."
        />
      </label>

      <label className="travel-map__field">
        <span>Travel mode</span>
        <select value={travelMode} onChange={(event) => onTravelModeChange(event.target.value)}>
          {travelModes.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>

      <label className="travel-map__field">
        <span>Nearby place type</span>
        <select value={nearbyType} onChange={(event) => onNearbyTypeChange(event.target.value)}>
          {nearbyTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      <label className="travel-map__field">
        <span>Search nearby</span>
        <input
          type="text"
          value={nearbyQuery}
          onChange={(event) => onNearbyQueryChange(event.target.value)}
          placeholder="Lakeside cafe, scenic hike, family hotel..."
        />
      </label>

      <div className="travel-map__button-row">
        <button
          type="button"
          className={addModeEnabled ? "is-active" : ""}
          onClick={onToggleAddMode}
        >
          {addModeEnabled ? "Adding on Map" : "Add Location"}
        </button>
        <button type="button" onClick={onGenerateRoute} disabled={!hasEnoughLocations || loadingRoute}>
          {loadingRoute ? "Generating..." : "Generate Route"}
        </button>
        <button type="button" onClick={onClearMap}>
          Clear Map
        </button>
      </div>

      <div className="travel-map__button-row travel-map__button-row--secondary">
        <button type="button" onClick={onUseCurrentLocation} disabled={loadingLocation}>
          {loadingLocation ? "Locating..." : "Use Current Location"}
        </button>
        <button type="button" onClick={onSearchNearby} disabled={loadingNearby}>
          {loadingNearby ? "Refreshing nearby..." : "Refresh Nearby Places"}
        </button>
      </div>

      <div className="travel-map__stats-grid">
        <article>
          <span>Total distance</span>
          <strong>{stats.distanceLabel}</strong>
        </article>
        <article>
          <span>Estimated time</span>
          <strong>{stats.durationLabel}</strong>
        </article>
      </div>

      {error ? <p className="travel-map__error">{error}</p> : null}

      <div className="travel-map__notes">
        <p>Academic scope:</p>
        <ul>
          <li>Estimated routes and time only</li>
          <li>No real-time navigation</li>
          <li>No public transport routing</li>
        </ul>
      </div>
    </section>
  );
}
