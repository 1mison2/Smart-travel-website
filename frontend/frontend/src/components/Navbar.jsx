import React, { useState, useRef, useEffect } from 'react';

export default function Navbar({ user, onToggleSidebar, onLogout }) {
  const [showNotif, setShowNotif] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    function onDoc(e) {
      if (!menuRef.current?.contains(e.target)) {
        setShowMenu(false);
        setShowNotif(false);
      }
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <header className="w-full bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
              onClick={onToggleSidebar}
              aria-label="Open sidebar"
            >
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="hidden sm:flex sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">ST</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Smart Travel</h3>
                  <p className="text-xs text-gray-500">AI-powered travel planning</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4" ref={menuRef}>
            <div className="relative">
              <button onClick={() => setShowNotif((s) => !s)} aria-expanded={showNotif} className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300" aria-label="Notifications">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">3</span>
              </button>
              {showNotif && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-100 rounded-lg shadow-lg p-3 z-20">
                  <div className="text-sm text-gray-700">New notifications</div>
                  <ul className="mt-2 space-y-2 text-xs text-gray-500">
                    <li>✈️ Your booking for Lisbon is confirmed</li>
                    <li>🧭 New buddy match found: Alice</li>
                    <li>🔔 AI itinerary ready for 'Kyoto Cultural Tour'</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setShowMenu((s) => !s)} className="flex items-center gap-3">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=2563eb&color=fff&size=128`}
                  alt="profile"
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-100"
                />
                <span className="hidden sm:inline text-sm font-medium text-gray-700">{user?.name}</span>
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-lg shadow-lg p-2 z-20">
                  <button className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Profile</button>
                  <button className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Settings</button>
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={onLogout} className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50">Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
