import { useEffect, useMemo, useRef } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

const markerCache = new Map();

function createMarkerIcon({ variant = "destination", active = false, label = "" }) {
  const key = `${variant}:${active}:${label}`;
  if (markerCache.has(key)) return markerCache.get(key);

  const palette = {
    origin: { bg: "#0f172a", ring: "rgba(15, 23, 42, 0.18)" },
    waypoint: { bg: "#F4A261", ring: "rgba(244, 162, 97, 0.22)" },
    nearby: { bg: "#1F7A8C", ring: "rgba(31, 122, 140, 0.24)" },
    destination: { bg: "#1F7A8C", ring: "rgba(31, 122, 140, 0.24)" },
  };

  const color = palette[variant] || palette.destination;
  const icon = L.divIcon({
    className: "travel-map__marker-icon-wrapper",
    html: `
      <div class="travel-map__marker ${active ? "is-active" : ""}" style="--marker-bg:${color.bg};--marker-ring:${color.ring};">
        <span>${label || ""}</span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });

  markerCache.set(key, icon);
  return icon;
}

function MapClickHandler({ addModeEnabled, onMapAdd }) {
  useMapEvents({
    click(event) {
      if (!addModeEnabled || typeof onMapAdd !== "function") return;
      onMapAdd(event.latlng);
    },
  });

  return null;
}

function SyncMapSize() {
  const map = useMap();

  useEffect(() => {
    const refreshMap = () => {
      window.requestAnimationFrame(() => {
        map.invalidateSize();
      });
    };

    refreshMap();

    const timeoutId = window.setTimeout(refreshMap, 180);
    window.addEventListener("resize", refreshMap);

    let observer;
    const container = map.getContainer();
    if (window.ResizeObserver && container) {
      observer = new ResizeObserver(() => {
        refreshMap();
      });
      observer.observe(container);
    }

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", refreshMap);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}

function formatCoordinateSignature(coordinates) {
  return coordinates
    .map(([lat, lng]) => `${Number(lat).toFixed(5)}:${Number(lng).toFixed(5)}`)
    .join("|");
}

function FitMapToContent({ locations, nearbyPlaces, routeCoordinates, defaultCenter, defaultZoom }) {
  const map = useMap();
  const lastViewportRef = useRef("");

  useEffect(() => {
    const nearbyCoordinates = nearbyPlaces
      .filter((place) => Number.isFinite(place.location?.lat) && Number.isFinite(place.location?.lng))
      .map((place) => [place.location.lat, place.location.lng]);

    let nextViewportKey = "";

    if (routeCoordinates.length > 1) {
      nextViewportKey = `route:${formatCoordinateSignature(routeCoordinates)}`;
      if (lastViewportRef.current === nextViewportKey) return;
      lastViewportRef.current = nextViewportKey;
      map.fitBounds(L.latLngBounds(routeCoordinates), {
        padding: [56, 56],
        animate: true,
        duration: 0.9,
      });
      return;
    }

    if (locations.length > 1) {
      const locationCoordinates = locations.map((location) => [location.lat, location.lng]);
      nextViewportKey = `locations:${formatCoordinateSignature(locationCoordinates)}`;
      if (lastViewportRef.current === nextViewportKey) return;
      lastViewportRef.current = nextViewportKey;
      map.fitBounds(L.latLngBounds(locationCoordinates), {
        padding: [56, 56],
        animate: true,
        duration: 0.8,
      });
      return;
    }

    if (locations.length === 1 && nearbyCoordinates.length) {
      const combinedCoordinates = [[locations[0].lat, locations[0].lng], ...nearbyCoordinates];
      nextViewportKey = `location-nearby:${locations[0].id}:${formatCoordinateSignature(combinedCoordinates)}`;
      if (lastViewportRef.current === nextViewportKey) return;
      lastViewportRef.current = nextViewportKey;
      map.fitBounds(L.latLngBounds(combinedCoordinates), {
        padding: [56, 56],
        animate: true,
        duration: 0.8,
      });
      return;
    }

    if (locations.length === 1) {
      nextViewportKey = `location:${locations[0].id}:${Number(locations[0].lat).toFixed(5)}:${Number(locations[0].lng).toFixed(5)}`;
      if (lastViewportRef.current === nextViewportKey) return;
      lastViewportRef.current = nextViewportKey;
      map.flyTo([locations[0].lat, locations[0].lng], 11, { animate: true, duration: 0.8 });
      return;
    }

    if (nearbyCoordinates.length) {
      nextViewportKey = `nearby:${formatCoordinateSignature(nearbyCoordinates)}`;
      if (lastViewportRef.current === nextViewportKey) return;
      lastViewportRef.current = nextViewportKey;
      map.fitBounds(L.latLngBounds(nearbyCoordinates), {
        padding: [56, 56],
        animate: true,
        duration: 0.8,
      });
      return;
    }

    nextViewportKey = `default:${Number(defaultCenter[0]).toFixed(5)}:${Number(defaultCenter[1]).toFixed(5)}:${defaultZoom}`;
    if (lastViewportRef.current === nextViewportKey) return;
    lastViewportRef.current = nextViewportKey;
    map.setView(defaultCenter, defaultZoom, { animate: false });
  }, [defaultCenter, defaultZoom, locations, map, nearbyPlaces, routeCoordinates]);

  return null;
}

function FocusMapOnTarget({ focusTarget }) {
  const map = useMap();
  const lastFocusRef = useRef("");

  useEffect(() => {
    if (!focusTarget || !Number.isFinite(focusTarget.lat) || !Number.isFinite(focusTarget.lng)) return;
    const focusKey = `${focusTarget.type}:${focusTarget.id}:${Number(focusTarget.lat).toFixed(5)}:${Number(focusTarget.lng).toFixed(5)}:${focusTarget.zoom || ""}`;
    if (lastFocusRef.current === focusKey) return;
    lastFocusRef.current = focusKey;
    map.flyTo([focusTarget.lat, focusTarget.lng], focusTarget.zoom || map.getZoom(), {
      animate: true,
      duration: 0.85,
    });
  }, [focusTarget, map]);

  return null;
}

function MarkerWithPopup({
  location,
  index,
  markerLabelPrefix,
  onRemoveLocation,
  renderLocationPopup,
  autoOpen = false,
  isSelected = false,
  onSelect,
}) {
  const markerRef = useRef(null);
  const markerIcon = useMemo(
    () =>
      createMarkerIcon({
        variant: location.kind === "origin" ? "origin" : location.kind === "waypoint" ? "waypoint" : "destination",
        active: isSelected,
        label: location.kind === "origin" ? "S" : `${index + 1}`,
      }),
    [index, isSelected, location.kind]
  );

  useEffect(() => {
    if (!autoOpen || !markerRef.current) return;
    const timeoutId = window.setTimeout(() => {
      markerRef.current?.openPopup();
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [autoOpen, location.id]);

  return (
    <Marker
      ref={markerRef}
      position={[location.lat, location.lng]}
      icon={markerIcon}
      eventHandlers={{
        click: () => onSelect?.(location),
      }}
    >
      <Popup autoPan autoPanPaddingTopLeft={[80, 190]} autoPanPaddingBottomRight={[380, 120]}>
        {typeof renderLocationPopup === "function" ? (
          renderLocationPopup(location, index + 1)
        ) : (
          <div className="travel-map__popup">
            <strong>{markerLabelPrefix} {index + 1}</strong>
            <span>{location.name}</span>
            <span>
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </span>
            {typeof onRemoveLocation === "function" ? (
              <button type="button" onClick={() => onRemoveLocation(location.id)}>
                Remove marker
              </button>
            ) : null}
          </div>
        )}
      </Popup>
    </Marker>
  );
}

function NearbyPlaceMarker({ place, isSelected, onSelect, onAddNearbyPlace }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!isSelected || !markerRef.current) return;
    const timeoutId = window.setTimeout(() => {
      markerRef.current?.openPopup();
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [isSelected, place.placeId]);

  return (
    <CircleMarker
      ref={markerRef}
      center={[place.location.lat, place.location.lng]}
      radius={isSelected ? 11 : 8}
      pathOptions={{
        color: isSelected ? "#F4A261" : "#1F7A8C",
        fillColor: isSelected ? "#F4A261" : "#48b5c6",
        fillOpacity: 0.92,
        weight: isSelected ? 3 : 2,
      }}
      eventHandlers={{
        click: () => onSelect?.(place),
      }}
    >
      <Popup autoPan autoPanPaddingTopLeft={[80, 190]} autoPanPaddingBottomRight={[380, 120]}>
        <div className="travel-map__popup-card">
          {place.photo ? (
            <img
              src={place.photo}
              alt={place.name}
              className="travel-map__popup-card-image"
            />
          ) : null}
          <div className="travel-map__popup-card-body">
            <p className="travel-map__popup-card-eyebrow">Nearby pick</p>
            <h3 className="travel-map__popup-card-title">{place.name}</h3>
            <p className="travel-map__popup-card-address">{place.address || "Address unavailable"}</p>
            <div className="travel-map__popup-card-tags">
              <span>Star {Number(place.rating || 0).toFixed(1)}</span>
              <span>{place.distanceKm ?? "-"} km away</span>
            </div>
          </div>
          {typeof onAddNearbyPlace === "function" ? (
            <button
              type="button"
              className="travel-map__popup-card-button"
              onClick={() => onAddNearbyPlace(place)}
            >
              Add to itinerary
            </button>
          ) : null}
        </div>
      </Popup>
    </CircleMarker>
  );
}

export default function TravelMapCanvas({
  center,
  zoom,
  locations = [],
  nearbyPlaces = [],
  routeCoordinates = [],
  highlightCenter,
  highlightRadiusMeters = 0,
  addModeEnabled,
  onMapAdd,
  onRemoveLocation,
  onAddNearbyPlace,
  onLocationSelect,
  onNearbyPlaceSelect,
  markerLabelPrefix = "Day",
  renderLocationPopup,
  autoOpenLocationId,
  selectedLocationId,
  selectedNearbyPlaceId,
  focusTarget,
}) {
  return (
    <div className="travel-map__canvas-shell">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="travel-map__canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SyncMapSize />
        <MapClickHandler addModeEnabled={addModeEnabled} onMapAdd={onMapAdd} />
        <FitMapToContent
          locations={locations}
          nearbyPlaces={nearbyPlaces}
          routeCoordinates={routeCoordinates}
          defaultCenter={center}
          defaultZoom={zoom}
        />
        <FocusMapOnTarget focusTarget={focusTarget} />

        {Array.isArray(highlightCenter) &&
        highlightCenter.length === 2 &&
        Number.isFinite(highlightCenter[0]) &&
        Number.isFinite(highlightCenter[1]) &&
        highlightRadiusMeters > 0 ? (
          <Circle
            center={highlightCenter}
            radius={highlightRadiusMeters}
            pathOptions={{
              color: "#1d4ed8",
              weight: 2,
              fillColor: "#60a5fa",
              fillOpacity: 0.12,
            }}
          />
        ) : null}

        {nearbyPlaces
          .filter((place) => Number.isFinite(place.location?.lat) && Number.isFinite(place.location?.lng))
          .map((place) => (
            <NearbyPlaceMarker
              key={place.placeId}
              place={place}
              isSelected={place.placeId === selectedNearbyPlaceId}
              onSelect={onNearbyPlaceSelect}
              onAddNearbyPlace={onAddNearbyPlace}
            />
          ))}

        {locations.map((location, index) => (
          <MarkerWithPopup
            key={location.id}
            location={location}
            index={index}
            markerLabelPrefix={markerLabelPrefix}
            onRemoveLocation={onRemoveLocation}
            renderLocationPopup={renderLocationPopup}
            autoOpen={location.id === autoOpenLocationId || location.id === selectedLocationId}
            isSelected={location.id === selectedLocationId}
            onSelect={onLocationSelect}
          />
        ))}

        {routeCoordinates.length > 1 ? (
          <>
            <Polyline
              positions={routeCoordinates}
              pathOptions={{ color: "#F4A261", weight: 9, opacity: 0.22 }}
              className="travel-map__route-line travel-map__route-line--halo"
            />
            <Polyline
              positions={routeCoordinates}
              pathOptions={{ color: "#1F7A8C", weight: 5, opacity: 0.95 }}
              className="travel-map__route-line"
            />
          </>
        ) : null}
      </MapContainer>
    </div>
  );
}
