import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ArrowLeft, Compass, LayoutDashboard, MessageCircleMore, NotebookPen, Sparkles, Users } from "lucide-react";

const links = [
  { to: "/buddy-finder", label: "Hub", icon: Users },
  { to: "/buddy/create-trip", label: "Create Trip", icon: NotebookPen },
  { to: "/buddy/browse", label: "Browse Trips", icon: Compass },
  { to: "/buddy/matches", label: "Matches", icon: Sparkles },
  { to: "/buddy/requests", label: "Requests", icon: MessageCircleMore },
];

export default function TravelBuddyNav() {
  const navigate = useNavigate();

  return (
    <div className="travel-social-nav">
      <div className="travel-social-nav__row">
        <button type="button" className="travel-social-nav__pill travel-social-nav__pill--utility" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button
          type="button"
          className="travel-social-nav__pill travel-social-nav__pill--utility travel-social-nav__pill--primary"
          onClick={() => navigate("/dashboard")}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </button>

        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `travel-social-nav__pill ${isActive ? "travel-social-nav__pill--active" : ""}`
            }
          >
            <link.icon size={16} />
            <span>{link.label}</span>
          </NavLink>
        ))}
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
          padding: 9px;
          border-radius: 20px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.86));
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(18px);
        }

        .travel-social-nav__pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border: none;
          border-radius: 999px;
          color: #334155;
          font-size: 0.88rem;
          font-weight: 700;
          text-decoration: none;
          background: rgba(255,255,255,0.55);
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
          border: 1px solid transparent;
        }

        .travel-social-nav__pill:hover {
          background: rgba(14, 165, 233, 0.08);
          color: #0369a1;
          transform: translateY(-1px);
          border-color: rgba(14, 165, 233, 0.18);
        }

        .travel-social-nav__pill--active {
          background: linear-gradient(135deg, #0f172a, #0f766e);
          color: #ffffff;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.16);
        }

        .travel-social-nav__pill--utility {
          background: rgba(255,255,255,0.9);
          border-color: rgba(148, 163, 184, 0.18);
        }

        .travel-social-nav__pill--primary {
          background: linear-gradient(135deg, #ff6f61, #e25a4f);
          color: #ffffff;
          box-shadow: 0 12px 26px rgba(226, 90, 79, 0.18);
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
