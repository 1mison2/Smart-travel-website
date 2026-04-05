import React, { useMemo, useState } from "react";
import { CalendarRange, Coins, MapPinned, Sparkles, TimerReset, Wand2 } from "lucide-react";
import api from "../utils/api";

const INTEREST_OPTIONS = [
  "food",
  "nature",
  "boating",
  "hiking",
  "culture",
  "temples",
  "sunrise",
  "photography",
];

const DESTINATION_SUGGESTIONS = ["Pokhara", "Kathmandu", "Chitwan", "Mustang", "Bandipur", "Lumbini"];

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "NPR 0";
  return `NPR ${amount.toLocaleString()}`;
};

export default function ItineraryPlanner() {
  const [form, setForm] = useState({
    destination: "Pokhara",
    budget: "15000",
    durationDays: "3",
    interests: "food,nature,boating",
  });
  const [itinerary, setItinerary] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedInterests = useMemo(
    () =>
      form.interests
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    [form.interests]
  );

  const onChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleInterest = (interest) => {
    const next = selectedInterests.includes(interest)
      ? selectedInterests.filter((item) => item !== interest)
      : [...selectedInterests, interest];

    setForm((prev) => ({
      ...prev,
      interests: next.join(","),
    }));
  };

  const applyDestination = (destination) => {
    setForm((prev) => ({ ...prev, destination }));
  };

  const onReset = () => {
    setForm({
      destination: "Pokhara",
      budget: "15000",
      durationDays: "3",
      interests: "food,nature,boating",
    });
    setError("");
  };

  const onGenerate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const payload = {
        destination: form.destination,
        budget: Number(form.budget),
        durationDays: Number(form.durationDays),
        interests: selectedInterests,
      };
      const { data } = await api.post("/api/itineraries/generate", payload);
      setItinerary(data?.itinerary || null);
      setSummary(data?.summary || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to generate itinerary");
    } finally {
      setLoading(false);
    }
  };

  const totalPlaces = (itinerary?.days || []).reduce((sum, day) => sum + (day?.places?.length || 0), 0);
  const totalMoments = (itinerary?.days || []).reduce((sum, day) => sum + (day?.timeline?.length || 0), 0);

  return (
    <div className="ai-planner">
      <div className="ai-planner__bg" />
      <div className="ai-planner__container">
        <header className="ai-planner__hero">
          <div className="ai-planner__hero-copy">
            <p className="ai-planner__kicker">AI Trip Planner</p>
            <h1>Build a sharper Nepal itinerary without the planning mess.</h1>
            <p className="ai-planner__lead">
              Choose a destination, budget, trip length, and interests. The planner turns that into a cleaner
              day-by-day route with estimated costs and stop ideas.
            </p>

            <div className="ai-planner__hero-chips">
              <span><Sparkles size={15} />Smarter trip flow</span>
              <span><Coins size={15} />Budget-aware suggestions</span>
              <span><CalendarRange size={15} />Day-by-day structure</span>
            </div>
          </div>

          <div className="ai-planner__hero-card">
            <div className="ai-planner__mini-head">
              <span>Trip Snapshot</span>
              <Wand2 size={16} />
            </div>

            <div className="ai-planner__mini-grid">
              <div className="ai-mini-stat">
                <span>Destination</span>
                <strong>{form.destination || "Choose a place"}</strong>
              </div>
              <div className="ai-mini-stat">
                <span>Budget</span>
                <strong>{formatCurrency(form.budget)}</strong>
              </div>
              <div className="ai-mini-stat">
                <span>Days</span>
                <strong>{form.durationDays || 0} day trip</strong>
              </div>
              <div className="ai-mini-stat">
                <span>Interests</span>
                <strong>{selectedInterests.length || 0} selected</strong>
              </div>
            </div>

            <div className="ai-planner__destinations">
              {DESTINATION_SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`ai-chip ${form.destination === item ? "is-active" : ""}`}
                  onClick={() => applyDestination(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="ai-planner__workspace">
          <form onSubmit={onGenerate} className="ai-form">
            <div className="ai-form__head">
              <div>
                <p className="ai-form__eyebrow">Planner Input</p>
                <h2>Tell the planner what kind of trip you want</h2>
              </div>
              <button type="button" className="ai-reset" onClick={onReset}>
                <TimerReset size={15} />
                Reset
              </button>
            </div>

            <div className="ai-form__grid">
              <label className="ai-field">
                <span>Destination</span>
                <div className="ai-field__control">
                  <MapPinned size={16} />
                  <input
                    name="destination"
                    value={form.destination}
                    onChange={onChange}
                    placeholder="Pokhara, Kathmandu, Mustang"
                  />
                </div>
              </label>

              <label className="ai-field">
                <span>Budget (NPR)</span>
                <div className="ai-field__control">
                  <Coins size={16} />
                  <input name="budget" value={form.budget} onChange={onChange} placeholder="15000" />
                </div>
              </label>

              <label className="ai-field">
                <span>Duration (days)</span>
                <div className="ai-field__control">
                  <CalendarRange size={16} />
                  <input name="durationDays" value={form.durationDays} onChange={onChange} placeholder="3" />
                </div>
              </label>

              <label className="ai-field ai-field--wide">
                <span>Interests</span>
                <div className="ai-field__control ai-field__control--text">
                  <input
                    name="interests"
                    value={form.interests}
                    onChange={onChange}
                    placeholder="food, nature, hiking, lakes"
                  />
                </div>
                <small>Use commas, or tap the quick tags below.</small>
              </label>
            </div>

            <div className="ai-interest-picks">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  className={`ai-pill ${selectedInterests.includes(interest) ? "is-active" : ""}`}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>

            <div className="ai-form__footer">
              <button className="ai-btn" disabled={loading}>
                {loading ? "Generating your plan..." : "Generate itinerary"}
              </button>
            </div>
          </form>
        </section>

        {error && <p className="ai-error">{error}</p>}

        {summary && (
          <section className="ai-summary">
            <article className="ai-summary__card">
              <span>Destination</span>
              <strong>{summary.destination}</strong>
            </article>
            <article className="ai-summary__card">
              <span>Duration</span>
              <strong>{summary.durationDays} days</strong>
            </article>
            <article className="ai-summary__card">
              <span>Budget</span>
              <strong>{summary.budget}</strong>
            </article>
            <article className="ai-summary__card">
              <span>Estimated Cost</span>
              <strong>{summary.totalEstimatedCost}</strong>
            </article>
            <article className="ai-summary__card">
              <span>Budget Gap</span>
              <strong>{summary.budgetGap}</strong>
            </article>
            <article className="ai-summary__card">
              <span>Planned Stops</span>
              <strong>{totalPlaces}</strong>
            </article>
            <article className="ai-summary__card">
              <span>Timeline Moments</span>
              <strong>{totalMoments}</strong>
            </article>
          </section>
        )}

        <div className="ai-days">
          {(itinerary?.days || []).map((day) => (
            <article key={day.day} className="ai-day">
              <div className="ai-day__head">
                <div>
                  <p className="ai-day__badge">Day {day.day}</p>
                  <h2>{day.title}</h2>
                </div>
                <p className="ai-day__cost">Estimated {formatCurrency(day.estimatedCost)}</p>
              </div>

              {day.notes && <p className="ai-day__notes">{day.notes}</p>}

              <div className="ai-day__body">
                <div className="ai-day__timeline-col">
                  <p className="ai-section-label">Timeline</p>
                  {day.timeline && day.timeline.length > 0 ? (
                    <div className="ai-timeline">
                      {day.timeline.map((item, index) => (
                        <div key={`${item.time}-${index}`} className="ai-timeline__item">
                          <div className="ai-timeline__time">{item.time}</div>
                          <div>
                            <p className="ai-timeline__title">{item.title}</p>
                            <p className="ai-timeline__detail">{item.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ai-block ai-block--muted">No timeline details for this day yet.</div>
                  )}
                </div>

                <div className="ai-day__places-col">
                  <p className="ai-section-label">Places</p>
                  <div className="ai-day__places">
                    {(day.places || []).length > 0 ? (
                      (day.places || []).map((place, index) => (
                        <div key={`${place.name}-${index}`} className="ai-place">
                          <div>
                            <p className="ai-place__name">{place.name}</p>
                            <p className="ai-place__meta">{place.category || "Attraction"}</p>
                          </div>
                          <p className="ai-place__cost">{formatCurrency(place.estimatedCost)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="ai-place ai-place--empty">
                        <div>
                          <p className="ai-place__name">More local details coming soon</p>
                          <p className="ai-place__meta">This day can be refined with specific nearby places.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        :root {
          --ai-navy: #11365d;
          --ai-sky: #3ea2dc;
          --ai-teal: #1f8d84;
          --ai-coral: #ff7a5c;
          --ai-ink: #13283f;
          --ai-muted: #5f7891;
          --ai-line: rgba(183, 201, 220, 0.42);
          --ai-card: rgba(255, 255, 255, 0.84);
          --ai-shadow: 0 20px 48px rgba(19, 40, 63, 0.08);
        }

        .ai-planner {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          color: var(--ai-ink);
          font-family: "Plus Jakarta Sans", "Sora", "DM Sans", system-ui, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(102, 183, 243, 0.18), transparent 24%),
            radial-gradient(circle at 92% 10%, rgba(255, 164, 133, 0.16), transparent 18%),
            linear-gradient(180deg, #f8fbff 0%, #f4f8fc 54%, #edf3f9 100%);
        }

        .ai-planner__bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 22% 16%, rgba(72, 153, 255, 0.12), transparent 24%),
            radial-gradient(circle at 82% 8%, rgba(40, 190, 165, 0.11), transparent 20%);
          pointer-events: none;
        }

        .ai-planner__container {
          position: relative;
          max-width: 1240px;
          margin: 0 auto;
          padding: 32px 20px 64px;
        }

        .ai-planner__hero {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
          gap: 22px;
          align-items: stretch;
          margin-bottom: 22px;
        }

        .ai-planner__hero-copy,
        .ai-planner__hero-card,
        .ai-form,
        .ai-sidecard,
        .ai-summary,
        .ai-empty,
        .ai-day {
          border: 1px solid var(--ai-line);
          background: var(--ai-card);
          box-shadow: var(--ai-shadow);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .ai-planner__hero-copy {
          border-radius: 34px;
          padding: 30px;
          background:
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.18), transparent 28%),
            linear-gradient(135deg, rgba(14, 52, 90, 0.98) 0%, rgba(29, 98, 151, 0.94) 54%, rgba(73, 171, 196, 0.82) 100%);
          color: #fff;
        }

        .ai-planner__kicker,
        .ai-form__eyebrow,
        .ai-sidecard__eyebrow,
        .ai-empty__eyebrow,
        .ai-section-label {
          margin: 0 0 10px;
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }

        .ai-planner__kicker {
          color: rgba(230, 241, 251, 0.74);
        }

        .ai-planner__hero-copy h1 {
          margin: 0;
          max-width: 11ch;
          font-size: clamp(2.2rem, 4.2vw, 4.1rem);
          line-height: 0.94;
          letter-spacing: -0.05em;
        }

        .ai-planner__lead {
          margin: 18px 0 0;
          max-width: 620px;
          color: rgba(236, 244, 252, 0.84);
          font-size: 1rem;
          line-height: 1.7;
        }

        .ai-planner__hero-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }

        .ai-planner__hero-chips span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.1);
          color: rgba(245, 249, 253, 0.96);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .ai-planner__hero-card {
          border-radius: 30px;
          padding: 24px;
          display: grid;
          gap: 18px;
        }

        .ai-planner__mini-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--ai-navy);
          font-weight: 700;
        }

        .ai-planner__mini-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .ai-mini-stat {
          padding: 14px;
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(246, 250, 253, 0.98), rgba(236, 244, 250, 0.96));
          border: 1px solid rgba(216, 228, 239, 0.94);
          min-width: 0;
        }

        .ai-mini-stat span,
        .ai-summary__card span {
          display: block;
          color: var(--ai-muted);
          font-size: 0.76rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 6px;
        }

        .ai-mini-stat strong,
        .ai-summary__card strong {
          display: block;
          color: var(--ai-navy);
          font-size: 1rem;
          line-height: 1.35;
          word-break: break-word;
        }

        .ai-planner__destinations,
        .ai-interest-picks {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .ai-chip,
        .ai-pill,
        .ai-reset {
          border: 1px solid rgba(209, 223, 236, 0.96);
          background: rgba(244, 248, 252, 0.96);
          color: #315170;
          border-radius: 999px;
          cursor: pointer;
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease;
        }

        .ai-chip,
        .ai-pill {
          padding: 9px 12px;
          font-size: 0.83rem;
          font-weight: 700;
          text-transform: capitalize;
        }

        .ai-chip.is-active,
        .ai-pill.is-active {
          color: #fff;
          background: linear-gradient(135deg, var(--ai-navy), #3f95cb);
          border-color: transparent;
          box-shadow: 0 14px 28px rgba(26, 72, 113, 0.16);
        }

        .ai-chip:hover,
        .ai-pill:hover,
        .ai-reset:hover,
        .ai-btn:hover {
          transform: translateY(-2px);
        }

        .ai-planner__workspace {
          display: grid;
          grid-template-columns: minmax(0, 1.18fr) minmax(260px, 0.56fr);
          gap: 22px;
          align-items: start;
          margin-bottom: 18px;
        }

        .ai-form,
        .ai-sidecard,
        .ai-summary,
        .ai-empty,
        .ai-day {
          border-radius: 28px;
        }

        .ai-form {
          padding: 24px;
          display: grid;
          gap: 20px;
        }

        .ai-form__head,
        .ai-form__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .ai-form__head h2,
        .ai-empty h2,
        .ai-day__head h2 {
          margin: 0;
          color: var(--ai-navy);
        }

        .ai-form__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .ai-field {
          display: grid;
          gap: 8px;
        }

        .ai-field span {
          color: #34516e;
          font-size: 0.88rem;
          font-weight: 700;
        }

        .ai-field small {
          color: var(--ai-muted);
          font-size: 0.82rem;
        }

        .ai-field__control {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          min-height: 52px;
          border-radius: 16px;
          border: 1px solid rgba(194, 210, 224, 0.9);
          background: rgba(250, 252, 255, 0.98);
          color: #5b7894;
        }

        .ai-field__control--text {
          padding-right: 0;
        }

        .ai-field input {
          width: 100%;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: var(--ai-ink);
          font-size: 0.96rem;
        }

        .ai-field__control:focus-within {
          border-color: rgba(63, 149, 203, 0.74);
          box-shadow: 0 0 0 4px rgba(63, 149, 203, 0.12);
        }

        .ai-field--wide {
          grid-column: 1 / -1;
        }

        .ai-reset {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          font-weight: 700;
        }

        .ai-form__hint {
          margin: 0;
          max-width: 480px;
          color: var(--ai-muted);
          font-size: 0.9rem;
        }

        .ai-btn {
          border: none;
          border-radius: 16px;
          padding: 13px 18px;
          background: linear-gradient(135deg, var(--ai-coral), #ff9368);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 18px 34px rgba(255, 122, 92, 0.22);
          transition: transform 0.22s ease, box-shadow 0.22s ease, opacity 0.22s ease;
        }

        .ai-btn:disabled {
          opacity: 0.72;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .ai-sidecard {
          padding: 22px;
          display: grid;
          gap: 18px;
        }

        .ai-sidecard__eyebrow,
        .ai-section-label {
          color: #6f89a5;
        }

        .ai-sidecard__steps {
          display: grid;
          gap: 14px;
        }

        .ai-sidecard__steps div {
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(245, 249, 253, 0.98);
          border: 1px solid rgba(223, 232, 240, 0.96);
        }

        .ai-sidecard__steps strong {
          display: block;
          color: var(--ai-navy);
          margin-bottom: 5px;
        }

        .ai-sidecard__steps p,
        .ai-empty p,
        .ai-day__notes,
        .ai-timeline__detail,
        .ai-place__meta,
        .ai-error {
          margin: 0;
          color: var(--ai-muted);
          line-height: 1.6;
        }

        .ai-error {
          margin-bottom: 16px;
          padding: 14px 16px;
          border-radius: 18px;
          border: 1px solid rgba(248, 169, 169, 0.78);
          background: rgba(255, 238, 238, 0.9);
          color: #b34141;
          font-weight: 700;
        }

        .ai-summary {
          padding: 18px;
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .ai-summary__card {
          padding: 14px;
          border-radius: 18px;
          background: rgba(246, 250, 253, 0.98);
          border: 1px solid rgba(220, 230, 238, 0.96);
          min-width: 0;
        }

        .ai-empty {
          display: grid;
          grid-template-columns: 120px minmax(0, 1fr);
          gap: 18px;
          align-items: center;
          padding: 24px;
          margin-bottom: 18px;
        }

        .ai-empty__art {
          width: 120px;
          height: 120px;
          border-radius: 28px;
          background:
            radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.82), transparent 24%),
            linear-gradient(135deg, rgba(17, 54, 93, 0.98), rgba(74, 161, 198, 0.9));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
        }

        .ai-days {
          display: grid;
          gap: 16px;
        }

        .ai-day {
          padding: 22px;
        }

        .ai-day__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 14px;
        }

        .ai-day__badge {
          margin: 0 0 8px;
          color: var(--ai-teal);
        }

        .ai-day__cost {
          margin: 0;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(35, 141, 132, 0.1);
          color: var(--ai-teal);
          font-weight: 800;
          white-space: nowrap;
        }

        .ai-day__notes {
          margin-bottom: 16px;
        }

        .ai-day__body {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr);
          gap: 18px;
        }

        .ai-day__timeline-col,
        .ai-day__places-col {
          min-width: 0;
        }

        .ai-timeline,
        .ai-day__places {
          display: grid;
          gap: 12px;
        }

        .ai-timeline__item,
        .ai-place,
        .ai-block {
          border-radius: 18px;
          padding: 13px 14px;
          border: 1px solid rgba(220, 230, 238, 0.96);
          background: rgba(247, 250, 253, 0.98);
        }

        .ai-timeline__item {
          display: grid;
          grid-template-columns: 88px minmax(0, 1fr);
          gap: 12px;
        }

        .ai-timeline__time {
          color: var(--ai-teal);
          font-size: 0.74rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .ai-timeline__title,
        .ai-place__name {
          margin: 0;
          color: var(--ai-navy);
          font-weight: 800;
        }

        .ai-place {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
        }

        .ai-place--empty,
        .ai-block--muted {
          background: rgba(239, 244, 249, 0.92);
        }

        .ai-place__cost {
          margin: 0;
          color: #234e73;
          font-weight: 800;
          white-space: nowrap;
        }

        @media (max-width: 1080px) {
          .ai-planner__hero,
          .ai-planner__workspace,
          .ai-day__body {
            grid-template-columns: 1fr;
          }

          .ai-summary {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .ai-planner__container {
            padding: 18px 14px 40px;
          }

          .ai-planner__hero-copy,
          .ai-planner__hero-card,
          .ai-form,
          .ai-sidecard,
          .ai-summary,
          .ai-empty,
          .ai-day {
            border-radius: 24px;
          }

          .ai-planner__hero-copy {
            padding: 24px 20px;
          }

          .ai-planner__hero-copy h1 {
            max-width: 12ch;
            font-size: 2.45rem;
          }

          .ai-form__grid,
          .ai-summary,
          .ai-empty {
            grid-template-columns: 1fr;
          }

          .ai-empty__art {
            width: 100%;
            height: 110px;
          }

          .ai-day__head {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 560px) {
          .ai-planner__hero-copy h1 {
            font-size: 2rem;
          }

          .ai-planner__mini-grid {
            grid-template-columns: 1fr;
          }

          .ai-timeline__item,
          .ai-place {
            grid-template-columns: 1fr;
          }

          .ai-place {
            align-items: flex-start;
          }

          .ai-place__cost,
          .ai-day__cost {
            white-space: normal;
          }
        }
      `}</style>
    </div>
  );
}
