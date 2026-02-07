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
    <header className="w-full bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={onToggleSidebar}
              aria-label="Open sidebar"
            >
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="hidden sm:flex sm:items-center sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">ST</div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Smart Travel</h3>
                  <p className="text-xs text-gray-500 font-medium">AI-powered travel planning</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4" ref={menuRef}>
            <div className="relative">
              <button onClick={() => setShowNotif((s) => !s)} aria-expanded={showNotif} className="relative p-2 rounded-xl hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 transition-all" aria-label="Notifications">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg">3</span>
              </button>
              {showNotif && (
                <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-lg border border-gray-100 rounded-xl shadow-xl p-4 z-50">
                  <div className="text-sm font-semibold text-gray-900 mb-3">Notifications</div>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-sm">
                      <span className="text-blue-500 mt-0.5">✈️</span>
                      <div>
                        <p className="text-gray-900 font-medium">Booking Confirmed</p>
                        <p className="text-gray-500 text-xs">Your trip to Lisbon is confirmed</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="text-green-500 mt-0.5">🧭</span>
                      <div>
                        <p className="text-gray-900 font-medium">New Buddy Match</p>
                        <p className="text-gray-500 text-xs">Alice wants to travel with you</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="text-purple-500 mt-0.5">🔔</span>
                      <div>
                        <p className="text-gray-900 font-medium">AI Itinerary Ready</p>
                        <p className="text-gray-500 text-xs">Kyoto Cultural Tour plan is ready</p>
                      </div>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setShowMenu((s) => !s)} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-all">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=667eea&color=fff&size=128`}
                  alt="profile"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 shadow-sm"
                />
                <span className="hidden sm:inline text-sm font-semibold text-gray-700">{user?.name}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-lg border border-gray-100 rounded-xl shadow-xl p-2 z-50">
                  <button className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">Profile</button>
                  <button className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">Settings</button>
                  <div className="border-t border-gray-100 my-2" />
                  <button onClick={onLogout} className="block w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
