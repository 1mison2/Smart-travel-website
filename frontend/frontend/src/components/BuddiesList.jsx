import React from 'react';
import EmptyState from './EmptyState';

export default function BuddiesList({ buddies = [], onFind }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Travel Buddies</h3>
        <button onClick={onFind} className="text-sm text-blue-600 hover:underline">Find New Buddy</button>
      </div>

      <div className="mt-3">
        {!buddies.length ? (
          <EmptyState title="No buddies yet" description="Find and connect with fellow travelers." ctaText="Find buddies" onCta={onFind} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {buddies.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3 border border-gray-50 rounded-lg hover:shadow-sm transition-shadow">
                <img src={b.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=2563eb&color=fff`} alt={b.name} className="w-10 h-10 rounded-full" />
                <div>
                  <div className="text-sm font-medium text-gray-800">{b.name}</div>
                  <div className="text-xs text-gray-500">{b.mutual ? `${b.mutual} mutual trips` : 'No mutual trips'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
