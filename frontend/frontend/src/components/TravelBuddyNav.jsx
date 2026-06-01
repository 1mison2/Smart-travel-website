import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Compass, LayoutDashboard, MessageCircleMore, NotebookPen, Sparkles, Users } from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/buddy-finder", label: "Hub", icon: Users },
  { to: "/buddy/create-trip", label: "Create Trip", icon: NotebookPen },
  { to: "/buddy/browse", label: "Browse Trips", icon: Compass },
  { to: "/buddy/matches", label: "Matches", icon: Sparkles },
  { to: "/buddy/requests", label: "Requests", icon: MessageCircleMore },
];

export default function TravelBuddyNav() {
  const location = useLocation();
  const isActiveLink = (to) => {
    if (to === "/buddy-finder") return location.pathname === "/buddy-finder" || location.pathname === "/community";
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <div className="travel-social-nav">
      <div className="travel-social-nav__row">
        {links.map((link) => {
          const active = isActiveLink(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`travel-social-nav__pill ${active ? "travel-social-nav__pill--active" : ""}`}
            >
              <link.icon size={16} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>

      <style>{`
        .travel-social-nav {
          position: relative;
          z-index: 2;
          margin-bottom: 18px;
          padding-top: 4px;
        }

        .travel-social-nav__row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          padding: 10px;
          border-radius: 22px;
          background: linear-gradient(135deg, #0f172a, #102f3a);
          border: 1px solid rgba(20, 184, 166, 0.22);
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.18);
          backdrop-filter: blur(18px);
        }

        .travel-social-nav__pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border: none;
          border-radius: 999px;
          color: rgba(255,255,255,0.78);
          font-size: 0.88rem;
          font-weight: 700;
          text-decoration: none;
          background: rgba(255,255,255,0.06);
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
          border: 1px solid transparent;
        }

        .travel-social-nav__pill:hover {
          background: rgba(20, 184, 166, 0.13);
          color: #ffffff;
          transform: translateY(-1px);
          border-color: rgba(14, 165, 233, 0.18);
        }

        .travel-social-nav__pill--active {
          background: linear-gradient(135deg, #0f766e, #22c55e);
          color: #ffffff;
          box-shadow: 0 12px 26px rgba(20, 184, 166, 0.22);
        }

        @media (max-width: 640px) {
          .travel-social-nav__row {
            gap: 8px;
            padding: 9px;
          }

          .travel-social-nav__pill {
            padding: 9px 12px;
            font-size: 0.82rem;
          }
        }
      `}</style>
    </div>
  );
}
