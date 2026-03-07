import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../utils/api";

export default function MapExplorer() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [lat, setLat] = useState(params.get("lat") || "28.2096");
  const [lng, setLng] = useState(params.get("lng") || "83.9856");
  const [type, setType] = useState(params.get("type") || "restaurant");
  const [places, setPlaces] = useState([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadNearby = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get(
        `/api/places/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&type=${encodeURIComponent(type)}&radius=3000`
      );
      setPlaces(Array.isArray(data?.places) ? data.places : []);
      setSource(data?.source || "");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to fetch nearby places");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold mb-2">Map Explorer (Nearby Places)</h1>
      <p className="text-slate-600 mb-6">Default coordinates are Lakeside Pokhara.</p>

      <form onSubmit={loadNearby} className="grid md:grid-cols-4 gap-2 mb-5">
        <input className="border rounded-xl px-3 py-2" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" />
        <input className="border rounded-xl px-3 py-2" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" />
        <select className="border rounded-xl px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="restaurant">Restaurant</option>
          <option value="cafe">Cafe</option>
          <option value="lodging">Hotel/Lodging</option>
          <option value="tourist_attraction">Attraction</option>
        </select>
        <button className="px-4 py-2 rounded-xl bg-teal-700 text-white">Load Nearby</button>
      </form>

      {loading && <p>Loading places...</p>}
      {error && <p className="text-red-700">{error}</p>}
      {source && <p className="text-sm text-slate-600 mb-2">Data source: {source}</p>}

      <div className="grid gap-3">
        {places.map((place) => (
          <article key={place.placeId} className="border rounded-xl p-4 bg-white">
            <h2 className="font-semibold">{place.name}</h2>
            <p className="text-sm text-slate-600">{place.address || "Address unavailable"}</p>
            <p className="text-sm mt-1">
              Rating: {place.rating || 0} | Distance: {place.distanceKm ?? "-"} km
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
