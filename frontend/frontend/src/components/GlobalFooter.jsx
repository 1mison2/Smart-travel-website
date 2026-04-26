import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HIDE_ON_PATHS = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/map-explorer"]);

export default function GlobalFooter() {
  const location = useLocation();
  const { user } = useAuth();

  const contact = {
    email: "support@smarttravelnepal.com",
    phone: "+977-9800000000",
    address: "Kathmandu, Nepal",
  };

  if (location.pathname.startsWith("/admin")) return null;
  if (location.pathname.startsWith("/buddy")) return null;
  if (location.pathname.startsWith("/community")) return null;
  if (HIDE_ON_PATHS.has(location.pathname)) return null;

  return (
    <>
      <footer className="global-footer">
        <div className="global-footer__inner">
          <div className="global-footer__brand">
            <strong>Smart Travel Nepal</strong>
            <span>Explore destinations, plan trips, and book with confidence.</span>
          </div>

          <div className="global-footer__grid">
            <div className="global-footer__section">
              <p className="global-footer__heading">Quick Links</p>
              <div className="global-footer__links">
                <Link to={user ? "/explore" : "/login"}>Explore</Link>
                <Link to={user ? "/trip-packages" : "/login"}>Trip Packages</Link>
                <Link to={user ? "/itinerary-planner" : "/login"}>AI Planner</Link>
                <Link to={user ? "/community" : "/login"}>Community</Link>
              </div>
            </div>

            <div className="global-footer__section">
              <p className="global-footer__heading">Contact</p>
              <div className="global-footer__contact">
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
                <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}>{contact.phone}</a>
                <span>{contact.address}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .global-footer {
          margin-top: 28px;
          padding: 0 18px 28px;
        }

        .global-footer__inner {
          max-width: 1260px;
          margin: 0 auto;
          padding: 22px 24px;
          border-radius: 28px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(241,245,249,0.88));
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          font-family: "Plus Jakarta Sans", "Sora", system-ui, sans-serif;
        }

        .global-footer__brand strong {
          display: block;
          color: #10213b;
          font-size: 1rem;
        }

        .global-footer__brand span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 0.88rem;
        }

        .global-footer__grid {
          display: flex;
          align-items: flex-start;
          gap: 32px;
          flex-wrap: wrap;
        }

        .global-footer__section {
          min-width: 190px;
        }

        .global-footer__heading {
          margin: 0 0 10px;
          color: #0f766e;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .global-footer__links {
          display: grid;
          gap: 8px;
        }

        .global-footer__links a,
        .global-footer__contact a,
        .global-footer__contact span {
          color: #1e3a5f;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.94rem;
        }

        .global-footer__contact {
          display: grid;
          gap: 8px;
        }

        @media (max-width: 720px) {
          .global-footer__inner {
            flex-direction: column;
            align-items: flex-start;
          }

          .global-footer__grid {
            width: 100%;
            gap: 20px;
          }
        }
      `}</style>
    </>
  );
}
