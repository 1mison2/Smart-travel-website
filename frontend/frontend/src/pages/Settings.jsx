import React from "react";
import { Link } from "react-router-dom";
import ProfileSettings from "../components/ProfileSettings";

export default function Settings() {
  return (
    <div className="travel-shell">
      <div className="travel-container" style={{ maxWidth: 1100 }}>
        <header className="travel-hero settings-hero">
          <div>
            <p className="travel-kicker">Settings</p>
            <h1 className="travel-title">Account settings</h1>
            <p className="travel-subtitle">Update your profile, security preferences, and notifications.</p>
          </div>
          <div className="settings-hero__actions">
            <Link to="/profile" className="travel-btn travel-btn-soft">
              View Profile
            </Link>
            <Link to="/dashboard" className="travel-btn travel-btn-primary">
              Back to dashboard
            </Link>
          </div>
        </header>

        <div className="settings-card">
          <ProfileSettings />
        </div>
      </div>

      <style>{`
        .settings-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .settings-hero__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .settings-card {
          margin-top: 16px;
        }

        @media (max-width: 720px) {
          .settings-hero {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
