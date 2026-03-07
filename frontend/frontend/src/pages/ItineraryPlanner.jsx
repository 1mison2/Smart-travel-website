import React, { useState } from "react";
import api from "../utils/api";

export default function ItineraryPlanner() {
  const [form, setForm] = useState({
    destination: "Pokhara",
    budget: "15000",
    durationDays: "3",
    interests: "food,nature,boating",
  });
  const [itinerary, setItinerary] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onGenerate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const payload = {
        destination: form.destination,
        budget: Number(form.budget),
        durationDays: Number(form.durationDays),
        interests: form.interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };
      const { data } = await api.post("/api/itineraries/generate", payload);
      setItinerary(data?.itinerary || null);
      setSummary(data?.summary || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to generate itinerary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Smart Itinerary Planner</h1>

      <form onSubmit={onGenerate} className="grid md:grid-cols-2 gap-3 mb-6">
        <input className="border rounded-xl px-3 py-2" name="destination" value={form.destination} onChange={onChange} placeholder="Destination" />
        <input className="border rounded-xl px-3 py-2" name="budget" value={form.budget} onChange={onChange} placeholder="Budget (NPR)" />
        <input className="border rounded-xl px-3 py-2" name="durationDays" value={form.durationDays} onChange={onChange} placeholder="Duration days" />
        <input className="border rounded-xl px-3 py-2" name="interests" value={form.interests} onChange={onChange} placeholder="Interests (comma-separated)" />
        <button className="px-4 py-2 rounded-xl bg-teal-700 text-white md:col-span-2">Generate Itinerary</button>
      </form>

      {loading && <p>Generating...</p>}
      {error && <p className="text-red-700">{error}</p>}
      {summary && (
        <div className="border rounded-xl p-4 bg-white mb-4">
          <p>
            Destination: <strong>{summary.destination}</strong> | Days: <strong>{summary.durationDays}</strong>
          </p>
          <p>
            Budget: <strong>{summary.budget}</strong> | Estimated: <strong>{summary.totalEstimatedCost}</strong> | Gap:{" "}
            <strong>{summary.budgetGap}</strong>
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {(itinerary?.days || []).map((day) => (
          <article key={day.day} className="border rounded-xl p-4 bg-white">
            <h2 className="font-semibold">{day.title}</h2>
            <p className="text-sm text-slate-600 mb-2">Estimated cost: {day.estimatedCost}</p>
            <ul className="list-disc pl-5 text-sm">
              {(day.places || []).map((place, index) => (
                <li key={`${place.name}-${index}`}>
                  {place.name} ({place.category}) - {place.estimatedCost}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
