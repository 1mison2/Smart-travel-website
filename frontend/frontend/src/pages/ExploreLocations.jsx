import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Filter,
  Heart,
  MapPin,
  Mountain,
  PawPrint,
  Search,
  Sprout,
  TentTree,
} from "lucide-react";
import api, { resolveImageUrl } from "../utils/api";

const hubCards = [
  {
    name: "Lumbini",
    subtitle: "Rupandehi, Lumbini",
    category: "Cultural",
    tags: ["cultural", "heritage", "pilgrimage", "temple"],
    image:
      "https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1200&q=82",
    description:
      "Lumbini is the birthplace of Siddhartha Gautama Buddha and one of Nepal's most important spiritual destinations.",
  },
  {
    name: "Mustang",
    subtitle: "Mustang, Gandaki",
    category: "Mountains",
    tags: ["mountains", "trekking", "culture", "desert", "viewpoint"],
    image:
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=82",
    description:
      "Mustang is Nepal's high-altitude desert region known for dramatic landscapes, Tibetan-influenced culture, and long scenic road journeys.",
  },
  {
    name: "Chitwan",
    subtitle: "Chitwan, Bagmati",
    category: "Wildlife",
    tags: ["wildlife", "jungle", "safari", "nature"],
    image:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=82",
    description:
      "Chitwan is Nepal's leading lowland wildlife destination, known for jungle safaris, Tharu culture, river canoeing, and forest trails.",
  },
  {
    name: "Kathmandu",
    subtitle: "Kathmandu, Bagmati",
    category: "Cultural",
    tags: ["cultural", "heritage", "temple", "museum"],
    image:
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=82",
    description:
      "Kathmandu is Nepal's historic capital, known for UNESCO heritage sites, temple squares, old markets, and layered city culture.",
  },
];

const placeCards = [
  {
    name: "Tilaurakot",
    subtitle: "Archaeological",
    parent: "Inside Lumbini",
    tags: ["cultural", "archaeological", "heritage"],
    image:
      "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=900&q=82",
    description:
      "Tilaurakot is an important archaeological site associated with ancient Kapilavastu and the early life context of Buddha before renunciation.",
  },
  {
    name: "German Monastery",
    subtitle: "Monastery",
    parent: "Inside Lumbini",
    tags: ["cultural", "monastery", "art"],
    image:
      "https://images.unsplash.com/photo-1578922746465-3a80a228f223?auto=format&fit=crop&w=900&q=82",
    description:
      "The German Monastery area is admired for colourful Buddhist art, detailed murals, garden spaces, and a calm western monastic atmosphere.",
  },
  {
    name: "Myanmar Golden Temple",
    subtitle: "Temple",
    parent: "Inside Lumbini",
    tags: ["cultural", "temple", "monastery"],
    image:
      "https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=900&q=82",
    description:
      "The Myanmar Golden Temple is one of Lumbini's visually striking monasteries, with golden features and Burmese Buddhist influence.",
  },
  {
    name: "Royal Thai Monastery",
    subtitle: "Monastery",
    parent: "Inside Lumbini",
    tags: ["cultural", "monastery", "architecture"],
    image:
      "https://images.unsplash.com/photo-1569396786344-80df73f758bb?auto=format&fit=crop&w=900&q=82",
    description:
      "The Royal Thai Monastery is known for its elegant white architecture, quiet courtyards, and Thai Buddhist design within Lumbini.",
  },
];

const filters = [
  { label: "All", icon: Filter },
  { label: "Mountains", icon: Mountain },
  { label: "Cultural", icon: Sprout },
  { label: "Wildlife", icon: PawPrint },
  { label: "Trekking", icon: TentTree },
];

const viewModes = ["All", "Hubs", "Places"];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

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

