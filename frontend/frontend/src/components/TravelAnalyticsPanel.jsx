import React from "react";
import { Link } from "react-router-dom";
import useTravelAnalytics from "../hooks/useTravelAnalytics";
import "./TravelAnalyticsPanel.css";

export default function TravelAnalyticsPanel({
  userId,
  title = "Your movement at a glance",
  eyebrow = "Travel Analytics",
  ctaLabel = "Open bookings",
  ctaTo = "/bookings",
}) {
  const {
    loading,
    error,
    analyticsCards,
    tripStatusData,
    monthlyTripStarts,
    peakMonth,
    savedCategoryData,
    savedPlacesCount,
    bookingStatusData,
    bookingStatusTotal,
    spendingCategoryData,
    totalTrackedSpend,
    personalInsights,
    analyticsNarrative,
  } = useTravelAnalytics(userId);

  const maxMonthlyTripCount = Math.max(...monthlyTripStarts.map((entry) => entry.count), 1);

  return (
    <section className="travel-card profile-analytics">
      <div className="profile-analytics__head">
        <div>
          <p className="profile-analytics__eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <Link to={ctaTo} className="profile-analytics__link">
          {ctaLabel}
        </Link>
      </div>

      {loading ? (
        <p className="profile-analytics__state">Loading your travel analytics...</p>
      ) : (
        <div className="analytics-panel__grid">
          <article className="analytics-hero">
            <p className="analytics-hero__eyebrow">Journey pulse</p>
            <h3>
              {peakMonth.count > 0
                ? `${peakMonth.label} is your busiest travel month`
                : "Your analytics are ready for their first trend line"}
            </h3>
            <p>{analyticsNarrative}</p>
            <div className="analytics-hero__statuses">
              {tripStatusData.map((item) => (
                <div key={item.label} className="analytics-hero__status">
                  <span className="analytics-hero__dot" style={{ background: item.accent }} />
                  <div>
                    <strong>{item.value}</strong>
                    <small>{item.label}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <div className="analytics-metrics">
            {analyticsCards.map((item) => (
              <article key={item.label} className={`analytics-metric analytics-metric--${item.accent}`}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>

          <article className="analytics-chart">
            <div className="analytics-chart__head">
              <div>
                <p className="profile-analytics__eyebrow">Trip Starts</p>
                <h3>Last 6 months</h3>
              </div>
              <span>{monthlyTripStarts.reduce((sum, item) => sum + item.count, 0)} total</span>
            </div>
            <div className="analytics-chart__bars">
              {monthlyTripStarts.map((item) => {
                const height = `${Math.max(16, Math.round((item.count / maxMonthlyTripCount) * 100))}%`;
                return (
                  <div key={item.key} className="analytics-chart__bar-group">
                    <div className="analytics-chart__bar-track">
                      <span className="analytics-chart__bar" style={{ height }} />
                    </div>
                    <strong>{item.count}</strong>
                    <small>{item.label}</small>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="analytics-tags">
            <div className="analytics-tags__head">
              <div>
                <p className="profile-analytics__eyebrow">Saved Place Signals</p>
                <h3>What you keep revisiting</h3>
              </div>
              <span>{savedPlacesCount} saved</span>
            </div>
            {savedCategoryData.length > 0 ? (
              <div className="analytics-tags__list">
                {savedCategoryData.map(([label, value]) => (
                  <div key={label} className="analytics-tags__item">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="analytics-tags__empty">
                Save a few destinations and your preference trends will show up here.
              </p>
            )}
          </article>

          <article className="analytics-breakdown">
            <div className="analytics-breakdown__head">
              <div>
                <p className="profile-analytics__eyebrow">Booking Status</p>
                <h3>How your bookings are moving</h3>
              </div>
              <span>{bookingStatusTotal} tracked</span>
            </div>
            <div className="analytics-breakdown__list">
              {bookingStatusData.map((item) => {
                const width =
                  bookingStatusTotal > 0
                    ? `${Math.max(10, Math.round((item.value / bookingStatusTotal) * 100))}%`
                    : "10%";
                return (
                  <div key={item.label} className="analytics-breakdown__item">
                    <div className="analytics-breakdown__row">
                      <strong>{item.label}</strong>
                      <span>{item.value}</span>
                    </div>
                    <div className="analytics-breakdown__track">
                      <span style={{ width, background: item.accent }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="analytics-spend">
            <div className="analytics-spend__head">
              <div>
                <p className="profile-analytics__eyebrow">Spending Split</p>
                <h3>Where your budget goes</h3>
              </div>
              <span>{totalTrackedSpend ? `NPR ${totalTrackedSpend.toLocaleString()}` : "No spend yet"}</span>
            </div>
            {spendingCategoryData.length > 0 ? (
              <>
                <div className="analytics-spend__segments">
                  {spendingCategoryData.map((item) => {
                    const width = `${Math.max(12, Math.round((item.value / totalTrackedSpend) * 100))}%`;
                    return (
                      <span
                        key={item.label}
                        className={`analytics-spend__segment ${item.accent}`}
                        style={{ width }}
                      />
                    );
                  })}
                </div>
                <div className="analytics-spend__legend">
                  {spendingCategoryData.map((item) => (
                    <div key={item.label} className="analytics-spend__legend-item">
                      <strong>{item.label}</strong>
                      <span>NPR {item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="analytics-tags__empty">Make a few bookings and your spending categories will show up here.</p>
            )}
          </article>

          <article className="analytics-insights">
            <div className="analytics-insights__head">
              <div>
                <p className="profile-analytics__eyebrow">Smart Insights</p>
                <h3>Personal patterns worth watching</h3>
              </div>
            </div>
            <div className="analytics-insights__list">
              {personalInsights.map((insight) => (
                <div key={insight} className="analytics-insights__item">
                  <span className="analytics-insights__bullet" />
                  <p>{insight}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}

      {!loading && error ? <p className="profile-analytics__error">{error}</p> : null}
    </section>
  );
}
