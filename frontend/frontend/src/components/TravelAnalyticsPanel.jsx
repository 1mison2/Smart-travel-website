import React from "react";
import { Link } from "react-router-dom";
import useTravelAnalytics from "../hooks/useTravelAnalytics";
import "./TravelAnalyticsPanel.css";

const RADAR_SIZE = 260;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 88;

const NEPAL_PROVINCE_MAP = [
  { name: "Koshi", path: "M30 65 L92 28 L146 44 L132 102 L76 122 L30 104 Z", labelX: 90, labelY: 76 },
  { name: "Madhesh", path: "M42 122 L132 110 L174 138 L150 176 L70 174 L34 150 Z", labelX: 108, labelY: 146 },
  { name: "Bagmati", path: "M150 62 L214 50 L240 90 L210 144 L168 132 L134 102 Z", labelX: 188, labelY: 96 },
  { name: "Gandaki", path: "M214 44 L288 62 L302 114 L248 144 L210 132 L238 90 Z", labelX: 256, labelY: 96 },
  { name: "Lumbini", path: "M152 146 L252 150 L242 196 L170 208 L136 176 Z", labelX: 194, labelY: 176 },
  { name: "Karnali", path: "M292 66 L360 70 L376 124 L306 148 L298 116 Z", labelX: 336, labelY: 104 },
  { name: "Sudurpashchim", path: "M360 74 L424 88 L434 150 L370 172 L336 136 Z", labelX: 394, labelY: 120 },
];

function polarToCartesian(angleIndex, total, radius) {
  const angle = ((Math.PI * 2) / total) * angleIndex - Math.PI / 2;
  return {
    x: RADAR_CENTER + Math.cos(angle) * radius,
    y: RADAR_CENTER + Math.sin(angle) * radius,
  };
}

