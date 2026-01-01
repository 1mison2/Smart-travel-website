import React from 'react';

export default function AIItineraryCard({ lastItinerary, loading, onCreate }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-shadow duration-200">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Itinerary Generator</h3>
          <p className="text-sm text-gray-500 mt-1">Let our AI craft a personalized plan based on your preferences and travel dates.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 w-full md:w-auto justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-transform transform-gpu hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
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
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ) : lastItinerary ? (
          <div className="mt-2 bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-sm text-gray-700 line-clamp-3">{lastItinerary.summary}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-gray-500">Generated {new Date(lastItinerary.createdAt).toLocaleString()}</span>
              <button className="ml-auto text-sm text-blue-600 hover:underline">View</button>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-gray-500">No AI itineraries yet. Create one to get instant suggestions and day-by-day plans.</div>
        )}
      </div>
    </div>
  );
}
