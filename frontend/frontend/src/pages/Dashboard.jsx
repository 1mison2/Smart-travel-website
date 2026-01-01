import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import DashboardCard from "../components/DashboardCard";
import UpcomingTripCard from "../components/UpcomingTripCard";
import RightSummaryCard from "../components/RightSummaryCard";
import ItineraryItem from "../components/ItineraryItem";
import AIItineraryCard from "../components/AIItineraryCard";
import TripHistory from "../components/TripHistory";
import BuddiesList from "../components/BuddiesList";
import StatSparkline from "../components/StatSparkline";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [lastItinerary, setLastItinerary] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/auth/me");
        setProfile(res.data.user);

        // fetch or use dummy content
        try {
          const r1 = await api.get('/api/user/stats');
          setStats(r1.data);
        } catch (e) {
          console.warn('Could not load /api/user/stats', e);
          setStats({ upcoming: 2, bookings: 7, budgetUsed: '$1,420', buddies: 3 });
        }

        try {
          const r2 = await api.get('/api/user/recent-trips');
          setRecentTrips(r2.data.trips.map(t => ({ id: t._id, title: t.title, date: new Date(t.startDate).toLocaleDateString(), price: `$${t.price}` })));
        } catch (e) {
          console.warn('Could not load /api/user/recent-trips', e);
          setRecentTrips([
            { id: 1, title: 'Weekend in Lisbon', date: '2025-11-08', price: '$420' },
            { id: 2, title: 'Kyoto Cultural Tour', date: '2025-09-12', price: '$980' },
            { id: 3, title: 'Patagonia Adventure', date: '2025-07-03', price: '$1,400' }
          ]);
        }

        // dummy trip history and buddies
        setTripHistory([
          { id: 't1', title: 'Lisbon Getaway', date: '2025-11-08', price: '$420', status: 'Completed' },
          { id: 't2', title: 'Kyoto Cultural Tour', date: '2025-09-12', price: '$980', status: 'Completed' },
          { id: 't3', title: 'Patagonia', date: '2025-07-03', price: '$1,400', status: 'Completed' },
        ]);

        setBuddies([
          { id: 'b1', name: 'Alice', mutual: 2 },
          { id: 'b2', name: 'Bob', mutual: 1 },
          { id: 'b3', name: 'Carlos', mutual: 0 }
        ]);

      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  function handleCreateItinerary() {
    setItineraryLoading(true);
    setTimeout(() => {
      const now = new Date();
      setLastItinerary({
        id: 'ai-1',
        summary: 'A 5-day balanced itinerary covering top sights, local dining and a relaxed day for shopping. Includes transport suggestions and estimated costs.',
        createdAt: now.toISOString()
      });
      setItineraryLoading(false);
    }, 1200);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar onLogout={logout} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1">
          <Navbar user={profile || user} onToggleSidebar={() => setSidebarOpen((v) => !v)} onLogout={logout} />
          <div className="px-4 sm:px-6 lg:px-8">

            <main className="max-w-7xl mx-auto p-6 lg:p-8">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">Welcome back, {profile?.name || user?.name}</h1>
                      <p className="text-sm text-gray-500 mt-1">Manage your upcoming trips, generate AI itineraries and connect with travel buddies.</p>
                    </div>

                    <div className="flex gap-3 items-center flex-shrink-0">
                      <button onClick={handleCreateItinerary} className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm text-sm hover:bg-blue-700 transform-gpu hover:-translate-y-0.5 transition-all">Create AI Itinerary</button>
                      <button onClick={() => window.location.href = '/buddy'} className="bg-white border border-gray-200 px-4 py-2 rounded-md text-sm hover:shadow-sm">Find Travel Buddy</button>
                      <button onClick={() => window.location.href = '/trips'} className="bg-blue-50 border border-gray-200 px-4 py-2 rounded-md text-sm hover:bg-blue-100">Book a Trip</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {stats ? (
                      <>
                        <DashboardCard title="Upcoming Trips" value={stats.upcoming ?? '—'} icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18" /></svg>} onClick={() => setSelectedCard('Upcoming Trips')} />
                        <DashboardCard title="Total Bookings" value={stats.bookings ?? '—'} icon={<svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg>} onClick={() => setSelectedCard('Total Bookings')} />
                        <DashboardCard title="Budget Used" value={stats.budgetUsed ?? '—'} icon={<div className="w-20 -mr-4"><StatSparkline data={[200,300,250,420,380]} /></div>} onClick={() => setSelectedCard('Budget Used')} />
                        <DashboardCard title="Travel Buddies" value={stats.buddies ?? '—'} icon={<svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.37 0 4.59.53 6.879 1.502M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} onClick={() => setSelectedCard('Travel Buddies')} />
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-white rounded-2xl animate-pulse h-24" />
                        <div className="p-4 bg-white rounded-2xl animate-pulse h-24" />
                        <div className="p-4 bg-white rounded-2xl animate-pulse h-24" />
                        <div className="p-4 bg-white rounded-2xl animate-pulse h-24" />
                      </>
                    )}
                  </div>

                  <AIItineraryCard loading={itineraryLoading} lastItinerary={lastItinerary} onCreate={handleCreateItinerary} />

                  <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Trips</h2>
                    {recentTrips.length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {recentTrips.map((t) => (
                          <UpcomingTripCard key={t.id} trip={t} />
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm text-center text-gray-500">No upcoming trips — start by planning a trip with the AI Itinerary Generator.</div>
                    )}
                  </section>

                  <section className="mt-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Itinerary</h2>
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {recentTrips.map((t) => (
                          <div key={t.id} className="flex items-start">
                            <ItineraryItem title={t.title} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-4">
                  {selectedCard ? (
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-md">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-ink">{selectedCard}</h3>
                          <p className="text-sm text-gray-600 mt-1">Quick details for <strong>{selectedCard}</strong>. Click other cards to switch.</p>
                        </div>
                        <button onClick={() => setSelectedCard(null)} className="text-sm text-gray-400">Close</button>
                      </div>
                      <div className="mt-3 text-sm text-gray-700">
                        <p>Here you can see more details, quick actions and links related to <strong>{selectedCard}</strong>.</p>
                        <div className="mt-3 flex gap-2">
                          <button className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm">Open</button>
                          <button className="px-3 py-1 rounded-md border border-gray-200 text-sm">Export</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-md">
                      <h3 className="text-lg font-semibold text-ink">Overview</h3>
                      <p className="text-sm text-gray-600 mt-2">Select a stat card to view quick actions and more details here.</p>
                    </div>
                  )}

                  <TripHistory trips={tripHistory} onView={(t) => alert(`Viewing ${t.title}`)} />
                  <BuddiesList buddies={buddies} onFind={() => window.location.href = '/buddy'} />

                  <RightSummaryCard title="Quick Links" items={["Invoices","Saved Plans","Support"]} ctaText="Open" onCta={() => window.location.href='/settings'} />
                </div>

              </div>
            </main>

          </div>
        </div>
      </div>
    </div>
  );
}
