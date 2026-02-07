import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Users, Mountain, Sparkles, Compass, Clock, Search, Bell, User, LogOut, Settings, UserCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const displayName = user?.name || user?.fullName || "Traveler";

  const upcomingTrip = {
    destination: "Pokhara",
    dates: "Mar 12 - Mar 17, 2026",
    travelType: "Friends",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  };

  const itineraryDays = [
    { day: "Day 1", title: "Lakeside stroll + Phewa Tal boating", location: "Pokhara" },
    { day: "Day 2", title: "Sarangkot sunrise + paragliding", location: "Pokhara" },
    { day: "Day 3", title: "Peace Pagoda + local food tour", location: "Pokhara" },
  ];

  const popularDestinations = [
    {
      id: 1,
      name: "Kathmandu",
      tag: "Culture & Heritage",
      image:
        "https://images.unsplash.com/photo-1565771085512-35b4f0c5f3f8?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: 2,
      name: "Pokhara",
      tag: "Lakes & Adventure",
      image:
        "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: 3,
      name: "Chitwan",
      tag: "Wildlife Safari",
      image:
        "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: 4,
      name: "Lumbini",
      tag: "Spiritual Journey",
      image:
        "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: 5,
      name: "Everest Region",
      tag: "Trekking",
      image:
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: 6,
      name: "Mustang",
      tag: "Culture & Landscape",
      image:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  const tripHistory = [
    { id: 1, destination: "Kathmandu", date: "Nov 2025" },
    { id: 2, destination: "Chitwan", date: "Sep 2025" },
    { id: 3, destination: "Lumbini", date: "Jun 2025" },
  ];

  const travelBuddies = [
    { id: 1, name: "Aarav", destination: "Everest Region", dates: "Apr 10 - Apr 18" },
    { id: 2, name: "Maya", destination: "Mustang", dates: "May 02 - May 08" },
    { id: 3, name: "Rinzin", destination: "Pokhara", dates: "Mar 14 - Mar 18" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <div className="dashboard__bg" />

      <div className="dashboard__container">
        <div className="dashboard__topbar">
          <div className="topbar__brand">
            <Mountain size={22} />
            <span>Smart Travel Nepal</span>
          </div>

          <nav className="topbar__menu" aria-label="Primary">
            <button type="button" className="topbar__link">Dashboard</button>
            <button type="button" className="topbar__link">Destinations</button>
            <button type="button" className="topbar__link">My Trips</button>
            <button type="button" className="topbar__link">Community</button>
          </nav>

          <div className="topbar__search">
            <Search size={18} />
            <input type="text" placeholder="Search destinations in Nepal" />
          </div>

          <div className="topbar__actions">
            <button type="button" className="icon-btn" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <div className="profile">
              <button
                type="button"
                className="icon-btn"
                aria-label="Profile"
                onClick={() => setShowProfileMenu((prev) => !prev)}
              >
                <User size={18} />
              </button>
              {showProfileMenu && (
                <div className="profile__menu">
                  <div className="profile__header">
                    <div className="profile__avatar" aria-hidden>
                      <UserCircle size={28} />
                    </div>
                    <div>
                      <p className="profile__name">{displayName}</p>
                      <p className="profile__email">{user?.email || "traveler@smarttravel.com"}</p>
                    </div>
                  </div>
                  <button type="button" className="profile__item">
                    <User size={16} />
                    View Profile
                  </button>
                  <button type="button" className="profile__item">
                    <Settings size={16} />
                    Settings
                  </button>
                  <div className="profile__meta">
                    <p>Membership: Explorer</p>
                    <p>Next trip: Pokhara</p>
                  </div>
                  <button type="button" className="profile__item profile__logout" onClick={handleLogout}>
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <header className="dashboard__header">
          <div>
            <p className="dashboard__kicker">Smart Travel Nepal</p>
            <h1 className="dashboard__title">
              Namaste, {displayName} <span aria-hidden>👋</span>
            </h1>
            <p className="dashboard__subtitle">Ready for your next journey in Nepal?</p>
          </div>

          <div className="dashboard__badges">
            <div className="dashboard__badge">
              <Clock size={16} />
              <span>Next Trip In</span>
              <strong>12 days</strong>
            </div>
            <div className="dashboard__badge">
              <Compass size={16} />
              <span>Trips Planned</span>
              <strong>4</strong>
            </div>
          </div>
        </header>

        <div className="dashboard__grid">
          <main className="dashboard__main">
            <section className="card card--featured">
              <div className="card__header">
                <div className="card__title">
                  <Mountain size={20} />
                  <h2>Upcoming Trip</h2>
                </div>
                <span className="card__pill">Primary Focus</span>
              </div>

              {upcomingTrip ? (
                <div className="trip">
                  <div className="trip__image">
                    <img src={upcomingTrip.image} alt={upcomingTrip.destination} />
                  </div>
                  <div className="trip__info">
                    <h3>{upcomingTrip.destination}</h3>
                    <p>
                      <Calendar size={16} /> {upcomingTrip.dates}
                    </p>
                    <p>
                      <Users size={16} /> {upcomingTrip.travelType}
                    </p>
                    <div className="trip__actions">
                      <button className="btn btn--primary">View Itinerary</button>
                      <button className="btn btn--ghost">Edit Trip</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty">
                  No upcoming trips — start planning your Nepal adventure <span aria-hidden>🇳🇵</span>
                </div>
              )}
            </section>

            <section className="card">
              <div className="card__header">
                <div className="card__title">
                  <Sparkles size={20} />
                  <h2>Current Itinerary</h2>
                </div>
                <span className="card__pill card__pill--soft">AI Crafted</span>
              </div>

              <div className="itinerary">
                {itineraryDays.map((item) => (
                  <div key={item.day} className="itinerary__day">
                    <div className="itinerary__badge">{item.day}</div>
                    <div>
                      <p className="itinerary__title">{item.title}</p>
                      <p className="itinerary__meta">
                        <MapPin size={14} /> {item.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card__actions">
                <button className="btn btn--primary">View Full Itinerary</button>
                <button className="btn btn--ghost">Regenerate with AI</button>
              </div>
            </section>

            <section className="card">
              <div className="card__header">
                <div className="card__title">
                  <Compass size={20} />
                  <h2>Popular Destinations in Nepal</h2>
                </div>
                <span className="card__pill card__pill--soft">Explore</span>
              </div>

              <div className="destinations">
                {popularDestinations.map((destination) => (
                  <article key={destination.id} className="destination">
                    <div className="destination__image">
                      <img src={destination.image} alt={destination.name} />
                    </div>
                    <div className="destination__content">
                      <div>
                        <h3>{destination.name}</h3>
                        <p>{destination.tag}</p>
                      </div>
                      <button className="btn btn--ghost">Plan Trip</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>

          <aside className="dashboard__sidebar">
            <section className="card">
              <div className="card__header">
                <div className="card__title">
                  <Calendar size={20} />
                  <h2>Trip History</h2>
                </div>
              </div>
              <div className="history">
                {tripHistory.map((trip) => (
                  <div key={trip.id} className="history__item">
                    <div>
                      <p className="history__name">{trip.destination}</p>
                      <p className="history__date">{trip.date}</p>
                    </div>
                    <span className="history__tag">Completed</span>
                  </div>
                ))}
              </div>
              <button className="btn btn--ghost btn--full">View Full History</button>
            </section>

            <section className="card">
              <div className="card__header">
                <div className="card__title">
                  <Users size={20} />
                  <h2>Travel Buddies</h2>
                </div>
              </div>

              <div className="buddies">
                {travelBuddies.map((buddy) => (
                  <div key={buddy.id} className="buddy">
                    <div className="buddy__avatar" aria-hidden />
                    <div>
                      <p className="buddy__name">{buddy.name}</p>
                      <p className="buddy__meta">
                        {buddy.destination} · {buddy.dates}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn--primary btn--full">Find Buddies</button>
              <p className="trust">Verified Travelers Only</p>
            </section>
          </aside>
        </div>
      </div>

      <style>{`
        :root {
          --sky: #8ec5ff;
          --sky-deep: #5aa7ff;
          --forest: #1f6f5b;
          --snow: #f6f8fb;
          --ink: #1f2937;
          --muted: #6b7280;
          --card: #ffffff;
          --shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
        }

        .dashboard {
          min-height: 100vh;
          background: radial-gradient(circle at top left, #e8f3ff 0%, #f7fafc 45%, #eef7f2 100%);
          font-family: "Plus Jakarta Sans", "Sora", "DM Sans", system-ui, sans-serif;
          color: var(--ink);
          position: relative;
          overflow: hidden;
        }

        .dashboard__bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 10%, rgba(142, 197, 255, 0.35), transparent 45%),
            radial-gradient(circle at 80% 0%, rgba(31, 111, 91, 0.2), transparent 40%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.3));
          pointer-events: none;
        }

        .dashboard__container {
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px 60px;
        }

        .dashboard__topbar {
          position: sticky;
          top: 16px;
          z-index: 5;
          display: grid;
          grid-template-columns: auto 1fr minmax(220px, 320px) auto;
          align-items: center;
          gap: 18px;
          padding: 14px 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: var(--shadow);
          border: 1px solid rgba(148, 163, 184, 0.2);
          margin-bottom: 28px;
          backdrop-filter: blur(12px);
        }

        .topbar__brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          color: var(--forest);
          white-space: nowrap;
        }

        .topbar__menu {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .topbar__link {
          background: transparent;
          border: none;
          color: var(--ink);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 999px;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .topbar__link:hover {
          background: rgba(90, 167, 255, 0.15);
          color: var(--sky-deep);
        }

        .topbar__search {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--snow);
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .topbar__search input {
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          font-size: 0.9rem;
          color: var(--ink);
        }

        .topbar__actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .profile {
          position: relative;
        }

        .profile__menu {
          position: absolute;
          right: 0;
          top: 48px;
          width: 240px;
          background: white;
          border-radius: 18px;
          box-shadow: var(--shadow);
          border: 1px solid rgba(148, 163, 184, 0.2);
          padding: 14px;
          display: grid;
          gap: 10px;
          z-index: 20;
        }

        .profile__header {
          display: flex;
          gap: 10px;
          align-items: center;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }

        .profile__avatar {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: var(--snow);
          color: var(--forest);
        }

        .profile__name {
          margin: 0;
          font-weight: 600;
        }

        .profile__email {
          margin: 2px 0 0;
          font-size: 0.78rem;
          color: var(--muted);
        }

        .profile__item {
          background: var(--snow);
          border: none;
          border-radius: 12px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--ink);
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .profile__item:hover {
          background: rgba(90, 167, 255, 0.15);
          transform: translateY(-1px);
        }

        .profile__meta {
          font-size: 0.8rem;
          color: var(--muted);
          display: grid;
          gap: 4px;
          padding: 4px 2px;
        }

        .profile__logout {
          background: rgba(239, 68, 68, 0.1);
          color: #b91c1c;
        }

        .icon-btn {
          border: none;
          background: var(--snow);
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          cursor: pointer;
          color: var(--ink);
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .icon-btn:hover {
          transform: translateY(-2px);
          background: rgba(90, 167, 255, 0.18);
        }

        .dashboard__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 28px;
        }

        .dashboard__kicker {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.72rem;
          color: var(--forest);
          font-weight: 600;
          margin-bottom: 6px;
        }

        .dashboard__title {
          font-size: clamp(2rem, 3vw, 2.75rem);
          margin: 0 0 6px;
          font-weight: 700;
        }

        .dashboard__subtitle {
          color: var(--muted);
          margin: 0;
          font-size: 1rem;
        }

        .dashboard__badges {
          display: grid;
          gap: 12px;
          min-width: 220px;
        }

        .dashboard__badge {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 16px;
          padding: 12px 14px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 10px;
          align-items: center;
          box-shadow: var(--shadow);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .dashboard__badge span {
          font-size: 0.85rem;
          color: var(--muted);
        }

        .dashboard__badge strong {
          font-size: 0.95rem;
          color: var(--ink);
        }

        .dashboard__grid {
          display: grid;
          grid-template-columns: 2.3fr 1fr;
          gap: 24px;
        }

        .dashboard__main {
          display: grid;
          gap: 24px;
        }

        .dashboard__sidebar {
          display: grid;
          gap: 24px;
        }

        .card {
          background: var(--card);
          border-radius: 24px;
          padding: 24px;
          box-shadow: var(--shadow);
          border: 1px solid rgba(226, 232, 240, 0.8);
        }

        .card--featured {
          border: 1px solid rgba(90, 167, 255, 0.4);
          box-shadow: 0 22px 50px rgba(90, 167, 255, 0.2);
        }

        .card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .card__title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.1rem;
        }

        .card__title h2 {
          margin: 0;
          font-size: 1.15rem;
        }

        .card__pill {
          background: rgba(31, 111, 91, 0.12);
          color: var(--forest);
          font-size: 0.75rem;
          padding: 6px 12px;
          border-radius: 999px;
          font-weight: 600;
        }

        .card__pill--soft {
          background: rgba(90, 167, 255, 0.12);
          color: var(--sky-deep);
        }

        .trip {
          display: grid;
          grid-template-columns: 1.2fr 1.4fr;
          gap: 18px;
          align-items: center;
        }

        .trip__image {
          border-radius: 20px;
          overflow: hidden;
          height: 190px;
        }

        .trip__image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .trip__image:hover img {
          transform: scale(1.05);
        }

        .trip__info h3 {
          margin: 0 0 10px;
          font-size: 1.4rem;
        }

        .trip__info p {
          margin: 0 0 8px;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
        }

        .trip__actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        .itinerary {
          display: grid;
          gap: 12px;
        }

        .itinerary__day {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 12px;
          padding: 12px;
          border-radius: 16px;
          background: var(--snow);
        }

        .itinerary__badge {
          background: rgba(90, 167, 255, 0.15);
          color: var(--sky-deep);
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 0.8rem;
          height: fit-content;
        }

        .itinerary__title {
          font-weight: 600;
          margin: 0 0 4px;
        }

        .itinerary__meta {
          margin: 0;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
        }

        .card__actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .destinations {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .destination {
          background: var(--snow);
          border-radius: 18px;
          overflow: hidden;
          display: grid;
          grid-template-rows: 120px 1fr;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .destination:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.12);
        }

        .destination__image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .destination__content {
          padding: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .destination__content h3 {
          margin: 0;
          font-size: 1rem;
        }

        .destination__content p {
          margin: 4px 0 0;
          font-size: 0.8rem;
          color: var(--muted);
        }

        .history {
          display: grid;
          gap: 12px;
        }

        .history__item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: var(--snow);
          border-radius: 14px;
        }

        .history__name {
          margin: 0;
          font-weight: 600;
        }

        .history__date {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 0.85rem;
        }

        .history__tag {
          background: rgba(31, 111, 91, 0.15);
          color: var(--forest);
          font-size: 0.75rem;
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 600;
        }

        .buddies {
          display: grid;
          gap: 12px;
          margin-bottom: 16px;
        }

        .buddy {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--snow);
          border-radius: 14px;
          padding: 10px 12px;
        }

        .buddy__avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--sky) 0%, var(--forest) 100%);
        }

        .buddy__name {
          margin: 0;
          font-weight: 600;
        }

        .buddy__meta {
          margin: 2px 0 0;
          font-size: 0.8rem;
          color: var(--muted);
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 10px 16px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .btn--primary {
          background: linear-gradient(135deg, var(--sky-deep), var(--forest));
          color: white;
          box-shadow: 0 12px 20px rgba(31, 111, 91, 0.2);
        }

        .btn--primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 25px rgba(31, 111, 91, 0.25);
        }

        .btn--ghost {
          background: white;
          color: var(--forest);
          border: 1px solid rgba(31, 111, 91, 0.2);
        }

        .btn--ghost:hover {
          background: rgba(31, 111, 91, 0.08);
        }

        .btn--full {
          width: 100%;
          margin-top: 8px;
        }

        .trust {
          margin: 10px 0 0;
          color: var(--muted);
          font-size: 0.8rem;
          text-align: center;
        }

        .empty {
          padding: 18px;
          border-radius: 16px;
          background: var(--snow);
          color: var(--muted);
          font-weight: 500;
        }

        @media (max-width: 1024px) {
          .dashboard__topbar {
            grid-template-columns: 1fr;
            border-radius: 24px;
          }

          .topbar__menu {
            order: 3;
          }

          .topbar__search {
            order: 2;
            width: 100%;
          }

          .dashboard__grid {
            grid-template-columns: 1fr;
          }

          .dashboard__header {
            flex-direction: column;
          }

          .destinations {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .trip {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .destinations {
            grid-template-columns: 1fr;
          }

          .dashboard__badges {
            width: 100%;
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
