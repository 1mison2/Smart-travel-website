import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Coins,
  Compass,
  MapPinned,
  Mountain,
  Route,
  Sparkles,
  TimerReset,
  Users,
} from "lucide-react";
import api from "../utils/api";

const DRAFT_KEY = "st_itinerary_planner_draft_v2";
const DESTINATION_SUGGESTIONS = ["Pokhara", "Kathmandu", "Chitwan", "Mustang", "Bandipur", "Lumbini"];
const INTEREST_OPTIONS = ["food", "nature", "boating", "hiking", "culture", "temples", "sunrise", "photography"];
const PACE_OPTIONS = [
  { value: "relaxed", label: "Relaxed", copy: "Fewer stops and more breathing room." },
  { value: "balanced", label: "Balanced", copy: "A steady mix of activity and rest." },
  { value: "fast", label: "Fast", copy: "More movement and a fuller day." },
];
const STYLE_OPTIONS = [
  { value: "balanced", label: "Balanced", icon: Sparkles, copy: "A general mix of places." },
  { value: "culture", label: "Culture", icon: Mountain, copy: "Heritage, temples, and identity-rich stops." },
  { value: "adventure", label: "Adventure", icon: Compass, copy: "Outdoors, movement, and scenic energy." },
  { value: "food", label: "Food", icon: Coins, copy: "Local flavor and social stops." },
  { value: "relaxation", label: "Relaxation", icon: Route, copy: "Scenic and softer pacing." },
];
const COMPANION_OPTIONS = [
  { value: "solo", label: "Solo", copy: "Flexible and easy to adapt." },
  { value: "couple", label: "Couple", copy: "More scenic and shared moments." },
  { value: "friends", label: "Friends", copy: "Social and activity-friendly." },
  { value: "family", label: "Family", copy: "Smoother transitions and easier flow." },
];

const createInitialForm = () => ({
  destination: "",
  budget: "",
  durationDays: "",
  startDate: "",
  interests: "",
  pace: "balanced",
  tripStyle: "balanced",
  companionType: "solo",
});

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "NPR 0";
  return `NPR ${amount.toLocaleString()}`;
};

const titleCase = (value) =>
  String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const calculateDistanceKm = (from, to) => {
  const lat1 = Number(from?.latitude);
  const lon1 = Number(from?.longitude);
  const lat2 = Number(to?.latitude);
  const lon2 = Number(to?.longitude);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const getMinimumBudget = ({ destination, durationDays }) => {
  const normalizedDestination = String(destination || "").trim().toLowerCase();
  const dailyFloor = /(mustang|manang|dolpa|humla|muktinath)/.test(normalizedDestination) ? 5000 : 1000;
  return dailyFloor * Math.max(1, Number(durationDays) || 1);
};

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return createInitialForm();
    const parsed = JSON.parse(raw);
    return { ...createInitialForm(), ...parsed };
  } catch {
    return createInitialForm();
  }
};

