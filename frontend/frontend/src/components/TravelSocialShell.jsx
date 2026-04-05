import React from "react";
import { Link } from "react-router-dom";
import TravelBuddyNav from "./TravelBuddyNav";

const themeMap = {
  buddy: {
    shellClass: "travel-shell--buddy",
    badgeClass: "travel-shell__badge--buddy",
    statClass: "travel-shell__stat--buddy",
    panelClass: "travel-shell__panel--buddy",
  },
  community: {
    shellClass: "travel-shell--community",
    badgeClass: "travel-shell__badge--community",
    statClass: "travel-shell__stat--community",
    panelClass: "travel-shell__panel--community",
  },
};

export default function TravelSocialShell({
  theme = "buddy",
  badge,
  icon: Icon,
  title,
  description,
  stats = [],
  actions = [],
  children,
}) {
  const classes = themeMap[theme] || themeMap.buddy;

  return (
    <div className={`travel-shell ${classes.shellClass}`}>
      <div className="travel-shell__glow travel-shell__glow--one" />
      <div className="travel-shell__glow travel-shell__glow--two" />
      <div className="travel-shell__mesh" />

      <div className="travel-shell__container">
        <div className="travel-shell__header">
          <TravelBuddyNav />
          <section className={`travel-shell__panel ${classes.panelClass}`}>
            <div className="travel-shell__intro">
              <div className={`travel-shell__badge ${classes.badgeClass}`}>
                {Icon ? <Icon size={16} /> : null}
                <span>{badge}</span>
              </div>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>

            {(actions.length > 0 || stats.length > 0) && (
              <div className="travel-shell__meta">
                {actions.length > 0 && (
                  <div className="travel-shell__actions">
                    {actions.map((action) =>
                      action.to ? (
                        <Link
                          key={action.label}
                          to={action.to}
                          className={`travel-shell__action ${action.variant === "ghost" ? "travel-shell__action--ghost" : ""}`}
                        >
                          {action.icon ? <action.icon size={16} /> : null}
                          <span>{action.label}</span>
                        </Link>
                      ) : (
                        <button
                          key={action.label}
                          type="button"
                          onClick={action.onClick}
                          className={`travel-shell__action ${action.variant === "ghost" ? "travel-shell__action--ghost" : ""}`}
                        >
                          {action.icon ? <action.icon size={16} /> : null}
                          <span>{action.label}</span>
                        </button>
                      )
                    )}
                  </div>
                )}

                {stats.length > 0 && (
                  <div className="travel-shell__stats">
                    {stats.map((stat) => (
                      <article key={stat.label} className={`travel-shell__stat ${classes.statClass}`}>
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="travel-shell__body">{children}</div>
      </div>

      <style>{`
        .travel-shell {
          position: relative;
          min-height: 100vh;
          padding: 18px 16px 40px;
          overflow: hidden;
          background: #f8fafc;
        }

        .travel-shell--buddy {
          background:
            radial-gradient(circle at top left, rgba(14,165,233,0.14), transparent 24%),
            radial-gradient(circle at top right, rgba(34,197,94,0.09), transparent 22%),
            linear-gradient(180deg, #eef6ff 0%, #f8fafc 20%, #f8fafc 100%),
            #f8fafc;
        }

        .travel-shell--community {
          background:
            radial-gradient(circle at top left, rgba(16,185,129,0.12), transparent 22%),
            radial-gradient(circle at top right, rgba(14,165,233,0.14), transparent 22%),
            linear-gradient(180deg, #f2fbf7 0%, #f8fafc 22%, #f8fafc 100%),
            #f8fafc;
        }

        .travel-shell__mesh {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.2), transparent 38%);
          pointer-events: none;
        }

        .travel-shell__glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(70px);
          pointer-events: none;
        }

        .travel-shell__glow--one {
          top: 90px;
          left: -40px;
          width: 260px;
          height: 260px;
          background: rgba(14,165,233,0.14);
        }

        .travel-shell__glow--two {
          top: 160px;
          right: -40px;
          width: 320px;
          height: 320px;
          background: rgba(34,197,94,0.12);
        }

        .travel-shell__container {
          position: relative;
          z-index: 1;
          max-width: 1340px;
          margin: 0 auto;
        }

        .travel-shell__header {
          margin-bottom: 22px;
        }

        .travel-shell__panel {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
          gap: 20px;
          padding: 24px;
          border-radius: 28px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(18px);
        }

        .travel-shell__panel--buddy {
          background:
            radial-gradient(circle at top left, rgba(14,165,233,0.10), transparent 24%),
            linear-gradient(135deg, rgba(255,255,255,0.97), rgba(248,250,252,0.96));
        }

        .travel-shell__panel--community {
          background:
            radial-gradient(circle at top left, rgba(34,197,94,0.08), transparent 24%),
            linear-gradient(135deg, rgba(255,255,255,0.97), rgba(248,250,252,0.96));
        }

        .travel-shell__intro h1 {
          margin: 14px 0 0;
          font-size: clamp(1.95rem, 3vw, 3.1rem);
          line-height: 1.02;
          color: #0f172a;
        }

        .travel-shell__intro p {
          margin: 12px 0 0;
          max-width: 44rem;
          color: #475569;
          line-height: 1.75;
          font-size: 0.98rem;
        }

        .travel-shell__badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .travel-shell__badge--buddy {
          background: rgba(14,165,233,0.1);
          color: #0369a1;
        }

        .travel-shell__badge--community {
          background: rgba(16,185,129,0.1);
          color: #047857;
        }

        .travel-shell__meta {
          display: grid;
          gap: 12px;
          align-content: space-between;
        }

        .travel-shell__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .travel-shell__stats {
          display: grid;
          gap: 12px;
        }

        .travel-shell__action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 14px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(135deg, #0f172a, #0f766e);
          color: #fff;
          text-decoration: none;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .travel-shell__action:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 32px rgba(15, 23, 42, 0.16);
        }

        .travel-shell__action--ghost {
          background: rgba(255,255,255,0.88);
          color: #0f172a;
          border: 1px solid rgba(148,163,184,0.2);
          box-shadow: none;
        }

        .travel-shell__stats {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .travel-shell__stat {
          display: grid;
          gap: 6px;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.18);
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.94));
        }

        .travel-shell__stat--buddy strong {
          color: #0369a1;
        }

        .travel-shell__stat--community strong {
          color: #047857;
        }

        .travel-shell__stat strong {
          font-size: 1.3rem;
          line-height: 1;
        }

        .travel-shell__stat span {
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .travel-shell__body {
          display: grid;
          gap: 22px;
        }

        @media (max-width: 980px) {
          .travel-shell__panel {
            grid-template-columns: 1fr;
          }

          .travel-shell__stats {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }

        @media (max-width: 720px) {
          .travel-shell {
            padding-inline: 12px;
          }

          .travel-shell__panel {
            padding: 20px;
            border-radius: 24px;
          }

          .travel-shell__intro h1 {
            font-size: 2rem;
          }

          .travel-shell__actions {
            flex-direction: column;
          }

          .travel-shell__action {
            width: 100%;
          }

          .travel-shell__stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
