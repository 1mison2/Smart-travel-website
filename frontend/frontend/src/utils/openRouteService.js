const OPENROUTE_BASE_URL = "https://api.openrouteservice.org/v2/directions";

export function formatDistance(distanceInMeters) {
  if (!Number.isFinite(distanceInMeters)) return "--";
  return `${(distanceInMeters / 1000).toFixed(1)} km`;
}

export function formatDuration(durationInSeconds) {
  if (!Number.isFinite(durationInSeconds)) return "--";

  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.round((durationInSeconds % 3600) / 60);

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

export async function fetchOpenRouteServiceRoute({ apiKey, profile, locations }) {
  if (!apiKey) {
    throw new Error("Missing OpenRouteService API key. Add VITE_OPENROUTESERVICE_API_KEY to your .env file.");
  }

  if (!Array.isArray(locations) || locations.length < 2) {
    throw new Error("At least two locations are required to generate a route.");
  }

  const response = await fetch(`${OPENROUTE_BASE_URL}/${profile}/geojson`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: locations.map((location) => [location.lng, location.lat]),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || "OpenRouteService route request failed.");
  }

  const data = await response.json();
  const feature = data?.features?.[0];
  const summary = feature?.properties?.summary;
  const routeCoordinates = feature?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) ?? [];

  if (!summary || !routeCoordinates.length) {
    throw new Error("No valid route data was returned.");
  }

  return {
    distance: summary.distance,
    duration: summary.duration,
    coordinates: routeCoordinates,
    raw: data,
  };
}
