import React from 'react';

export default function AIItineraryCard({ lastItinerary, loading, onCreate }) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_56px_rgba(15,23,42,0.12)]">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">AI Itinerary Generator</h3>
          <p className="mt-1 text-sm text-slate-600">Let our AI craft a personalized plan based on your preferences and travel dates.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onCreate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_50%,#38bdf8_100%)] px-4 py-2.5 text-white shadow-[0_16px_36px_rgba(37,99,235,0.32)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(37,99,235,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 md:w-auto"
            aria-label="Create AI Itinerary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
            </svg>
            <span className="text-sm font-medium">Create AI Itinerary</span>
          </button>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-3 w-3/4 rounded-full bg-slate-200" />
            <div className="h-3 w-5/6 rounded-full bg-slate-200" />
            <div className="h-3 w-1/2 rounded-full bg-slate-200" />
          </div>
        ) : lastItinerary ? (
          <div className="mt-2 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <p className="line-clamp-3 text-sm text-slate-700">{lastItinerary.summary}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-500">Generated {new Date(lastItinerary.createdAt).toLocaleString()}</span>
              <button className="ml-auto text-sm font-medium text-blue-700 transition-colors hover:text-blue-800">View</button>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">No AI itineraries yet. Create one to get instant suggestions and day-by-day plans.</div>
        )}
      </div>
    </div>
  );
}
