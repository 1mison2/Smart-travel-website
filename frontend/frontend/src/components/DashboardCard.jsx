import React from 'react';

export default function DashboardCard({ title, value, accent = 'blue', icon, onClick }) {
  const accentBg = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    red: 'bg-red-50'
  }[accent] || 'bg-blue-50';

  const iconColor = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600'
  }[accent] || 'text-blue-600';

  const clickable = Boolean(onClick);

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => { if (clickable && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
      onClick={onClick}
      className={`bg-white border border-gray-100 rounded-2xl p-4 shadow-sm ${clickable ? 'cursor-pointer transform-gpu hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        {icon ? (
          <div className={`p-3 rounded-lg ${accentBg}`}>{icon}</div>
        ) : (
          <div className={`p-3 rounded-lg ${accentBg}`}>
            <svg className={`w-6 h-6 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
} 