function buildRadarPolygon(axes, radiusScale = 1) {
  return axes
    .map((axis, index) => {
      const point = polarToCartesian(index, axes.length, RADAR_RADIUS * radiusScale * (axis.value / 100));
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

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
    peakMonth,
    spendingCategoryData,
    totalTrackedSpend,
    analyticsNarrative,
    travelerPersona,
    nepalMastery,
    sustainabilityInsights,
    seasonalAffinity,
    dashboardSummary,
  } = useTravelAnalytics(userId);

  const spendStops = [];
  let spendCursor = 0;
  spendingCategoryData.forEach((item) => {
    const share = totalTrackedSpend > 0 ? (item.value / totalTrackedSpend) * 100 : 0;
    const nextCursor = spendCursor + share;
    spendStops.push(`${item.color} ${spendCursor}% ${nextCursor}%`);
    spendCursor = nextCursor;
  });
  const spendingChartBackground =
    spendStops.length > 0
      ? `conic-gradient(${spendStops.join(", ")})`
      : "conic-gradient(#dbe7f1 0% 100%)";
  const topSpendCategory = spendingCategoryData[0] || null;
  const radarPolygon = buildRadarPolygon(travelerPersona?.axes || []);
  const provinceMap = NEPAL_PROVINCE_MAP.map((provinceShape) => ({
    ...provinceShape,
    ...(nepalMastery?.provinces?.find((province) => province.name === provinceShape.name) || {}),
  }));

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
        <div className="analytics-panel__grid analytics-panel__grid--reflow">
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

          <div className="analytics-metrics analytics-metrics--hero">
            {analyticsCards.slice(0, 3).map((item) => (
              <article key={item.label} className={`analytics-metric analytics-metric--${item.accent}`}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>

          <article className="analytics-module analytics-module--mastery analytics-module--heart">
            <div className="analytics-module__head">
              <div>
                <p className="profile-analytics__eyebrow">Nepal Mastery</p>
                <h3>{nepalMastery.conqueredCount} of 7 provinces conquered</h3>
              </div>
              <span className="analytics-module__pill">Next: {nepalMastery.nextProvince}</span>
            </div>
            <p className="analytics-module__lede">
              This is the live map of your domestic travel achievements, balancing familiar strongholds with the next frontier worth unlocking.
            </p>

            <div className="nepal-mastery__hero">
              <div className="nepal-mastery__map-shell">
                <svg viewBox="0 0 460 240" className="nepal-mastery__map" role="img" aria-label="Nepal provinces progress map">
                  {provinceMap.map((province) => (
                    <g key={province.name} className="nepal-mastery__province-group">
                      <path
                        d={province.path}
                        className={`nepal-mastery__province ${province.visits > 0 ? "nepal-mastery__province--conquered" : "nepal-mastery__province--frontier"}`}
                      />
                      <text x={province.labelX} y={province.labelY} className="nepal-mastery__province-label">
                        {province.name}
                      </text>
                    </g>
                  ))}
                </svg>
                <div className="nepal-mastery__legend">
                  <span><i className="nepal-mastery__legend-dot nepal-mastery__legend-dot--conquered" /> Conquered</span>
                  <span><i className="nepal-mastery__legend-dot nepal-mastery__legend-dot--frontier" /> Next frontier</span>
                </div>
              </div>

              <div className="nepal-mastery__summary">
                <div className="nepal-mastery__summary-card">
                  <span>Provinces conquered</span>
                  <strong>{nepalMastery.conqueredCount}/{nepalMastery.totalCount}</strong>
                  <small>Your domestic reach across Nepal so far</small>
                </div>
                <div className="nepal-mastery__summary-card nepal-mastery__summary-card--accent">
                  <span>Next nudge</span>
                  <strong>{nepalMastery.nextProvince}</strong>
                  <small>Closest frontier to move your map forward</small>
                </div>
                <div className="nepal-mastery__white-space">
                  <p>Recommended for your DNA</p>
                  <div className="nepal-mastery__districts">
                    {nepalMastery.recommendedFrontiers.map((province) => (
                      <span key={province} className="nepal-mastery__district-pill nepal-mastery__district-pill--frontier">
                        {province}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="nepal-mastery__analytics">
              <div className="nepal-mastery__signal-block">
                <p>Strongholds</p>
                <div className="nepal-mastery__districts">
                  {nepalMastery.strongholds.length > 0 ? (
                    nepalMastery.strongholds.map((district) => (
                      <span key={district.name} className="nepal-mastery__district-pill nepal-mastery__district-pill--stronghold">
                        {district.name} • {district.badge}
                      </span>
                    ))
                  ) : (
                    <span className="nepal-mastery__district-pill">No veteran districts yet</span>
                  )}
                </div>
              </div>

              <div className="nepal-mastery__signal-block">
                <p>Recent conquests</p>
                <div className="nepal-mastery__districts">
                  {nepalMastery.recentConquests.length > 0 ? (
                    nepalMastery.recentConquests.map((district) => (
                      <span key={district.name} className="nepal-mastery__district-pill nepal-mastery__district-pill--recent">
                        {district.name} • {district.badge}
                      </span>
                    ))
                  ) : (
                    <span className="nepal-mastery__district-pill">No new discoveries in the last 6 months</span>
                  )}
                </div>
              </div>
            </div>

            <div className="analytics-smart-tip analytics-smart-tip--mastery">
              <strong>Smart Tip</strong>
              <p>{nepalMastery.smartTip}</p>
            </div>
          </article>

          <div className="analytics-identity-row">
            <article className="analytics-module analytics-module--dna">
              <div className="analytics-module__head">
                <div>
                  <p className="profile-analytics__eyebrow">Traveler DNA</p>
                  <h3>{travelerPersona.title}</h3>
                </div>
                <span className="analytics-module__pill">{travelerPersona.axes.length} style signals</span>
              </div>
              <p className="analytics-module__lede">{travelerPersona.subtitle}</p>
              <div className="traveler-dna__layout">
                <div className="traveler-dna__radar">
                  <svg viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} role="img" aria-label="Traveler DNA radar chart">
                    {[0.25, 0.5, 0.75, 1].map((scale) => (
                      <polygon
                        key={scale}
                        className="traveler-dna__grid"
                        points={buildRadarPolygon(travelerPersona.axes, scale)}
                      />
                    ))}
                    {travelerPersona.axes.map((axis, index) => {
                      const outerPoint = polarToCartesian(index, travelerPersona.axes.length, RADAR_RADIUS + 26);
                      const axisPoint = polarToCartesian(index, travelerPersona.axes.length, RADAR_RADIUS);
                      return (
                        <g key={axis.key}>
                          <line
                            x1={RADAR_CENTER}
                            y1={RADAR_CENTER}
                            x2={axisPoint.x}
                            y2={axisPoint.y}
                            className="traveler-dna__axis-line"
                          />
                          <text x={outerPoint.x} y={outerPoint.y} className="traveler-dna__axis-label">
                            {axis.label}
                          </text>
                        </g>
                      );
                    })}
                    <polygon points={radarPolygon} className="traveler-dna__shape" />
                    {travelerPersona.axes.map((axis, index) => {
                      const point = polarToCartesian(
                        index,
                        travelerPersona.axes.length,
                        RADAR_RADIUS * (axis.value / 100)
                      );
                      return <circle key={axis.key} cx={point.x} cy={point.y} r="5" className="traveler-dna__dot" />;
                    })}
                  </svg>
                </div>
                <div className="traveler-dna__legend">
                  {travelerPersona.axes.map((axis) => (
                    <div key={axis.key} className="traveler-dna__metric">
                      <div className="traveler-dna__metric-topline">
                        <span>{axis.leftLabel}</span>
                        <strong>{axis.value}</strong>
                        <span>{axis.rightLabel}</span>
                      </div>
                      <div className="traveler-dna__track">
                        <span style={{ width: `${axis.value}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="analytics-smart-tip">
                    <strong>Smart Tip</strong>
                    <p>{travelerPersona.smartTip}</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="analytics-module analytics-module--seasonal">
              <div className="analytics-module__head">
                <div>
                  <p className="profile-analytics__eyebrow">Seasonal Affinity</p>
                  <h3>{seasonalAffinity.travelMode}</h3>
                </div>
                <span className="analytics-module__pill">{seasonalAffinity.favoriteSeason} peak</span>
              </div>
              <p className="analytics-module__lede">
                Your strongest travel rhythm shows up in {seasonalAffinity.favoriteMonth}, while {seasonalAffinity.offSeason} is still underexplored.
              </p>
              <div className="seasonal-affinity__grid">
                {seasonalAffinity.months.map((month) => (
                  <div key={month.key} className="seasonal-affinity__cell-wrap">
                    <div
                      className={`seasonal-affinity__cell seasonal-affinity__cell--${month.intensity}`}
                      title={`${month.key}: ${month.score} signals`}
                    >
                      {month.key}
                    </div>
                  </div>
                ))}
              </div>
              <div className="seasonal-affinity__meta">
                <span>Favorite season: {seasonalAffinity.favoriteSeason}</span>
                <span>Off-season gap: {seasonalAffinity.offSeason}</span>
              </div>
              <div className="analytics-smart-tip">
                <strong>Smart Tip</strong>
                <p>{seasonalAffinity.smartTip}</p>
              </div>
            </article>
          </div>

          <div className="analytics-lower-row">
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
                  <div className="analytics-spend__chart">
                    <div className="analytics-spend__donut" style={{ background: spendingChartBackground }}>
                      <div className="analytics-spend__donut-core">
                        <strong>{topSpendCategory?.label || "Travel"}</strong>
                        <span>
                          {topSpendCategory
                            ? `${Math.round((topSpendCategory.value / totalTrackedSpend) * 100)}% top share`
                            : "No spend"}
                        </span>
                      </div>
                    </div>
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
                  </div>
                  <div className="analytics-spend__legend">
                    {spendingCategoryData.map((item) => (
                      <div key={item.label} className="analytics-spend__legend-item">
                        <div className="analytics-spend__legend-topline">
                          <span className={`analytics-spend__swatch ${item.accent}`} />
                          <strong>{item.label}</strong>
                        </div>
                        <span>
                          NPR {item.value.toLocaleString()} / {Math.round((item.value / totalTrackedSpend) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="analytics-tags__empty">Make a few bookings and your spending categories will show up here.</p>
              )}
            </article>

            <article className="analytics-module analytics-module--sustainability">
              <div className="analytics-module__head">
                <div>
                  <p className="profile-analytics__eyebrow">Travel Velocity & Sustainability</p>
                  <h3>{sustainabilityInsights.velocityLabel}</h3>
                </div>
                <span className="analytics-module__pill">{sustainabilityInsights.greenScore} green score</span>
              </div>
              <div className="sustainability__stats">
                <div className="sustainability__stat-card">
                  <strong>{sustainabilityInsights.co2Footprint} kg</strong>
                  <span>Estimated CO2 footprint</span>
                </div>
                <div className="sustainability__stat-card">
                  <strong>{sustainabilityInsights.velocity}</strong>
                  <span>Travel velocity index</span>
                </div>
                <div className="sustainability__stat-card">
                  <strong>{sustainabilityInsights.ecoStayCount}</strong>
                  <span>Eco-leaning stays</span>
                </div>
              </div>
              <div className="sustainability__legend">
                {sustainabilityInsights.transportLegend.map((item) => (
                  <div key={item.label} className="sustainability__legend-row">
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.value} trips</span>
                    </div>
                    <small>{item.emissionFactor} kg baseline</small>
                  </div>
                ))}
              </div>
              <div className="analytics-smart-tip">
                <strong>Smart Tip</strong>
                <p>{sustainabilityInsights.smartTip}</p>
              </div>
            </article>
          </div>

          <article className="analytics-insights analytics-insights--footer">
            <div className="analytics-insights__head">
              <div>
                <p className="profile-analytics__eyebrow">Smart Insights</p>
                <h3>What your dashboard says right now</h3>
              </div>
            </div>
            <div className="analytics-insights__list">
              {dashboardSummary.map((insight) => (
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