function shortText(value, maxLength = 132) {
  const text = String(value || "").trim();
  if (!text) return "Open this destination to explore nearby highlights, stays, routes, and local travel ideas.";
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function getLocationImage(location, fallback) {
  const image = location?.image || location?.images?.[0];
  return image ? resolveImageUrl(image) : fallback;
}

function applyLiveLocationImages(cards, locationLookup) {
  return cards.map((card) => {
    const location = locationLookup.get(normalize(card.name));
    if (!location) return card;
    return {
      ...card,
      image: getLocationImage(location, card.image),
    };
  });
}

function getSearchText(card) {
  return normalize(
    [
      card.name,
      card.subtitle,
      card.parent,
      card.category,
      card.description,
      ...(card.tags || []),
    ].join(" ")
  );
}

function getAutoTags(location, parent) {
  const text = normalize(
    [location?.name, location?.category, location?.description, parent?.name, location?.district, location?.province].join(" ")
  );
  const tags = [];

  if (/pokhara|mustang|mountain|viewpoint|lake|cave|nature|sarangkot|pumdikot/.test(text)) tags.push("mountains");
  if (/pokhara|mustang|trek|hike|trail|viewpoint|sarangkot|dhampus|panchase|australian camp/.test(text)) tags.push("trekking");
  if (/pokhara|lumbini|kathmandu|cultural|temple|monastery|museum|heritage|archaeological|pagoda|stupa/.test(text)) tags.push("cultural");
  if (/chitwan|wildlife|jungle|safari|forest|bird|nature/.test(text)) tags.push("wildlife");

  return tags;
}

function matchesActiveFilter(card, activeFilter) {
  if (activeFilter === "All") return true;
  const text = getSearchText(card);

  if (activeFilter === "Mountains") {
    return /mountains|mountain|viewpoint|lake|cave|nature|pokhara|mustang|sarangkot/.test(text);
  }

  if (activeFilter === "Cultural") {
    return /cultural|culture|temple|monastery|museum|heritage|archaeological|pagoda|stupa|lumbini|kathmandu|pokhara/.test(text);
  }

  if (activeFilter === "Wildlife") {
    return /wildlife|jungle|safari|forest|bird|nature|chitwan/.test(text);
  }

  if (activeFilter === "Trekking") {
    return /trekking|trek|hike|trail|mountain|viewpoint|pokhara|mustang|sarangkot|dhampus|panchase|australian camp/.test(text);
  }

  return true;
}

function getLocationLink(card, locationLookup) {
  if (card.href) return card.href;
  const location = locationLookup.get(normalize(card.name));
  return location?._id ? `/locations/${location._id}` : "/explore";
}

export default function ExploreLocations() {
  const [locations, setLocations] = useState([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [viewMode, setViewMode] = useState("All");
  const [visibleHubCount, setVisibleHubCount] = useState(10);
  const [visiblePlaceCount, setVisiblePlaceCount] = useState(8);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      try {
        const { data } = await api.get("/api/locations");
        if (active) {
          setLocations(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        if (active) setError(err?.response?.data?.message || "Unable to refresh live destination links.");
      }
    }

    loadLocations();
    return () => {
      active = false;
    };
  }, []);

  const locationLookup = useMemo(() => {
    return new Map(locations.map((location) => [normalize(location.name), location]));
  }, [locations]);

  const parentLookup = useMemo(() => {
    return new Map(locations.map((location) => [String(location._id), location]));
  }, [locations]);

  const liveCards = useMemo(() => {
    const curatedNames = new Set([...hubCards, ...placeCards].map((card) => normalize(card.name)));
    const hubs = [];
    const places = [];

    locations.forEach((location, index) => {
      if (!location?._id || curatedNames.has(normalize(location.name))) return;

      const parentId = getParentId(location);
      const parent = parentId ? parentLookup.get(String(parentId)) : null;
      const isHub = !parentId;
      const card = {
        name: location.name || "Destination",
        subtitle: isHub
          ? [location.district, location.province].filter(Boolean).join(", ") || "Nepal"
          : formatCategory(location.category, "Place"),
        parent: parent?.name ? `Inside ${parent.name}` : "Inside Nepal",
        category: formatCategory(location.category, isHub ? "Destination" : "Place"),
        tags: getAutoTags(location, parent),
        image: getLocationImage(location, isHub ? hubCards[index % hubCards.length].image : placeCards[index % placeCards.length].image),
        description: shortText(location.description),
        href: `/locations/${location._id}`,
      };

      if (isHub) hubs.push(card);
      else places.push(card);
    });

    return { hubs, places };
  }, [locations, parentLookup]);

  const keyword = normalize(query);
  const allHubCards = [...applyLiveLocationImages(hubCards, locationLookup), ...liveCards.hubs];
  const allPlaceCards = [...applyLiveLocationImages(placeCards, locationLookup), ...liveCards.places];
  const shownHubs = allHubCards.filter((card) => {
    const matchesText = !keyword || getSearchText(card).includes(keyword);
    return matchesText && matchesActiveFilter(card, activeFilter);
  });
  const shownPlaces = allPlaceCards.filter((card) => {
    const matchesText = !keyword || getSearchText(card).includes(keyword);
    return matchesText && matchesActiveFilter(card, activeFilter);
  });
  const visibleHubs = shownHubs.slice(0, visibleHubCount);
  const visiblePlaces = shownPlaces.slice(0, visiblePlaceCount);
  const hasMoreHubs = shownHubs.length > visibleHubCount;
  const hasMorePlaces = shownPlaces.length > visiblePlaceCount;
  const showHubs = viewMode === "All" || viewMode === "Hubs";
  const showPlaces = viewMode === "All" || viewMode === "Places";
  const totalShown = (showHubs ? shownHubs.length : 0) + (showPlaces ? shownPlaces.length : 0);

  useEffect(() => {
    setVisibleHubCount(10);
    setVisiblePlaceCount(8);
  }, [query, activeFilter, viewMode]);

  return (
    <main className="destinations-explore">
      <section className="destinations-shell">
        <div className="destinations-hero">
          <div>
            <p className="destinations-eyebrow">Explore Nepal</p>
            <h1>Browse destinations</h1>
            <p className="destinations-summary">
              {totalShown} results in {activeFilter.toLowerCase()} view
            </p>
          </div>
          <label className="destinations-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search destination, district, province, or category"
            />
          </label>
        </div>

        <div className="destinations-filterbar" aria-label="Destination filters">
          {filters.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className={activeFilter === label ? "is-active" : ""}
              onClick={() => setActiveFilter(label)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <div className="destinations-view-toggle" aria-label="Result type">
            {viewModes.map((mode) => (
              <button
                key={mode}
                type="button"
                className={viewMode === mode ? "is-active" : ""}
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="destinations-error">{error}</p> : null}

        {showHubs ? (
        <section className="destinations-section" aria-labelledby="destination-hubs-title">
          <div className="destinations-section__head">
            <h2 id="destination-hubs-title">Destination hubs</h2>
            <span>
              Showing {visibleHubs.length} of {shownHubs.length} hubs
            </span>
          </div>

          <div className="hub-grid">
            {visibleHubs.map((card) => (
              <article className="hub-card" key={card.name}>
                <Link to={getLocationLink(card, locationLookup)} className="hub-card__media">
                  <img src={card.image} alt={`${card.name} destination`} />
                  <span>{card.category}</span>
                </Link>
                <div className="hub-card__body">
                  <div>
                    <h3>{card.name}</h3>
                    <p className="destination-meta">
                      <MapPin size={14} />
                      {card.subtitle}
                    </p>
                  </div>
                  <p>{card.description}</p>
                </div>
              </article>
            ))}
          </div>
          {shownHubs.length > 10 ? (
            <div className="destinations-section__actions">
              {hasMoreHubs ? (
                <button type="button" onClick={() => setVisibleHubCount((count) => count + 5)}>
                  Show more hubs
                </button>
              ) : (
                <button type="button" onClick={() => setVisibleHubCount(10)}>
                  Show fewer hubs
                </button>
              )}
            </div>
          ) : null}
        </section>
        ) : null}

        {showPlaces ? (
        <section className="destinations-section" aria-labelledby="places-title">
          <div className="destinations-section__head">
            <h2 id="places-title">Places</h2>
            <span>
              Showing {visiblePlaces.length} of {shownPlaces.length} places
            </span>
          </div>

          <div className="place-grid">
            {visiblePlaces.map((card) => (
              <article className="place-card" key={card.name}>
                <Link to={getLocationLink(card, locationLookup)} className="place-card__media">
                  <img src={card.image} alt={`${card.name} in Lumbini`} />
                  <span>{card.subtitle}</span>
                </Link>
                <div className="place-card__body">
                  <div className="place-card__head">
                    <span>{card.parent}</span>
                    <button type="button" aria-label={`Save ${card.name}`}>
                      <Heart size={16} />
                      Save
                    </button>
                  </div>
                  <h3>{card.name}</h3>
                  <p>{card.description}</p>
                  <Link to={getLocationLink(card, locationLookup)} className="place-card__cta">
                    View place
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {shownPlaces.length > 8 ? (
            <div className="destinations-section__actions">
              {hasMorePlaces ? (
                <button type="button" onClick={() => setVisiblePlaceCount((count) => count + 8)}>
                  Show more places
                </button>
              ) : (
                <button type="button" onClick={() => setVisiblePlaceCount(8)}>
                  Show fewer places
                </button>
              )}
            </div>
          ) : null}
        </section>
        ) : null}

        {!totalShown ? (
          <div className="destinations-empty">
            <strong>No matching destinations</strong>
            <span>Try All, switch between Hubs and Places, or search a broader word like Pokhara.</span>
          </div>
        ) : null}
      </section>

      <style>{`
        .destinations-explore {
          min-height: 100vh;
          background: #f3f6fa;
          color: #172033;
          font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
          padding: 18px;
        }

        .destinations-shell {
          max-width: 1480px;
          margin: 0 auto;
          border: 1px solid #e5ebf2;
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 18px 54px rgba(47, 64, 84, 0.08);
          padding: 22px;
        }

        .destinations-hero,
        .destinations-filterbar,
        .destinations-section__head,
        .place-card__head,
        .place-card__cta,
        .destination-meta {
          display: flex;
          align-items: center;
        }

        .hub-card__media,
        .place-card__media,
        .place-card__cta {
          color: inherit;
          text-decoration: none;
        }

        .destinations-filterbar button,
        .destinations-view-toggle button {
          border: 1px solid #dde6ef;
          background: #ffffff;
          color: #4b5b70;
          border-radius: 999px;
          font-size: 0.88rem;
          font-weight: 700;
        }

        .destinations-hero {
          justify-content: space-between;
          gap: 22px;
          padding: 4px 2px 18px;
          border-bottom: 1px solid #edf2f7;
        }

        .destinations-eyebrow {
          margin: 0 0 8px;
          color: #6387a8;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .destinations-hero h1 {
          margin: 0;
          font-size: clamp(2.1rem, 3.7vw, 4.2rem);
          line-height: 1;
          letter-spacing: 0;
        }

        .destinations-summary {
          margin: 12px 0 0;
          color: #6b7b8d;
          font-size: 0.94rem;
          font-weight: 700;
        }

        .destinations-search {
          width: min(100%, 560px);
          min-height: 56px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 18px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid #dfe8f1;
          color: #6b7b8d;
          box-shadow: 0 10px 26px rgba(51, 70, 91, 0.06);
        }

        .destinations-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #172033;
          font-size: 0.95rem;
        }

        .destinations-filterbar {
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
          padding: 12px;
          border: 1px solid #e3ebf3;
          border-radius: 18px;
          background: #f8fbfe;
        }

        .destinations-filterbar button {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 13px;
          cursor: pointer;
        }

        .destinations-filterbar button.is-active {
          color: #154c79;
          background: #e8f4ff;
          border-color: #bfdcf4;
        }

        .destinations-view-toggle {
          display: inline-flex;
          gap: 6px;
          margin-left: auto;
          padding: 5px;
          border: 1px solid #dde6ef;
          border-radius: 999px;
          background: #f7fafd;
        }

        .destinations-view-toggle button {
          min-height: 32px;
          padding: 0 12px;
          border-color: transparent;
          background: transparent;
        }

        .destinations-view-toggle button.is-active {
          color: #154c79;
          background: #ffffff;
          border-color: #d8e5f1;
          box-shadow: 0 8px 16px rgba(47, 64, 84, 0.08);
        }

        .destinations-error {
          margin: 12px 8px 0;
          color: #b45309;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .destinations-section {
          padding: 24px 0 0;
        }

        .destinations-section__head {
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .destinations-section__head h2 {
          margin: 0;
          font-size: 1.34rem;
          letter-spacing: 0;
        }

        .destinations-section__head span {
          color: #718196;
          font-size: 0.86rem;
          font-weight: 800;
        }

        .destinations-section__actions {
          display: flex;
          justify-content: center;
          margin-top: 16px;
        }

        .destinations-section__actions button {
          min-height: 40px;
          padding: 0 16px;
          border: 1px solid #dbe6f0;
          border-radius: 999px;
          background: #ffffff;
          color: #24435f;
          cursor: pointer;
          font: inherit;
          font-size: 0.88rem;
          font-weight: 800;
          box-shadow: 0 10px 24px rgba(47, 64, 84, 0.07);
        }

        .hub-grid,
        .place-grid {
          display: grid;
          gap: 16px;
        }

        .hub-grid {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }

        .place-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .hub-card,
        .place-card {
          overflow: hidden;
          border-radius: 18px;
          background: #ffffff;
          border: 1px solid #e5ebf2;
          box-shadow: 0 12px 30px rgba(47, 64, 84, 0.07);
        }

        .hub-card {
          position: relative;
          min-height: 330px;
          background: #111827;
        }

        .hub-card__media,
        .place-card__media {
          position: relative;
          display: block;
          overflow: hidden;
          background: #e8edf3;
        }

        .hub-card__media {
          height: 100%;
          min-height: 330px;
        }

        .place-card__media {
          height: 174px;
        }

        .hub-card img,
        .place-card img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 220ms ease;
        }

        .hub-card:hover img,
        .place-card:hover img {
          transform: scale(1.04);
        }

        .hub-card__media span,
        .place-card__media span {
          position: absolute;
          left: 14px;
          bottom: 14px;
          padding: 8px 11px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          color: #27384c;
          font-size: 0.75rem;
          font-weight: 800;
        }

        .hub-card__media::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.02) 20%, rgba(15, 23, 42, 0.82) 100%);
          z-index: 1;
        }

        .hub-card__media span {
          top: 14px;
          bottom: auto;
          z-index: 2;
          background: rgba(255, 255, 255, 0.9);
        }

        .hub-card__body,
        .place-card__body {
          display: grid;
          gap: 10px;
          padding: 16px;
        }

        .hub-card__body {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2;
          padding: 18px;
          color: #ffffff;
        }

        .hub-card__body h3,
        .place-card__body h3 {
          margin: 0;
          color: #162033;
          font-size: 1.12rem;
        }

        .hub-card__body h3 {
          color: #ffffff;
          font-size: 1.34rem;
        }

        .hub-card__body p,
        .place-card__body p {
          margin: 0;
          color: #5e6c7d;
          font-size: 0.9rem;
          line-height: 1.55;
        }

        .hub-card__body p {
          color: rgba(255, 255, 255, 0.84);
        }

        .destination-meta {
          gap: 6px;
          margin-top: 6px;
          color: #75869a;
          font-size: 0.82rem;
          font-weight: 700;
        }

        .hub-card .destination-meta {
          color: rgba(255, 255, 255, 0.88);
        }

        .place-card__head {
          justify-content: space-between;
          gap: 10px;
        }

        .place-card__head span {
          color: #6c8096;
          font-size: 0.78rem;
          font-weight: 800;
        }

        .place-card__head button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 0;
          background: transparent;
          color: #5c6f86;
          cursor: pointer;
          font: inherit;
          font-size: 0.78rem;
          font-weight: 800;
        }

        .place-card__cta {
          width: fit-content;
          gap: 7px;
          min-height: 38px;
          padding: 0 13px;
          border-radius: 999px;
          background: #f3f7fb;
          border: 1px solid #dfe8f1;
          color: #1f5f93;
          font-size: 0.84rem;
          font-weight: 800;
        }

        .destinations-empty {
          display: grid;
          gap: 6px;
          margin: 22px 8px 4px;
          padding: 22px;
          border: 1px dashed #cbd8e5;
          border-radius: 20px;
          background: #f8fbff;
          color: #5d6d80;
        }

        .destinations-empty strong {
          color: #172033;
        }

        @media (max-width: 1180px) {
          .hub-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .place-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 980px) {
          .hub-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .destinations-explore {
            padding: 12px;
          }

          .destinations-shell {
            border-radius: 24px;
            padding: 12px;
          }

          .destinations-hero {
            align-items: flex-start;
            flex-direction: column;
          }

          .destinations-view-toggle {
            margin-left: 0;
            width: 100%;
          }

          .destinations-view-toggle button {
            flex: 1;
          }

          .hub-grid,
          .place-grid {
            grid-template-columns: 1fr;
          }

          .hub-card__media {
            min-height: 260px;
          }

          .hub-card {
            min-height: 260px;
          }
        }
      `}</style>
    </main>
  );
}
