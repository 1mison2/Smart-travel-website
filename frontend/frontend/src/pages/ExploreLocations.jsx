import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  Compass,
  MapPinned,
  Mountain,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import api, { resolveImageUrl } from "../utils/api";

function getParentId(location) {
  if (!location?.parentLocationId) return "";
  if (typeof location.parentLocationId === "string") return location.parentLocationId;
  return location.parentLocationId?._id || "";
}

function formatCategory(category, fallback = "Destination") {
  return String(category || fallback)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSearchBlob(location) {
  return [
    location.name,
    location.province,
    location.district,
    location.category,
    location.description,
    location.parentLocationId?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getScenicGradient(index) {
  const gradients = [
    "linear-gradient(135deg, #1d4ed8 0%, #0f766e 52%, #f59e0b 100%)",
    "linear-gradient(135deg, #7c3aed 0%, #2563eb 48%, #22c55e 100%)",
    "linear-gradient(135deg, #0f766e 0%, #14b8a6 48%, #fb7185 100%)",
    "linear-gradient(135deg, #4338ca 0%, #06b6d4 50%, #f97316 100%)",
  ];
  return gradients[index % gradients.length];
}

function getHeroArtwork(item, index) {
  if (item?.image) return `url(${resolveImageUrl(item.image)})`;
  return getScenicGradient(index);
}

function getScopeLabel(scope) {
  if (scope === "hubs") return "Hubs";
  if (scope === "places") return "Places";
  return "All";
}

function buildSearchParams({ query, scope, activeCategory }) {
  const next = new URLSearchParams();
  const trimmedQuery = String(query || "").trim();
  if (trimmedQuery) next.set("q", trimmedQuery);
  if (scope && scope !== "all") next.set("type", scope);
  if (activeCategory && activeCategory !== "all") next.set("category", activeCategory);
  return next;
}

function createSkeletonItems(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `skeleton-${index}` }));
}

