import React, { useState } from 'react';

export default function ItineraryItem({ title, date }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-start gap-3 p-3 bg-white border border-gray-100 rounded-lg shadow-sm w-full">
      <div className="w-full h-28 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
        <img alt={title} src={`https://source.unsplash.com/featured/?travel,${encodeURIComponent(title)}`} className="w-full h-full object-cover" />
      </div>
      <div className="w-full">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900 truncate">{title}</div>
          <button onClick={() => setOpen(v => !v)} className="text-xs text-primary font-medium">{open ? 'Hide' : 'View'}</button>
        </div>
        {date && <div className="text-xs text-gray-500 mt-1">{date}</div>}
        {open && (
          <div className="mt-3 text-sm text-gray-600">
            <p>Sample itinerary details: Visit local markets, sample cuisine, and explore cultural sites.</p>
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-1 rounded-md bg-primary text-white text-sm">Open Guide</button>
              <button className="px-3 py-1 rounded-md border border-gray-200 text-sm">Share</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
