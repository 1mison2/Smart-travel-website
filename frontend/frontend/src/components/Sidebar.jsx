import React from 'react';
import { NavLink } from 'react-router-dom';

const items = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard' },
  { key: 'trips', label: 'My Trips', to: '/trips' },
  { key: 'ai', label: 'AI Itinerary Generator', to: '/ai' },
  { key: 'buddy', label: 'Travel Buddy Finder', to: '/buddy' },
  { key: 'bookings', label: 'Bookings', to: '/bookings' },
  { key: 'budget', label: 'Budget Tracker', to: '/budget' },
  { key: 'blogs', label: 'Blogs & Reviews', to: '/blogs' },
  { key: 'settings', label: 'Profile Settings', to: '/settings' },
];

export default function Sidebar({ onLogout, mobileOpen, onClose }) {
  return (
    <>
      <aside className="w-64 bg-white border-r border-gray-100 pr-4 hidden lg:block shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center text-white font-bold">ST</div>
            <h2 className="text-2xl font-semibold text-gray-900">Smart Travel</h2>
          </div>

          <nav className="space-y-1">
            {items.map((it) => (
              <NavLink
                key={it.key}
                to={it.to}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                {it.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 pt-4 border-t border-gray-100">
            <button
              onClick={onLogout}
              className="w-full text-left text-sm text-red-600 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={onClose} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white p-6 border-r border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Smart Travel</h2>
              <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100">✕</button>
            </div>
            <nav className="space-y-1">
              {items.map((it) => (
                <NavLink
                  key={it.key}
                  to={it.to}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm font-medium ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  {it.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-8 pt-4 border-t border-gray-100">
              <button onClick={onLogout} className="w-full text-left text-sm text-red-600 hover:text-red-700">Logout</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