export default function ItineraryPlanner() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(() => loadDraft());
  const [step, setStep] = useState(1);
  const [itinerary, setItinerary] = useState(null);
  const [summary, setSummary] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [activeOptionKey, setActiveOptionKey] = useState("recommended");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prefillLabel, setPrefillLabel] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedInterests = useMemo(
    () =>
      form.interests
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    [form.interests]
  );

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      // ignore storage errors
    }
  }, [form]);

  useEffect(() => {
    const locationId = searchParams.get("locationId");
    if (!locationId) return;

    let active = true;
    const loadLocation = async () => {
      try {
        const { data } = await api.get(`/api/locations/${locationId}`);
        if (!active) return;
        setForm((prev) => ({
          ...prev,
          destination: data?.name || prev.destination,
          interests: prev.interests || [data?.category, data?.district].filter(Boolean).join(",").toLowerCase(),
        }));
        setPrefillLabel(data?.name || "Selected destination");
      } catch {
        // ignore prefill errors
      }
    };

    loadLocation();
    return () => {
      active = false;
    };
  }, [searchParams]);

  const routeDistanceKm = useMemo(() => {
    const places = (itinerary?.days || []).flatMap((day) => day?.places || []);
    return places.reduce((sum, place, index) => {
      if (index === 0) return 0;
      return sum + calculateDistanceKm(places[index - 1], place);
    }, 0);
  }, [itinerary]);

  const budgetPerDay = useMemo(() => {
    const budget = Number(form.budget || 0);
    const days = Number(form.durationDays || 0);
    return budget > 0 && days > 0 ? Math.round(budget / days) : 0;
  }, [form.budget, form.durationDays]);

  const totalPlaces = (itinerary?.days || []).reduce((sum, day) => sum + (day?.places?.length || 0), 0);
  const totalMoments = (itinerary?.days || []).reduce((sum, day) => sum + (day?.timeline?.length || 0), 0);

  const summaryBarItems = [
    { label: "Destination", value: form.destination || "Not set" },
    { label: "Days", value: form.durationDays || "--" },
    { label: "Budget/day", value: budgetPerDay ? formatCurrency(budgetPerDay) : "--" },
    { label: "Travel vibe", value: titleCase(form.tripStyle) },
  ];

  const validateStep = (stepToCheck = step) => {
    const nextErrors = {};

    if (stepToCheck === 1) {
      if (!String(form.destination || "").trim()) nextErrors.destination = "Choose a destination.";
      if (!Number(form.durationDays) || Number(form.durationDays) <= 0) nextErrors.durationDays = "Enter trip days.";
      const minimumBudget = getMinimumBudget({ destination: form.destination, durationDays: form.durationDays });
      if (!Number(form.budget) || Number(form.budget) < minimumBudget) {
        nextErrors.budget = `Use at least ${formatCurrency(minimumBudget)} for this trip.`;
      }
    }

    if (stepToCheck === 2) {
      if (selectedInterests.length === 0) nextErrors.interests = "Choose at least one interest.";
    }

    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const toggleInterest = (interest) => {
    const next = selectedInterests.includes(interest)
      ? selectedInterests.filter((item) => item !== interest)
      : [...selectedInterests, interest];
    updateField("interests", next.join(","));
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(3, current + 1));
  };

  const goBack = () => setStep((current) => Math.max(1, current - 1));

  const onReset = () => {
    const initial = createInitialForm();
    setForm(initial);
    setFieldErrors({});
    setError("");
    setItinerary(null);
    setSummary(null);
    setAlternatives([]);
    setActiveOptionKey("recommended");
    setStep(1);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const generateWithForm = async (override = {}) => {
    const merged = { ...form, ...override };
    const interests = String(merged.interests || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    setLoading(true);
    setError("");
    try {
      const payload = {
        destination: merged.destination,
        budget: Number(merged.budget),
        durationDays: Number(merged.durationDays),
        interests,
        startDate: merged.startDate || undefined,
        pace: merged.pace,
        tripStyle: merged.tripStyle,
        companionType: merged.companionType,
      };
      const { data } = await api.post("/api/itineraries/generate", payload);
      const nextAlternatives = Array.isArray(data?.alternatives) ? data.alternatives : [];
      const recommendedOption = nextAlternatives.find((item) => item?.isRecommended) || nextAlternatives[0] || null;
      setForm(merged);
      setAlternatives(nextAlternatives);
      setActiveOptionKey(recommendedOption?.key || "recommended");
      setItinerary(recommendedOption?.itinerary || data?.itinerary || null);
      setSummary(recommendedOption?.summary || data?.summary || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to generate itinerary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const activeOption = alternatives.find((item) => item?.key === activeOptionKey) || null;
    if (!activeOption) return;
    setItinerary(activeOption.itinerary || null);
    setSummary(activeOption.summary || null);
  }, [alternatives, activeOptionKey]);

  const onGenerate = async (e) => {
    e.preventDefault();
    const basicsOk = validateStep(1);
    const vibeOk = validateStep(2);
    if (!basicsOk || !vibeOk) {
      setStep(!basicsOk ? 1 : 2);
      return;
    }
    await generateWithForm();
  };

  const quickAdjustments = [
    {
      label: "Make it cheaper",
      run: () => generateWithForm({ budget: String(Math.max(2000, Math.round(Number(form.budget || 0) * 0.8))) }),
    },
    {
      label: "Make it relaxed",
      run: () => generateWithForm({ pace: "relaxed" }),
    },
    {
      label: "More adventure",
      run: () => generateWithForm({ tripStyle: "adventure", interests: Array.from(new Set([...selectedInterests, "hiking", "nature"])).join(",") }),
    },
  ];

  const resultHighlights = summary
    ? [
        { label: "Planning mode", value: titleCase(summary.planningMode || "balanced") },
        { label: "Matched locations", value: summary.matchedLocations || 0 },
        { label: "Companion type", value: summary.companionType || titleCase(form.companionType) },
        { label: "Timeline moments", value: totalMoments },
      ]
    : [];

  return (
    <div className="ai-planner">
      <div className="ai-planner__bg" />
      <div className="ai-planner__container">
        <header className="ai-hero">
          <div>
            <p className="ai-kicker">AI Trip Planner</p>
            <h1>Build a better itinerary with less effort.</h1>
            <p className="ai-lead">A guided planner that helps users choose the right trip basics, travel vibe, and review details before generating the route.</p>
            {prefillLabel ? <div className="ai-prefill"><MapPinned size={15} />Prefilled from destination hub: <strong>{prefillLabel}</strong></div> : null}
          </div>
          <div className="ai-summary-bar">
            {summaryBarItems.map((item) => (
              <div key={item.label} className="ai-summary-bar__item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </header>

        <section className="ai-steps">
          {[{ id: 1, label: "Trip basics" }, { id: 2, label: "Travel vibe" }, { id: 3, label: "Review" }].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ai-step ${step === item.id ? "is-active" : ""} ${step > item.id ? "is-complete" : ""}`}
              onClick={() => setStep(item.id)}
            >
              <span>{item.id}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </section>

        <form onSubmit={onGenerate} className="ai-panel">
          <div className="ai-panel__head">
            <div>
              <p className="ai-panel__eyebrow">Planner Setup</p>
              <h2>{step === 1 ? "Start with the trip basics" : step === 2 ? "Choose the travel vibe" : "Review before generating"}</h2>
            </div>
            <button type="button" className="ai-reset" onClick={onReset}>
              <TimerReset size={15} />
              Reset
            </button>
          </div>

          {step === 1 ? (
            <div className="ai-grid">
              <label className="ai-field">
                <span>Destination</span>
                <div className={`ai-field__control ${fieldErrors.destination ? "has-error" : ""}`}>
                  <MapPinned size={16} />
                  <input
                    name="destination"
                    value={form.destination}
                    onChange={(e) => updateField("destination", e.target.value)}
                    placeholder="Pokhara, Kathmandu, Mustang"
                    list="ai-destination-options"
                  />
                </div>
                {fieldErrors.destination ? <small className="ai-field__error">{fieldErrors.destination}</small> : null}
              </label>

              <label className="ai-field">
                <span>Total budget (NPR)</span>
                <div className={`ai-field__control ${fieldErrors.budget ? "has-error" : ""}`}>
                  <Coins size={16} />
                  <input name="budget" value={form.budget} onChange={(e) => updateField("budget", e.target.value)} placeholder="15000" />
                </div>
                {fieldErrors.budget ? <small className="ai-field__error">{fieldErrors.budget}</small> : null}
              </label>

              <label className="ai-field">
                <span>Duration (days)</span>
                <div className={`ai-field__control ${fieldErrors.durationDays ? "has-error" : ""}`}>
                  <CalendarRange size={16} />
                  <input name="durationDays" value={form.durationDays} onChange={(e) => updateField("durationDays", e.target.value)} placeholder="3" />
                </div>
                {fieldErrors.durationDays ? <small className="ai-field__error">{fieldErrors.durationDays}</small> : null}
              </label>

              <label className="ai-field">
                <span>Trip start date</span>
                <div className="ai-field__control">
                  <CalendarRange size={16} />
                  <input
                    type="date"
                    name="startDate"
                    min={new Date().toISOString().split("T")[0]}
                    value={form.startDate}
                    onChange={(e) => updateField("startDate", e.target.value)}
                  />
                </div>
              </label>

              <div className="ai-inline-help ai-inline-help--wide">
                <strong>What makes this step good UX</strong>
                <p>Users only answer the minimum questions first: where, how long, and roughly how much they want to spend.</p>
              </div>
              <datalist id="ai-destination-options">
                {DESTINATION_SUGGESTIONS.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="ai-stack">
              <div className="ai-choice-group">
                <div className="ai-choice-group__head">
                  <h3>Pace</h3>
                  <p>Make this a visual choice instead of a plain dropdown.</p>
                </div>
                <div className="ai-choice-grid ai-choice-grid--three">
                  {PACE_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`ai-choice ${form.pace === item.value ? "is-active" : ""}`}
                      onClick={() => updateField("pace", item.value)}
                    >
                      <strong>{item.label}</strong>
                      <p>{item.copy}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="ai-choice-group">
                <div className="ai-choice-group__head">
                  <h3>Trip style</h3>
                  <p>Choose the travel focus you want the itinerary to optimize for.</p>
                </div>
                <div className="ai-choice-grid">
                  {STYLE_OPTIONS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        className={`ai-choice ${form.tripStyle === item.value ? "is-active" : ""}`}
                        onClick={() => updateField("tripStyle", item.value)}
                      >
                        <span className="ai-choice__icon"><Icon size={16} /></span>
                        <strong>{item.label}</strong>
                        <p>{item.copy}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ai-choice-group">
                <div className="ai-choice-group__head">
                  <h3>Who are you traveling with?</h3>
                  <p>This helps shape stop density and route tone.</p>
                </div>
                <div className="ai-choice-grid ai-choice-grid--four">
                  {COMPANION_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`ai-choice ${form.companionType === item.value ? "is-active" : ""}`}
                      onClick={() => updateField("companionType", item.value)}
                    >
                      <strong>{item.label}</strong>
                      <p>{item.copy}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="ai-choice-group">
                <div className="ai-choice-group__head">
                  <h3>Interests</h3>
                  <p>Pick at least one so the planner has a clear signal.</p>
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
                <label className="ai-field">
                  <span>Custom interests</span>
                  <div className={`ai-field__control ${fieldErrors.interests ? "has-error" : ""}`}>
                    <Sparkles size={16} />
                    <input
                      name="interests"
                      value={form.interests}
                      onChange={(e) => updateField("interests", e.target.value)}
                      placeholder="food, nature, sunrise"
                    />
                  </div>
                  {fieldErrors.interests ? <small className="ai-field__error">{fieldErrors.interests}</small> : <small>Use commas if you want to add custom interests.</small>}
                </label>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="ai-review">
              <div className="ai-review__grid">
                <article className="ai-review__card">
                  <span>Destination</span>
                  <strong>{form.destination || "Not set"}</strong>
                </article>
                <article className="ai-review__card">
                  <span>Budget</span>
                  <strong>{formatCurrency(form.budget)}</strong>
                </article>
                <article className="ai-review__card">
                  <span>Duration</span>
                  <strong>{form.durationDays || "--"} days</strong>
                </article>
                <article className="ai-review__card">
                  <span>Daily budget</span>
                  <strong>{budgetPerDay ? formatCurrency(budgetPerDay) : "--"}</strong>
                </article>
                <article className="ai-review__card">
                  <span>Pace</span>
                  <strong>{titleCase(form.pace)}</strong>
                </article>
                <article className="ai-review__card">
                  <span>Style</span>
                  <strong>{titleCase(form.tripStyle)}</strong>
                </article>
                <article className="ai-review__card">
                  <span>Companion</span>
                  <strong>{titleCase(form.companionType)}</strong>
                </article>
                <article className="ai-review__card">
                  <span>Interests</span>
                  <strong>{selectedInterests.length ? selectedInterests.join(", ") : "None selected"}</strong>
                </article>
              </div>
              <div className="ai-inline-help">
                <strong>Before generating</strong>
                <p>The recommended route will be saved automatically to My Trips, and you can still compare two extra planner options before regenerating.</p>
              </div>
            </div>
          ) : null}

          <div className="ai-actions">
            <button type="button" className="ai-nav-btn ai-nav-btn--ghost" onClick={goBack} disabled={step === 1 || loading}>
              <ChevronLeft size={16} />
              Back
            </button>

            <div className="ai-actions__right">
              {step < 3 ? (
                <button type="button" className="ai-nav-btn ai-nav-btn--primary" onClick={goNext}>
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button type="submit" className="ai-nav-btn ai-nav-btn--primary" disabled={loading}>
                  {loading ? "Generating..." : "Generate itinerary"}
                </button>
              )}
            </div>
          </div>
        </form>

        {error ? <p className="ai-error">{error}</p> : null}

        {loading ? (
          <section className="ai-loading">
            <div className="ai-loading__pulse" />
            <div>
              <p className="ai-panel__eyebrow">Generating</p>
              <h2>Building a better day-by-day route</h2>
              <p>Matching destinations, balancing cost, and spreading your stops into a more usable itinerary.</p>
            </div>
          </section>
        ) : null}

        {summary ? (
          <>
            <section className="ai-results-head">
              {alternatives.length > 0 ? (
                <div className="ai-option-grid">
                  {alternatives.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={`ai-option-card ${activeOptionKey === option.key ? "is-active" : ""}`}
                      onClick={() => setActiveOptionKey(option.key)}
                    >
                      <div className="ai-option-card__head">
                        <strong>{option.label}</strong>
                        <span>{option.isRecommended ? "Saved" : "Preview"}</span>
                      </div>
                      <p>{option.description}</p>
                      <div className="ai-option-card__meta">
                        <span>{formatCurrency(option?.summary?.totalEstimatedCost)}</span>
                        <span>{option?.summary?.pace || "--"}</span>
                        <span>{option?.summary?.tripStyle || "--"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="ai-results-head__grid">
                <article className="ai-review__card"><span>Estimated cost</span><strong>{formatCurrency(summary.totalEstimatedCost)}</strong></article>
                <article className="ai-review__card"><span>Budget gap</span><strong>{formatCurrency(summary.budgetGap)}</strong></article>
                <article className="ai-review__card"><span>Planned stops</span><strong>{totalPlaces}</strong></article>
                <article className="ai-review__card"><span>Route distance</span><strong>{routeDistanceKm > 0 ? `${routeDistanceKm.toFixed(1)} km` : "Map data pending"}</strong></article>
              </div>
              <div className="ai-result-strip">
                {resultHighlights.map((item) => (
                  <article key={item.label} className="ai-result-strip__item">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
              <div className="ai-quick-actions">
                {quickAdjustments.map((item) => (
                  <button key={item.label} type="button" className="ai-quick-actions__btn" onClick={item.run} disabled={loading}>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

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

                  {day.notes ? <p className="ai-day__notes">{day.notes}</p> : null}

                  <div className="ai-day__body">
                    <div>
                      <p className="ai-section-label">Timeline</p>
                      <div className="ai-timeline">
                        {(day.timeline || []).length > 0 ? (
                          day.timeline.map((item, index) => (
                            <div key={`${item.time}-${index}`} className="ai-timeline__item">
                              <div className="ai-timeline__time">{item.time}</div>
                              <div>
                                <p className="ai-timeline__title">{item.title}</p>
                                <p className="ai-timeline__detail">{item.details}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="ai-block">No timeline details for this day yet.</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="ai-section-label">Places</p>
                      <div className="ai-day__places">
                        {(day.places || []).length > 0 ? (
                          day.places.map((place, index) => (
                            <div key={`${place.name}-${index}`} className="ai-place">
                              <div>
                                <p className="ai-place__name">{place.name}</p>
                                <p className="ai-place__meta">{place.category || "Attraction"}</p>
                                {place.notes ? <p className="ai-place__detail">{place.notes}</p> : null}
                              </div>
                              <p className="ai-place__cost">{formatCurrency(place.estimatedCost)}</p>
                            </div>
                          ))
                        ) : (
                          <div className="ai-block">No places planned yet for this day.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="ai-result-actions">
              {itinerary?._id ? <Link to={`/itineraries/${itinerary?._id}`} className="ai-link ai-link--primary">Open itinerary details</Link> : <span className="ai-link ai-link--muted">Preview option only</span>}
              <Link to="/my-trips" className="ai-link ai-link--ghost">View in My Trips</Link>
            </div>
          </>
        ) : null}
      </div>

      <style>{`
        :root {
          --ai-navy: #133b61;
          --ai-sky: #2788c5;
          --ai-teal: #16806f;
          --ai-coral: #f6724a;
          --ai-ink: #13283f;
          --ai-muted: #627d96;
          --ai-line: rgba(190, 208, 223, 0.44);
          --ai-card: rgba(255, 255, 255, 0.88);
          --ai-shadow: 0 18px 42px rgba(19, 40, 63, 0.08);
          --ai-soft: rgba(245, 249, 252, 0.94);
        }

        .ai-planner {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          color: var(--ai-ink);
          font-family: "Plus Jakarta Sans", "Sora", "DM Sans", system-ui, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(102, 183, 243, 0.16), transparent 24%),
            radial-gradient(circle at 92% 10%, rgba(255, 164, 133, 0.14), transparent 18%),
            linear-gradient(180deg, #f8fbff 0%, #f2f7fb 54%, #edf3f9 100%);
        }

        .ai-planner__bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 22% 16%, rgba(72, 153, 255, 0.1), transparent 24%),
            radial-gradient(circle at 82% 8%, rgba(40, 190, 165, 0.08), transparent 20%);
          pointer-events: none;
        }

        .ai-planner__container {
          position: relative;
          max-width: 1180px;
          margin: 0 auto;
          padding: 20px 18px 48px;
        }

        .ai-hero,
        .ai-panel,
        .ai-loading,
        .ai-results-head,
        .ai-day {
          border: 1px solid var(--ai-line);
          border-radius: 28px;
          background: var(--ai-card);
          box-shadow: var(--ai-shadow);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .ai-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
          gap: 18px;
          padding: 22px;
        }

        .ai-kicker,
        .ai-panel__eyebrow,
        .ai-section-label {
          margin: 0 0 8px;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ai-sky);
        }

        .ai-hero h1,
        .ai-panel__head h2,
        .ai-loading h2,
        .ai-day__head h2 {
          margin: 0;
          color: var(--ai-navy);
        }

        .ai-hero h1 {
          font-size: clamp(1.9rem, 3vw, 3rem);
          line-height: 1.02;
          letter-spacing: -0.04em;
          max-width: 12ch;
        }

        .ai-lead {
          margin: 12px 0 0;
          max-width: 56ch;
          color: var(--ai-muted);
          line-height: 1.65;
        }

        .ai-prefill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 14px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(39, 136, 197, 0.08);
          color: var(--ai-navy);
          font-weight: 700;
        }

        .ai-summary-bar {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .ai-summary-bar__item,
        .ai-review__card,
        .ai-result-strip__item {
          padding: 14px;
          border-radius: 18px;
          background: var(--ai-soft);
          border: 1px solid rgba(214, 227, 238, 0.95);
        }

        .ai-summary-bar__item span,
        .ai-review__card span,
        .ai-result-strip__item span {
          display: block;
          margin-bottom: 6px;
          color: var(--ai-muted);
          font-size: 0.74rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .ai-summary-bar__item strong,
        .ai-review__card strong,
        .ai-result-strip__item strong {
          color: var(--ai-navy);
          display: block;
        }

        .ai-steps {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 14px 0;
        }

        .ai-step {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 18px;
          border: 1px solid rgba(214, 227, 238, 0.95);
          background: rgba(255, 255, 255, 0.7);
          cursor: pointer;
        }

        .ai-step span {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(39, 136, 197, 0.08);
          color: var(--ai-sky);
          font-size: 0.84rem;
          font-weight: 800;
        }

        .ai-step strong {
          color: var(--ai-navy);
        }

        .ai-step.is-active {
          border-color: rgba(39, 136, 197, 0.4);
          background: rgba(39, 136, 197, 0.08);
        }

        .ai-step.is-complete span {
          background: rgba(22, 128, 111, 0.12);
          color: var(--ai-teal);
        }

        .ai-panel {
          padding: 20px;
        }

        .ai-panel__head,
        .ai-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ai-grid,
        .ai-review__grid,
        .ai-choice-grid,
        .ai-results-head__grid,
        .ai-option-grid {
          display: grid;
          gap: 14px;
        }

        .ai-grid,
        .ai-review__grid,
        .ai-results-head__grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .ai-choice-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .ai-option-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-bottom: 14px;
        }

        .ai-choice-grid--three {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .ai-choice-grid--four {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .ai-stack {
          display: grid;
          gap: 20px;
        }

        .ai-choice-group__head h3 {
          margin: 0;
          color: var(--ai-navy);
        }

        .ai-choice-group__head p,
        .ai-inline-help p,
        .ai-day__notes,
        .ai-timeline__detail,
        .ai-place__meta,
        .ai-place__detail,
        .ai-loading p {
          margin: 6px 0 0;
          color: var(--ai-muted);
          line-height: 1.6;
        }

        .ai-choice {
          text-align: left;
          padding: 16px;
          border-radius: 18px;
          border: 1px solid rgba(214, 227, 238, 0.95);
          background: rgba(255, 255, 255, 0.76);
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .ai-choice:hover,
        .ai-option-card:hover,
        .ai-nav-btn:hover,
        .ai-pill:hover,
        .ai-quick-actions__btn:hover,
        .ai-link:hover,
        .ai-reset:hover {
          transform: translateY(-1px);
        }

        .ai-choice.is-active {
          border-color: rgba(39, 136, 197, 0.45);
          background: rgba(39, 136, 197, 0.08);
          box-shadow: 0 12px 24px rgba(39, 136, 197, 0.08);
        }

        .ai-option-card {
          text-align: left;
          padding: 16px;
          border-radius: 20px;
          border: 1px solid rgba(214, 227, 238, 0.95);
          background: rgba(255, 255, 255, 0.76);
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .ai-option-card.is-active {
          border-color: rgba(39, 136, 197, 0.45);
          background: rgba(39, 136, 197, 0.08);
          box-shadow: 0 12px 24px rgba(39, 136, 197, 0.08);
        }

        .ai-option-card__head,
        .ai-option-card__meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .ai-option-card__head strong {
          color: var(--ai-navy);
        }

        .ai-option-card__head span {
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(19, 59, 97, 0.08);
          color: var(--ai-navy);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .ai-option-card p {
          margin: 8px 0 0;
          color: var(--ai-muted);
          line-height: 1.6;
        }

        .ai-option-card__meta {
          margin-top: 12px;
          flex-wrap: wrap;
          color: var(--ai-sky);
          font-size: 0.8rem;
          font-weight: 700;
        }

        .ai-choice strong {
          display: block;
          color: var(--ai-navy);
          margin-bottom: 4px;
        }

        .ai-choice p {
          margin: 0;
          color: var(--ai-muted);
          line-height: 1.5;
        }

        .ai-choice__icon {
          display: inline-flex;
          margin-bottom: 10px;
          color: var(--ai-sky);
        }

        .ai-interest-picks {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 12px;
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
        }

        .ai-field__control {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 52px;
          padding: 0 14px;
          border-radius: 16px;
          border: 1px solid rgba(194, 210, 224, 0.9);
          background: rgba(250, 252, 255, 0.98);
          color: #5b7894;
        }

        .ai-field__control.has-error {
          border-color: rgba(215, 80, 80, 0.55);
          box-shadow: 0 0 0 4px rgba(215, 80, 80, 0.08);
        }

        .ai-field__control input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: var(--ai-ink);
          font-size: 0.96rem;
        }

        .ai-field__error,
        .ai-error {
          color: #b34040;
          font-weight: 700;
        }

        .ai-inline-help {
          padding: 16px 18px;
          border-radius: 18px;
          background: rgba(39, 136, 197, 0.06);
          border: 1px solid rgba(39, 136, 197, 0.12);
        }

        .ai-inline-help strong {
          color: var(--ai-navy);
          display: block;
        }

        .ai-inline-help--wide {
          grid-column: 1 / -1;
        }

        .ai-pill,
        .ai-reset,
        .ai-nav-btn,
        .ai-quick-actions__btn {
          border: 1px solid rgba(209, 223, 236, 0.96);
          background: rgba(244, 248, 252, 0.96);
          color: #315170;
          border-radius: 999px;
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .ai-pill {
          padding: 9px 12px;
          font-size: 0.83rem;
          font-weight: 700;
          text-transform: capitalize;
        }

        .ai-pill.is-active {
          color: #fff;
          background: linear-gradient(135deg, var(--ai-navy), #3f95cb);
          border-color: transparent;
        }

        .ai-reset,
        .ai-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 44px;
          padding: 0 16px;
          font-weight: 800;
        }

        .ai-nav-btn--primary,
        .ai-link--primary {
          background: linear-gradient(135deg, var(--ai-coral), #ff9368);
          color: #fff;
          border-color: transparent;
        }

        .ai-nav-btn:disabled,
        .ai-quick-actions__btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .ai-actions__right {
          display: flex;
          gap: 10px;
        }

        .ai-error {
          margin: 14px 0 0;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(248, 169, 169, 0.78);
          background: rgba(255, 238, 238, 0.9);
        }

        .ai-loading,
        .ai-results-head {
          margin-top: 16px;
          padding: 20px;
        }

        .ai-loading {
          display: grid;
          grid-template-columns: 90px minmax(0, 1fr);
          gap: 18px;
          align-items: center;
        }

        .ai-loading__pulse {
          width: 90px;
          height: 90px;
          border-radius: 24px;
          background:
            radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.82), transparent 24%),
            linear-gradient(135deg, rgba(17, 54, 93, 0.98), rgba(74, 161, 198, 0.9));
          animation: aiPulse 1.8s ease-in-out infinite;
        }

        @keyframes aiPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.04); opacity: 1; }
        }

        .ai-result-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }

        .ai-quick-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
        }

        .ai-quick-actions__btn {
          padding: 10px 14px;
          font-weight: 800;
        }

        .ai-days {
          display: grid;
          gap: 16px;
          margin-top: 16px;
        }

        .ai-day {
          padding: 22px;
        }

        .ai-day__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 10px;
        }

        .ai-day__badge {
          margin: 0 0 8px;
          color: var(--ai-sky);
          font-size: 0.78rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .ai-day__cost,
        .ai-place__cost {
          margin: 0;
          color: var(--ai-teal);
          font-weight: 800;
          white-space: nowrap;
        }

        .ai-day__body {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          gap: 18px;
          margin-top: 16px;
        }

        .ai-timeline,
        .ai-day__places {
          display: grid;
          gap: 12px;
        }

        .ai-timeline__item,
        .ai-place,
        .ai-block {
          padding: 14px 16px;
          border-radius: 18px;
          border: 1px solid rgba(220, 230, 238, 0.96);
          background: rgba(248, 251, 254, 0.96);
        }

        .ai-timeline__item {
          display: grid;
          grid-template-columns: 84px minmax(0, 1fr);
          gap: 12px;
        }

        .ai-timeline__time {
          color: var(--ai-sky);
          font-size: 0.82rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .ai-timeline__title,
        .ai-place__name {
          margin: 0 0 4px;
          color: var(--ai-navy);
          font-weight: 800;
        }

        .ai-place {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .ai-result-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 18px;
        }

        .ai-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 0 18px;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 800;
        }

        .ai-link--ghost {
          background: rgba(255, 255, 255, 0.72);
          color: var(--ai-navy);
          border: 1px solid rgba(209, 223, 236, 0.96);
        }

        .ai-link--muted {
          background: rgba(19, 59, 97, 0.08);
          color: var(--ai-muted);
          border: 1px solid rgba(209, 223, 236, 0.96);
        }

        @media (max-width: 980px) {
          .ai-hero,
          .ai-loading,
          .ai-day__body,
          .ai-choice-grid--three,
          .ai-choice-grid--four,
          .ai-option-grid {
            grid-template-columns: 1fr;
          }

          .ai-grid,
          .ai-review__grid,
          .ai-choice-grid,
          .ai-result-strip,
          .ai-results-head__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 680px) {
          .ai-planner__container {
            padding: 16px 14px 40px;
          }

          .ai-steps,
          .ai-grid,
          .ai-review__grid,
          .ai-summary-bar,
          .ai-choice-grid,
          .ai-result-strip,
          .ai-results-head__grid,
          .ai-option-grid {
            grid-template-columns: 1fr;
          }

          .ai-day__head,
          .ai-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .ai-place,
          .ai-timeline__item {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
