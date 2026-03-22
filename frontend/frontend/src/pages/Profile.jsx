import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  const displayName = user?.name || user?.fullName || "Traveler";
  const email = user?.email || "traveler@smarttravel.com";
  const role = user?.role || "user";

  return (
    <div className="travel-shell">
      <div className="travel-container" style={{ maxWidth: 1000 }}>
        <header className="travel-hero profile-hero">
          <div>
            <p className="travel-kicker">Profile</p>
            <h1 className="travel-title">Your profile</h1>
            <p className="travel-subtitle">View your account details and membership info.</p>
          </div>
          <div className="profile-hero__actions">
            <Link to="/settings" className="travel-btn travel-btn-soft">
              Settings
            </Link>
            <Link to="/dashboard" className="travel-btn travel-btn-primary">
              Back to dashboard
            </Link>
          </div>
        </header>

        <section className="travel-card profile-card">
          <div className="profile-card__header">
            <div className="profile-card__avatar" aria-hidden>
              {displayName
                .split(" ")
                .map((part) => part[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <h2>{displayName}</h2>
              <p>{email}</p>
            </div>
          </div>

          <div className="profile-card__grid">
            <div>
              <span>Role</span>
              <strong>{role}</strong>
            </div>
            <div>
              <span>Member since</span>
              <strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US") : "-"}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{user?.isBlocked ? "Blocked" : "Active"}</strong>
            </div>
            <div>
              <span>Auth Provider</span>
              <strong>{user?.authProvider || "local"}</strong>
            </div>
          </div>

          <div className="profile-card__note">
            Profile editing is available in Settings.
          </div>
        </section>
      </div>

      <style>{`
        .profile-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .profile-hero__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .profile-card {
          margin-top: 16px;
          padding: 18px;
        }

        .profile-card__header {
          display: flex;
          gap: 14px;
          align-items: center;
        }

        .profile-card__avatar {
          width: 62px;
          height: 62px;
          border-radius: 16px;
          background: linear-gradient(135deg, #0f766e, #0284c7);
          color: #fff;
          display: grid;
          place-items: center;
          font-weight: 700;
          font-size: 1.2rem;
        }

        .profile-card__header h2 {
          margin: 0 0 6px;
          font-size: 1.4rem;
        }

        .profile-card__header p {
          margin: 0;
          color: #64748b;
        }

        .profile-card__grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .profile-card__grid span {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
        }

        .profile-card__grid strong {
          display: block;
          margin-top: 6px;
          font-size: 0.95rem;
          color: #0f172a;
        }

        .profile-card__note {
          margin-top: 16px;
          border-radius: 12px;
          border: 1px solid #dbe4ee;
          background: #f8fafc;
          padding: 12px;
          color: #475569;
        }

        @media (max-width: 900px) {
          .profile-card__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .profile-hero {
            flex-direction: column;
            align-items: flex-start;
          }

          .profile-card__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
