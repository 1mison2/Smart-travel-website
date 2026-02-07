import React from 'react';

export default function DashboardCard({ title, value, accent = 'blue', icon, onClick }) {
  const accentBg = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100',
    green: 'bg-gradient-to-br from-green-50 to-green-100',
    yellow: 'bg-gradient-to-br from-amber-50 to-amber-100',
    red: 'bg-gradient-to-br from-red-50 to-red-100',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100'
  }[accent] || 'bg-gradient-to-br from-blue-50 to-blue-100';

  const iconColor = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-amber-600',
    red: 'text-red-600',
    purple: 'text-purple-600'
  }[accent] || 'text-blue-600';

  const clickable = Boolean(onClick);

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => { if (clickable && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
      onClick={onClick}
      className={`bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 ${clickable ? 'cursor-pointer transform-gpu hover:-translate-y-1 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        {icon ? (
          <div className={`p-3 rounded-xl ${accentBg} shadow-sm`}>{icon}</div>
        ) : (
          <div className={`p-3 rounded-xl ${accentBg} shadow-sm`}>
            <svg className={`w-6 h-6 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
} 