export default function ExploreLocations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [scope, setScope] = useState(() => {
    const value = searchParams.get("type");
    return ["all", "hubs", "places"].includes(value || "") ? value : "all";
  });
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get("category") || "all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleHubCount, setVisibleHubCount] = useState(4);
  const [visiblePlaceCount, setVisiblePlaceCount] = useState(6);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/locations");
        if (!active) return;
        setLocations(Array.isArray(data) ? data : []);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load locations");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const nextQuery = searchParams.get("q") || "";
    const nextScope = ["all", "hubs", "places"].includes(searchParams.get("type") || "")
      ? searchParams.get("type") || "all"
      : "all";
    const nextCategory = searchParams.get("category") || "all";

    if (nextQuery !== query) setQuery(nextQuery);
    if (nextScope !== scope) setScope(nextScope);
    if (nextCategory !== activeCategory) setActiveCategory(nextCategory);
  }, [activeCategory, query, scope, searchParams]);

  const normalizedLocations = useMemo(
    () =>
      locations.map((location, index) => {
        const isHub = !getParentId(location);
        const shortDescription = String(location.description || "").trim();
        return {
          ...location,
          isHub,
          searchBlob: getSearchBlob(location),
          label: formatCategory(location.category, isHub ? "Destination hub" : "Place"),
          regionLabel:
            [location.district, location.province].filter(Boolean).join(", ") ||
            (isHub ? "Nepal travel hub" : "Inside Nepal"),
          shortDescription:
            shortDescription.length > 88
              ? `${shortDescription.slice(0, 88).trim()}...`
              : shortDescription || (isHub ? "Open this destination to explore it." : "A strong next stop for your trip."),
          scenicBackground: getScenicGradient(index),
        };
      }),
    [locations]
  );

  const categoryOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        normalizedLocations
          .map((location) =>
            formatCategory(location.category, location.isHub ? "Destination hub" : "Place")
          )
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
    return ["all", ...values];
  }, [normalizedLocations]);

  useEffect(() => {
    if (activeCategory !== "all" && !categoryOptions.includes(activeCategory)) {
      setActiveCategory("all");
    }
  }, [activeCategory, categoryOptions]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return normalizedLocations.filter((location) => {
      if (scope === "hubs" && !location.isHub) return false;
      if (scope === "places" && location.isHub) return false;
      if (activeCategory !== "all" && location.label !== activeCategory) return false;
      if (!keyword) return true;
      return location.searchBlob.includes(keyword);
    });
  }, [activeCategory, normalizedLocations, query, scope]);

  const hubLocations = useMemo(
    () => filtered.filter((location) => location.isHub),
    [filtered]
  );

  const placeLocations = useMemo(
    () => filtered.filter((location) => !location.isHub),
    [filtered]
  );

  const topCategories = categoryOptions.filter((item) => item !== "all").slice(0, 6);
  const visibleHubs = hubLocations.slice(0, visibleHubCount);
  const visiblePlaces = placeLocations.slice(0, visiblePlaceCount);
  const hasMoreHubs = visibleHubCount < hubLocations.length;
  const hasMorePlaces = visiblePlaceCount < placeLocations.length;
  const activeFilterCount = (scope !== "all" ? 1 : 0) + (activeCategory !== "all" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const activeFilterChips = [
    ...(scope !== "all" ? [{ key: "scope", label: `Type: ${getScopeLabel(scope)}` }] : []),
    ...(activeCategory !== "all"
      ? [{ key: "category", label: `Category: ${activeCategory}` }]
      : []),
  ];

  useEffect(() => {
    setVisibleHubCount(4);
    setVisiblePlaceCount(6);
  }, [query, scope, activeCategory]);

  useEffect(() => {
    const next = buildSearchParams({ query, scope, activeCategory });
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [activeCategory, query, scope, searchParams, setSearchParams]);

  const clearFilters = () => {
    setScope("all");
    setActiveCategory("all");
  };

  const hubSkeletons = createSkeletonItems(4);
  const placeSkeletons = createSkeletonItems(6);

  return (
    <div className="explore-page">
      <section className="explore-page__hero">
        <div className="explore-page__hero-copy">
          <p className="explore-page__eyebrow">Destinations</p>
          <h1>Browse destinations</h1>

          <div className="explore-page__search-wrap">
            <Search size={18} />
            <input
              className="explore-page__search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search destination, district, province, or category"
            />
          </div>

          {activeFilterChips.length ? (
            <div className="explore-active-filters">
              {activeFilterChips.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="explore-active-chip"
                  onClick={() => {
                    if (item.key === "scope") setScope("all");
                    if (item.key === "category") setActiveCategory("all");
                  }}
                >
                  {item.label}
                  <X size={13} />
                </button>
              ))}
              <button type="button" className="explore-active-clear" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          ) : null}

          <div className="explore-toolbar">
            <div className="explore-toolbar__intro">
              <button
                type="button"
                className={`explore-toolbar__label ${filtersOpen ? "is-open" : ""}`}
                onClick={() => setFiltersOpen((current) => !current)}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal size={15} />
                {activeFilterCount ? `Filters (${activeFilterCount})` : "Filters"}
                <ChevronDown size={15} />
              </button>
            </div>

            {filtersOpen ? (
              <div className="explore-filter-groups">
                <div className="explore-filter-group">
                  <div className="explore-filter-group__header">
                    <span className="explore-filter-group__title">Type</span>
                    {scope !== "all" ? (
                      <button type="button" className="explore-filter-reset" onClick={() => setScope("all")}>
                        Reset
                      </button>
                    ) : null}
                  </div>
                  <div className="explore-segmented">
                    {[
                      { id: "all", label: "All" },
                      { id: "hubs", label: "Hubs" },
                      { id: "places", label: "Places" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`explore-segmented__option ${scope === item.id ? "is-active" : ""}`}
                        onClick={() => setScope(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="explore-filter-group">
                  <div className="explore-filter-group__header">
                    <span className="explore-filter-group__title">Category</span>
                    {activeCategory !== "all" ? (
                      <button type="button" className="explore-filter-reset" onClick={() => setActiveCategory("all")}>
                        Reset
                      </button>
                    ) : null}
                  </div>
                  <div className="explore-toolbar__chips">
                    <button
                      type="button"
                      className={`explore-chip ${activeCategory === "all" ? "is-active" : ""}`}
                      onClick={() => setActiveCategory("all")}
                    >
                      All categories
                    </button>
                    {topCategories.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`explore-chip ${activeCategory === item ? "is-active" : ""}`}
                        onClick={() => setActiveCategory(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {hasActiveFilters ? (
                  <div className="explore-filter-actions">
                    <button type="button" className="explore-btn explore-btn--secondary" onClick={clearFilters}>
                      Clear all filters
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="explore-page__summary">
            <span>{filtered.length} shown</span>
            <span>{normalizedLocations.length} total</span>
          </div>
        </div>
      </section>

      {error ? <p className="explore-page__error">{error}</p> : null}

      {loading ? (
        <>
          <section className="explore-section">
            <div className="explore-section__head">
              <div><h2>Destination hubs</h2></div>
            </div>
            <div className="explore-grid explore-grid--hero">
              {hubSkeletons.map((item) => (
                <article key={item.id} className="explore-card explore-card--skeleton">
                  <div className="explore-skeleton explore-skeleton__media" />
                  <div className="explore-card__body">
                    <div className="explore-skeleton explore-skeleton__line explore-skeleton__line--lg" />
                    <div className="explore-skeleton explore-skeleton__line" />
                    <div className="explore-skeleton explore-skeleton__line explore-skeleton__line--sm" />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="explore-section">
            <div className="explore-section__head">
              <div><h2>Places</h2></div>
            </div>
            <div className="explore-grid">
              {placeSkeletons.map((item) => (
                <article key={item.id} className="explore-card explore-card--skeleton">
                  <div className="explore-skeleton explore-skeleton__media" />
                  <div className="explore-card__body">
                    <div className="explore-skeleton explore-skeleton__line explore-skeleton__line--lg" />
                    <div className="explore-skeleton explore-skeleton__line" />
                    <div className="explore-skeleton explore-skeleton__line explore-skeleton__line--sm" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {!loading && !filtered.length ? (
        <div className="explore-empty">
          <div className="explore-empty__icon">
            <Search size={22} />
          </div>
          <h2>No matching locations</h2>
          <p>Try a broader keyword or clear the active filters.</p>
          {hasActiveFilters ? (
            <button type="button" className="explore-btn explore-btn--secondary" onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && !!hubLocations.length && (
        <section className="explore-section">
          <div className="explore-section__head">
            <div>
              <h2>Destination hubs</h2>
            </div>
            <span className="explore-section__count">{hubLocations.length} results</span>
          </div>

          <div className="explore-grid explore-grid--hero">
            {visibleHubs.map((location, index) => (
              <article key={location._id} className="explore-card explore-card--hub">
                <div
                  className="explore-card__media"
                  style={{ backgroundImage: getHeroArtwork(location, index) }}
                >
                  <div className="explore-card__shade" />
                  <span className="explore-card__pill">
                    <Mountain size={14} />
                    {location.label}
                  </span>
                  <div className="explore-card__media-copy">
                    <h3>{location.name}</h3>
                  </div>
                </div>
                <div className="explore-card__body">
                  <div className="explore-card__meta-row">
                    <span><MapPinned size={15} />{location.regionLabel}</span>
                  </div>
                  <p className="explore-card__description">{location.shortDescription}</p>
                  <Link to={`/locations/${location._id}`} className="explore-btn explore-btn--secondary">
                    Open destination
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {hasMoreHubs ? (
            <div className="explore-section__footer">
              <button
                type="button"
                className="explore-btn explore-btn--secondary"
                onClick={() => setVisibleHubCount((count) => count + 4)}
              >
                See more destinations
              </button>
            </div>
          ) : null}
        </section>
      )}

      {!loading && !!placeLocations.length && (
        <section className="explore-section">
          <div className="explore-section__head">
            <div>
              <h2>Places</h2>
            </div>
            <span className="explore-section__count">{placeLocations.length} results</span>
          </div>

          <div className="explore-grid">
            {visiblePlaces.map((location, index) => (
              <article key={location._id} className="explore-card">
                <div
                  className="explore-card__media explore-card__media--compact"
                  style={{ backgroundImage: getHeroArtwork(location, index + 2) }}
                >
                  <div className="explore-card__shade" />
                  <span className="explore-card__pill">
                    <Compass size={14} />
                    {location.label}
                  </span>
                </div>
                <div className="explore-card__body">
                  <div className="explore-card__title-row">
                    <h3>{location.name}</h3>
                    {location.parentLocationId?.name ? (
                      <span className="explore-mini-tag">Inside {location.parentLocationId.name}</span>
                    ) : null}
                  </div>
                  <div className="explore-card__meta-row">
                    <span><MapPinned size={15} />{location.regionLabel}</span>
                  </div>
                  <p className="explore-card__description">{location.shortDescription}</p>
                  <Link to={`/locations/${location._id}`} className="explore-btn explore-btn--secondary">
                    View place
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {hasMorePlaces ? (
            <div className="explore-section__footer">
              <button
                type="button"
                className="explore-btn explore-btn--secondary"
                onClick={() => setVisiblePlaceCount((count) => count + 6)}
              >
                See more places
              </button>
            </div>
          ) : null}
        </section>
      )}

      <style>{`
        .explore-page {
          --explore-ink: #0f172a;
          --explore-muted: #52607a;
          --explore-line: rgba(148, 163, 184, 0.22);
          --explore-card: rgba(255, 255, 255, 0.82);
          max-width: 1240px;
          margin: 0 auto;
          padding: 24px 20px 72px;
          color: var(--explore-ink);
          font-family: "Manrope", "Plus Jakarta Sans", system-ui, sans-serif;
        }

        .explore-page__hero {
          display: block;
          padding: 24px;
          border-radius: 28px;
          background:
            radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 30%),
            radial-gradient(circle at right bottom, rgba(249, 115, 22, 0.18), transparent 26%),
            linear-gradient(145deg, #f8fbff 0%, #fff7ed 48%, #f8fafc 100%);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 30px 70px rgba(15, 23, 42, 0.1);
          overflow: hidden;
          position: relative;
        }

        .explore-page__hero-copy {
          position: relative;
          z-index: 1;
        }

        .explore-page__eyebrow {
          margin: 0 0 10px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 0.72rem;
          font-weight: 800;
          color: #0f766e;
        }

        .explore-page__hero h1 {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(2.2rem, 3vw, 3.6rem);
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .explore-page__search-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          padding: 14px 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
        }

        .explore-page__search-wrap svg {
          flex: 0 0 auto;
          color: #64748b;
        }

        .explore-page__search {
          width: 100%;
          border: 0;
          background: transparent;
          padding: 0;
          font-size: 0.96rem;
          color: var(--explore-ink);
          outline: none;
        }

        .explore-active-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .explore-active-chip,
        .explore-active-clear,
        .explore-filter-reset {
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .explore-active-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid var(--explore-line);
          color: #334155;
          font-size: 0.82rem;
          font-weight: 700;
        }

        .explore-active-clear,
        .explore-filter-reset {
          color: #2563eb;
          font-size: 0.82rem;
          font-weight: 800;
        }

        .explore-toolbar {
          display: grid;
          gap: 14px;
          margin-top: 20px;
        }

        .explore-toolbar__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .explore-chip {
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.78);
          color: #334155;
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease;
        }

        .explore-chip:hover,
        .explore-chip.is-active {
          transform: translateY(-1px);
        }

        .explore-chip.is-active {
          color: #ffffff;
          background: linear-gradient(135deg, #0f766e, #2563eb);
          border-color: transparent;
        }

        .explore-page__summary {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 18px;
          color: var(--explore-muted);
          font-size: 0.88rem;
          font-weight: 700;
        }

        .explore-card__shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.12), rgba(15, 23, 42, 0.72));
        }

        .explore-card__pill,
        .explore-mini-tag,
        .explore-section__count,
        .explore-toolbar__label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .explore-card__pill {
          width: fit-content;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.24);
          backdrop-filter: blur(10px);
          padding: 8px 12px;
        }

        .explore-filter-groups {
          display: grid;
          gap: 14px;
          padding: 16px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.74);
        }

        .explore-filter-group {
          display: grid;
          gap: 8px;
        }

        .explore-filter-group__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .explore-filter-group__title {
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #52607a;
        }

        .explore-filter-actions {
          display: flex;
          justify-content: flex-start;
        }

        .explore-section__head h2 {
          margin: 0;
          font-size: clamp(1.6rem, 2vw, 2.2rem);
          letter-spacing: -0.04em;
        }

        .explore-toolbar__label {
          appearance: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid var(--explore-line);
          color: #334155;
          cursor: pointer;
          transition: background 180ms ease, transform 180ms ease;
        }

        .explore-toolbar__label svg:last-child {
          transition: transform 180ms ease;
        }

        .explore-toolbar__label:hover {
          transform: translateY(-1px);
        }

        .explore-toolbar__label.is-open svg:last-child {
          transform: rotate(180deg);
        }

        .explore-segmented {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 6px;
          width: fit-content;
          padding: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid var(--explore-line);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }

        .explore-segmented__option {
          border: 0;
          background: transparent;
          color: #334155;
          border-radius: 999px;
          padding: 10px 16px;
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
          transition: background 180ms ease, color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
        }

        .explore-segmented__option:hover {
          transform: translateY(-1px);
        }

        .explore-segmented__option.is-active {
          color: #ffffff;
          background: linear-gradient(135deg, #0f766e, #2563eb);
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.2);
        }

        .explore-page__error {
          margin: 18px 4px 0;
          font-size: 0.94rem;
          color: #b91c1c;
        }

        .explore-empty {
          display: grid;
          justify-items: center;
          gap: 10px;
          margin-top: 24px;
          padding: 34px 28px;
          border-radius: 28px;
          border: 1px dashed rgba(148, 163, 184, 0.42);
          background: rgba(255, 255, 255, 0.74);
          text-align: center;
        }

        .explore-empty__icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #e0f2fe;
          color: #0369a1;
        }

        .explore-empty h2,
        .explore-empty p {
          margin: 0;
        }

        .explore-empty p {
          color: var(--explore-muted);
        }

        .explore-section {
          margin-top: 34px;
        }

        .explore-section__head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: end;
          margin-bottom: 16px;
        }

        .explore-section__count {
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid var(--explore-line);
          color: #334155;
        }

        .explore-section__footer {
          display: flex;
          justify-content: center;
          margin-top: 18px;
        }

        .explore-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .explore-grid--hero {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .explore-card {
          display: grid;
          grid-template-rows: 220px 1fr;
          min-height: 100%;
          border-radius: 28px;
          overflow: hidden;
          background: var(--explore-card);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 22px 46px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(14px);
          transition: transform 180ms ease, box-shadow 180ms ease;
        }

        .explore-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 28px 56px rgba(15, 23, 42, 0.12);
        }

        .explore-card--skeleton {
          pointer-events: none;
        }

        .explore-card__media {
          position: relative;
          background-size: cover;
          background-position: center;
          padding: 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .explore-card__media--compact {
          min-height: 220px;
        }

        .explore-card__media-copy {
          position: relative;
          z-index: 1;
        }

        .explore-card__media-copy h3 {
          margin: 0;
          color: #ffffff;
          font-size: 1.8rem;
          line-height: 1;
          letter-spacing: -0.04em;
          font-family: "Playfair Display", Georgia, serif;
        }

        .explore-card__body {
          display: grid;
          align-content: start;
          gap: 12px;
          padding: 18px;
        }

        .explore-card__title-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .explore-card__title-row h3 {
          margin: 0;
          font-size: 1.18rem;
          letter-spacing: -0.03em;
        }

        .explore-mini-tag {
          padding: 7px 10px;
          background: #e0f2fe;
          color: #075985;
        }

        .explore-card__description {
          margin: 0;
          color: #334155;
          font-size: 0.92rem;
          line-height: 1.65;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .explore-card__meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 14px;
          color: var(--explore-muted);
          font-size: 0.85rem;
        }

        .explore-card__meta-row span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .explore-skeleton {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, rgba(226, 232, 240, 0.75), rgba(248, 250, 252, 0.95), rgba(226, 232, 240, 0.75));
          background-size: 200% 100%;
          animation: exploreSkeleton 1.5s ease-in-out infinite;
          border-radius: 16px;
        }

        .explore-skeleton__media {
          min-height: 220px;
          border-radius: 0;
        }

        .explore-skeleton__line {
          height: 14px;
        }

        .explore-skeleton__line--lg {
          width: 72%;
        }

        .explore-skeleton__line--sm {
          width: 46%;
        }

        @keyframes exploreSkeleton {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .explore-btn {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
          border-radius: 999px;
          padding: 11px 16px;
          font-size: 0.88rem;
          font-weight: 800;
          transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }

        .explore-btn:hover {
          transform: translateY(-1px);
        }

        .explore-btn--secondary {
          color: #0f172a;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid var(--explore-line);
        }

        @media (max-width: 1100px) {
          .explore-grid,
          .explore-grid--hero {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .explore-page {
            padding: 20px 14px 56px;
          }

          .explore-page__hero {
            padding: 20px;
            border-radius: 28px;
          }

          .explore-page__hero h1 {
            font-size: clamp(2.2rem, 11vw, 3.4rem);
          }

          .explore-section__head {
            flex-direction: column;
            align-items: start;
          }

          .explore-segmented {
            width: 100%;
          }

          .explore-segmented__option {
            flex: 1 1 0;
            justify-content: center;
          }

          .explore-grid,
          .explore-grid--hero {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
