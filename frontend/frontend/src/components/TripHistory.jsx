import React from 'react';
import EmptyState from './EmptyState';

export default function TripHistory({ trips = [], onView }) {
  if (!trips.length) return <EmptyState title="No trips yet" description="You haven't booked any trips — your future adventures will show up here." ctaText="Explore trips" onCta={() => window.location.href = '/trips'} />;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Trip History</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">Trip</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="mt-2">
            {trips.map((t) => (
              <tr key={t.id} className="border-t border-gray-50">
                <td className="px-3 py-3 font-medium text-gray-800">{t.title}</td>
                <td className="px-3 py-3 text-gray-600">{t.date}</td>
                <td className="px-3 py-3 text-gray-600">{t.price}</td>
                <td className="px-3 py-3 text-gray-600">{t.status || 'Completed'}</td>
                <td className="px-3 py-3 text-right">
                  <button onClick={() => onView?.(t)} className="text-sm text-blue-600 hover:underline px-2 py-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">View details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
