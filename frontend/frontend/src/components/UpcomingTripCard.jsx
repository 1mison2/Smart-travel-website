import React from 'react';

export default function UpcomingTripCard({ trip }) {
  const title = trip?.title || 'Destination';
  const dateRange = trip ? `${trip.date || ''}` : 'Dates: start - end';

  if (!trip) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-md p-4 animate-pulse">
        <div className="h-40 bg-gray-100 rounded-md mb-4" />
        <div className="h-3 w-3/5 bg-gray-100 rounded-md mb-2" />
        <div className="h-3 w-1/2 bg-gray-100 rounded-md" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="relative h-40 sm:h-56 lg:h-60 bg-gray-100">
        {/* Image placeholder - replace src with real image when available */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://source.unsplash.com/collection/190727/1200x800?sig=${trip?.id || 1}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute left-4 bottom-4 right-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-white drop-shadow">{title}</h3>
            <p className="text-xs sm:text-sm text-white/90 mt-1">{dateRange}</p>
          </div>
          <button className="bg-primary hover:opacity-95 text-white px-3 py-2 rounded-md shadow-sm text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">View Trip</button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <p className="text-sm sm:text-base text-gray-600">{trip?.summary || 'Short summary of upcoming trip highlights and what to expect.'}</p>
      </div>
    </div>
  );
}
