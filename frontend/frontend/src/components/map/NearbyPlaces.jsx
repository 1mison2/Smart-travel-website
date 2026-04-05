import { Star } from "lucide-react";

function NearbySkeletonCard() {
  return (
    <div className="min-w-[280px] rounded-[28px] border border-white/75 bg-white/82 p-4 shadow-[0_18px_36px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="skeleton h-40 w-full rounded-2xl" />
      <div className="mt-4 space-y-3">
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-3 w-1/2" />
        <div className="flex gap-2">
          <div className="skeleton h-8 w-20 rounded-full" />
          <div className="skeleton h-8 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function NearbyCard({ place, isActive, onSelectNearbyPlace, onAddNearbyStop, icon: Icon }) {
  return (
    <article
      className={`group min-w-[320px] rounded-[28px] border p-4 transition duration-300 ${
        isActive
          ? "border-cyan-400/45 bg-[linear-gradient(135deg,#f6fbfc,#edf7f8)] shadow-[0_20px_42px_rgba(31,122,140,0.15)]"
          : "border-white/75 bg-white/84 shadow-[0_18px_36px_rgba(15,23,42,0.06)] backdrop-blur hover:-translate-y-1 hover:border-cyan-300/50"
      }`}
    >
      <img
        src={place.photo || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop"}
        alt={place.name}
        className="h-40 w-full rounded-2xl object-cover"
      />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-slate-900">{place.name}</h3>
          <p className="mt-1 truncate text-sm text-slate-500">
            {place.address || "Address unavailable"}
          </p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1F7A8C]/10 text-[#1F7A8C]">
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
          <Star className="h-3.5 w-3.5 fill-current" />
          {Number(place.rating || 0).toFixed(1)}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {place.distanceKm ?? "-"} km away
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onSelectNearbyPlace(place)}
          className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a,#1f7a8c)] px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
        >
          Show on map
        </button>
        <button
          type="button"
          onClick={() => onAddNearbyStop(place)}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition group-hover:border-cyan-300/40 group-hover:text-cyan-700 hover:border-[#1F7A8C]/35 hover:text-[#1F7A8C]"
        >
          Add stop
        </button>
      </div>
    </article>
  );
}

export default function NearbyPlaces({
  selectedDestination,
  nearbyTypes,
  nearbyType,
  onNearbyTypeChange,
  nearbyPlaces,
  loadingNearby,
  nearbyError,
  nearbySource,
  selectedNearbyPlaceId,
  onSelectNearbyPlace,
  onAddNearbyStop,
  activeIcon,
}) {
  return (
    <section className="rounded-[32px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(243,248,250,0.92))] p-5 shadow-[0_22px_52px_rgba(15,23,42,0.07)] backdrop-blur sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#1F7A8C]">
            Nearby Places
          </p>
          <h2 className="mt-2 text-[1.45rem] font-semibold text-slate-950">
            Nearby picks
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Curated spots around your selected destination.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {nearbyTypes.map((type) => {
            const TypeIcon = type.icon;
            const isActive = type.value === nearbyType;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => onNearbyTypeChange(type.value)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                  ? "bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
                    : "border border-slate-200 bg-white/80 text-slate-700 hover:border-[#1F7A8C]/35 hover:text-[#1F7A8C]"
                }`}
              >
                <TypeIcon className="h-4 w-4" />
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-[#1F7A8C]/15 bg-[#1F7A8C]/8 px-3 py-1.5 text-xs font-semibold text-[#1F7A8C]">
          {nearbyPlaces.length} places
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          Source: {nearbySource === "local_fallback" ? "Smart Travel database" : nearbySource ? "Live nearby data" : "Waiting"}
        </span>
      </div>

      {nearbyError ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
          {nearbyError}
        </p>
      ) : null}

      <div className="map-dashboard__scroll mt-5 flex gap-4 overflow-x-auto pb-2">
        {loadingNearby ? (
          Array.from({ length: 4 }).map((_, index) => <NearbySkeletonCard key={index} />)
        ) : nearbyPlaces.length ? (
          nearbyPlaces.map((place) => (
            <NearbyCard
              key={place.placeId}
              place={place}
              isActive={selectedNearbyPlaceId === place.placeId}
              onSelectNearbyPlace={onSelectNearbyPlace}
              onAddNearbyStop={onAddNearbyStop}
              icon={activeIcon}
            />
          ))
        ) : (
          <div className="w-full rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-6 text-sm leading-6 text-slate-500">
            No nearby places yet.
          </div>
        )}
      </div>
    </section>
  );
}
