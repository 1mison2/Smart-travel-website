import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const features = [
    { title: "AI Itinerary Generator", text: "Personalized routes crafted for Nepal’s terrain." },
    { title: "Travel Buddy Finder", text: "Match with verified travelers on similar dates." },
    { title: "Smart Booking", text: "Compare stays, rides, and local guides in one flow." },
  ];

  const destinations = [
    { name: "Kathmandu", tag: "Culture & Heritage" },
    { name: "Pokhara", tag: "Lakes & Adventure" },
    { name: "Chitwan", tag: "Wildlife Safari" },
  ];

  return (
    <div className="home">
      <div className="home__bg" />

      <nav className="home__nav">
        <div className="home__brand">
          <span className="home__logo">ST</span>
          <span>Smart Travel Nepal</span>
        </div>
        <div className="home__nav-actions">
          <Link to="/login" className="home__link">Login</Link>
          <Link to="/signup" className="home__cta">Sign Up</Link>
        </div>
      </nav>

      <header className="home__hero">
        <div className="home__hero-card">
          <p className="home__eyebrow">Nepal-focused smart travel planning</p>
          <h1>Where do you want to go in Nepal?</h1>
          <p className="home__subtitle">
            From Himalayan treks to peaceful lakes, build trips that fit your pace and budget.
          </p>
          <div className="home__search">
            <input type="text" placeholder="Search destinations, routes, or activities" />
            <button type="button">Search</button>
          </div>
          <div className="home__hero-actions">
            <Link to="/signup" className="home__primary">Plan Trip</Link>
            <Link to="/community" className="home__secondary">Find Buddy</Link>
          </div>
        </div>
      </header>

      <section className="home__section">
        <div className="home__section-title">
          <h2>Features</h2>
          <p>Built for final-year projects with real product polish.</p>
        </div>
        <div className="home__grid">
          {features.map((feature) => (
            <article key={feature.title} className="home__card">
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home__section home__section--alt">
        <div className="home__section-title">
          <h2>Popular Destinations</h2>
          <p>Discover the most loved places by Nepal travelers.</p>
        </div>
        <div className="home__destinations">
          {destinations.map((destination) => (
            <article key={destination.name} className="home__destination">
              <div className="home__destination-image" />
              <div className="home__destination-body">
                <h3>{destination.name}</h3>
                <p>{destination.tag}</p>
                <button type="button">Explore</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home__section">
        <div className="home__section-title">
          <h2>Community Highlights</h2>
          <p>Stories, photos, and local tips from verified explorers.</p>
        </div>
        <div className="home__community">
          <div className="home__community-card">Travel Blog</div>
          <div className="home__community-card">Travelers Photo</div>
        </div>
      </section>

      <footer className="home__footer">
        <div className="home__footer-links">
          <span>About Us</span>
          <span>Contact</span>
          <span>Terms</span>
        </div>
        <span>© 2026 Smart Travel Nepal</span>
      </footer>

      <style>{`
        :root {
          --sky: #8fc9ff;
          --sky-deep: #3b82f6;
          --forest: #1f6f5b;
          --snow: #f6f8fb;
          --ink: #0f172a;
          --muted: #64748b;
          --card: #ffffff;
          --shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
        }

        .home {
          min-height: 100vh;
          background: radial-gradient(circle at 10% 10%, #e2f1ff 0%, #f8fbff 45%, #eff7f2 100%);
          font-family: "Sora", "Plus Jakarta Sans", "DM Sans", system-ui, sans-serif;
          color: var(--ink);
          position: relative;
          overflow-x: hidden;
        }

        .home__bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 85% 0%, rgba(31, 111, 91, 0.18), transparent 35%),
            radial-gradient(circle at 0% 70%, rgba(143, 201, 255, 0.25), transparent 40%);
          pointer-events: none;
        }

        .home__nav {
          position: sticky;
          top: 0;
          z-index: 5;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 6vw;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }

        .home__brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          color: var(--forest);
          font-size: 1.1rem;
        }

        .home__logo {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--sky), var(--forest));
          color: white;
          display: grid;
          place-items: center;
          font-weight: 700;
        }

        .home__nav-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .home__link {
          color: var(--ink);
          text-decoration: none;
          font-weight: 600;
        }

        .home__cta {
          background: var(--forest);
          color: white;
          padding: 10px 18px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 600;
        }

        .home__hero {
          padding: 60px 6vw 40px;
          display: flex;
          justify-content: center;
        }

        .home__hero-card {
          background: var(--card);
          padding: 40px;
          border-radius: 28px;
          box-shadow: var(--shadow);
          max-width: 900px;
          width: 100%;
          text-align: center;
        }

        .home__eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--forest);
          font-size: 0.75rem;
          margin: 0 0 12px;
          font-weight: 600;
        }

        .home__hero h1 {
          font-size: clamp(2rem, 3vw, 3.2rem);
          margin: 0 0 12px;
        }

        .home__subtitle {
          margin: 0 0 22px;
          color: var(--muted);
          font-size: 1rem;
        }

        .home__search {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          background: var(--snow);
          border-radius: 999px;
          padding: 8px 10px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          margin-bottom: 18px;
        }

        .home__search input {
          border: none;
          background: transparent;
          outline: none;
          padding: 8px 12px;
          font-size: 0.95rem;
        }

        .home__search button {
          border: none;
          background: var(--sky-deep);
          color: white;
          padding: 10px 18px;
          border-radius: 999px;
          font-weight: 600;
          cursor: pointer;
        }

        .home__hero-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .home__primary,
        .home__secondary {
          padding: 10px 20px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 600;
        }

        .home__primary {
          background: linear-gradient(135deg, var(--sky-deep), var(--forest));
          color: white;
        }

        .home__secondary {
          background: white;
          color: var(--forest);
          border: 1px solid rgba(31, 111, 91, 0.2);
        }

        .home__section {
          padding: 40px 6vw;
        }

        .home__section--alt {
          background: rgba(255, 255, 255, 0.7);
          border-top: 1px solid rgba(148, 163, 184, 0.2);
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }

        .home__section-title {
          text-align: center;
          margin-bottom: 24px;
        }

        .home__section-title h2 {
          margin: 0 0 8px;
          font-size: 2rem;
        }

        .home__section-title p {
          margin: 0;
          color: var(--muted);
        }

        .home__grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }

        .home__card {
          background: var(--card);
          padding: 24px;
          border-radius: 20px;
          box-shadow: var(--shadow);
        }

        .home__card h3 {
          margin: 0 0 10px;
        }

        .home__card p {
          margin: 0;
          color: var(--muted);
        }

        .home__destinations {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }

        .home__destination {
          background: var(--card);
          border-radius: 22px;
          overflow: hidden;
          box-shadow: var(--shadow);
          display: grid;
        }

        .home__destination-image {
          height: 160px;
          background: linear-gradient(135deg, #cbe5ff, #b8e6d3);
        }

        .home__destination-body {
          padding: 18px;
          display: grid;
          gap: 6px;
        }

        .home__destination-body p {
          margin: 0;
          color: var(--muted);
          font-size: 0.9rem;
        }

        .home__destination-body button {
          justify-self: flex-start;
          border: none;
          background: rgba(59, 130, 246, 0.12);
          color: var(--sky-deep);
          padding: 6px 14px;
          border-radius: 999px;
          font-weight: 600;
          cursor: pointer;
        }

        .home__community {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }

        .home__community-card {
          background: var(--card);
          padding: 28px;
          border-radius: 22px;
          box-shadow: var(--shadow);
          text-align: center;
          font-weight: 600;
        }

        .home__footer {
          padding: 24px 6vw 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--muted);
          border-top: 1px solid rgba(148, 163, 184, 0.2);
          margin-top: 20px;
        }

        .home__footer-links {
          display: flex;
          gap: 16px;
          font-weight: 600;
          color: var(--ink);
        }

        @media (max-width: 900px) {
          .home__grid,
          .home__destinations {
            grid-template-columns: 1fr;
          }

          .home__community {
            grid-template-columns: 1fr;
          }

          .home__footer {
            flex-direction: column;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}
