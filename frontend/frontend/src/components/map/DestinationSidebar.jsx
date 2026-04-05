import { useState } from "react";
import { ChevronDown, Heart, MapPin, Search, SlidersHorizontal, Sparkles, Star } from "lucide-react";

function SearchSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.05)]"
        >
          <div className="flex gap-4">
            <div className="skeleton h-20 w-20 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-2/5" />
              <div className="skeleton h-3 w-4/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DestinationCard({ item, isActive, onSelect, onAddDestination }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`group w-full rounded-[28px] border p-4 text-left transition duration-300 ${
        isActive
          ? "border-cyan-400/40 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(234,248,250,0.98))] shadow-[0_22px_48px_rgba(14,116,144,0.16)]"
          : "border-white/65 bg-white/80 shadow-[0_18px_36px_rgba(15,23,42,0.08)] backdrop-blur hover:-translate-y-1 hover:border-cyan-300/50 hover:shadow-[0_24px_48px_rgba(14,116,144,0.12)]"
      }`}
    >
      <div className="flex gap-4">
        <img
          src={item.image || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop"}
          alt={item.name}
          className="h-24 w-24 rounded-2xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[1.05rem] font-semibold text-slate-900">{item.name}</h3>
              <p className="mt-1 truncate text-sm text-slate-500">{item.locationLabel}</p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
              <Star className="h-3.5 w-3.5 fill-current" />
              {item.rating}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#1F7A8C]/10 px-3 py-1 text-xs font-semibold text-[#1F7A8C]">
              {item.categoryLabel}
            </span>
            {item.distanceFromCurrent !== null ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {item.distanceFromCurrent} km away
              </span>
            ) : null}
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
            {item.description || "Open this destination on the map and add it to your route."}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {item.visitTime}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onAddDestination(item);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onAddDestination(item);
                }
              }}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition group-hover:border-cyan-300/50 group-hover:text-cyan-700 hover:border-[#1F7A8C]/35 hover:text-[#1F7A8C]"
            >
              Add stop
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function SectionShell({ title, eyebrow, trailing, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-[30px] border border-white/70 bg-white/78 p-5 shadow-[0_24px_56px_rgba(15,23,42,0.08)] backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#1F7A8C]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-[1.28rem] font-semibold text-slate-950">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {trailing}
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
          </span>
        </div>
      </button>
      {open ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

export default function DestinationSidebar({
  searchTerm,
  onSearchTermChange,
  onSearchSubmit,
  loadingSearch,
  searchError,
  destinations,
  selectedDestinationId,
  onSelectDestination,
  onAddDestination,
  savedDestinations,
  categoryFilter,
  onCategoryFilterChange,
  ratingFilter,
  onRatingFilterChange,
  distanceFilter,
  onDistanceFilterChange,
}) {
  const hasActiveFilters =
    categoryFilter !== "all" || ratingFilter !== "all" || distanceFilter !== "all";
  const chipClass =
    "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-cyan-300/40 hover:text-cyan-700";

  return (
    <aside className="space-y-5">
      <SectionShell
        eyebrow="Destination Search"
        title="Find your next stop"
        trailing={
          <span className="rounded-full border border-[#1F7A8C]/15 bg-[#1F7A8C]/8 px-3 py-1.5 text-xs font-semibold text-[#1F7A8C]">
            {destinations.length} found
          </span>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <span className={chipClass}>Nepal</span>
          <span className={chipClass}>Maps</span>
          <span className={chipClass}>Smart filters</span>
        </div>

        <form onSubmit={onSearchSubmit} className="space-y-3">
          <label className="flex items-center gap-3 rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.86))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Search Pokhara, Lumbini, Chitwan..."
              className="w-full border-none bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <button
              type="submit"
              disabled={loadingSearch}
              className="inline-flex w-full items-center justify-center rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)] transition hover:bg-[#1F7A8C] disabled:opacity-70"
            >
              {loadingSearch ? "Searching..." : "Search destination"}
            </button>
            <button
              type="button"
              onClick={() => {
                onSearchTermChange("");
                onCategoryFilterChange("all");
                onRatingFilterChange("all");
                onDistanceFilterChange("all");
              }}
              className="inline-flex items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#1F7A8C]/35 hover:text-[#1F7A8C]"
            >
              Clear
            </button>
          </div>
        </form>

        <div className="mt-5 rounded-[26px] border border-white/70 bg-[linear-gradient(180deg,rgba(244,248,250,0.92),rgba(255,255,255,0.86))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#1F7A8C]" />
              <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
            </div>
            {hasActiveFilters ? (
              <span className="rounded-full bg-[#1F7A8C]/10 px-2.5 py-1 text-[11px] font-semibold text-[#1F7A8C]">
                Active
              </span>
            ) : null}
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className={`${chipClass} ${categoryFilter !== "all" ? "border-cyan-300/50 text-cyan-700" : ""}`}>Category</span>
            <span className={`${chipClass} ${ratingFilter !== "all" ? "border-cyan-300/50 text-cyan-700" : ""}`}>Rating</span>
            <span className={`${chipClass} ${distanceFilter !== "all" ? "border-cyan-300/50 text-cyan-700" : ""}`}>Distance</span>
          </div>
          <div className="grid gap-2.5">
            <select
              value={categoryFilter}
              onChange={(event) => onCategoryFilterChange(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#1F7A8C]"
            >
              <option value="all">All categories</option>
              <option value="lake">Lake</option>
              <option value="temple">Temple</option>
              <option value="view">Viewpoint</option>
              <option value="adventure">Adventure</option>
            </select>
            <select
              value={ratingFilter}
              onChange={(event) => onRatingFilterChange(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#1F7A8C]"
            >
              <option value="all">All ratings</option>
              <option value="4.8">4.8+</option>
              <option value="4.6">4.6+</option>
              <option value="4.4">4.4+</option>
            </select>
            <select
              value={distanceFilter}
              onChange={(event) => onDistanceFilterChange(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#1F7A8C]"
            >
              <option value="all">Any distance</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
              <option value="100">Within 100 km</option>
            </select>
          </div>
        </div>

          {searchError ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
            {searchError}
          </p>
        ) : null}

        <div className="mt-4 rounded-[22px] border border-dashed border-cyan-200/70 bg-cyan-50/60 px-4 py-3 text-xs leading-6 text-slate-500">
          Auto-suggestions update while you type.
        </div>

        <div className="mt-5 max-h-[560px] space-y-3 overflow-y-auto pr-1">
          {loadingSearch ? <SearchSkeleton /> : null}
          {!loadingSearch && destinations.length
            ? destinations.map((item) => (
                <DestinationCard
                  key={item.id}
                  item={item}
                  isActive={selectedDestinationId === item.id}
                  onSelect={onSelectDestination}
                  onAddDestination={onAddDestination}
                />
              ))
            : null}
          {!loadingSearch && !destinations.length ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm leading-6 text-slate-500">
              Search destinations to unlock cards and map highlights.
            </div>
          ) : null}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Saved Destinations"
        title="Quick picks"
        defaultOpen
        trailing={<Sparkles className="h-5 w-5 text-[#ff7d57]" />}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <span className={chipClass}>Pinned places</span>
          <span className={chipClass}>Fast access</span>
        </div>

        <div className="space-y-3">
          {savedDestinations.length ? (
            savedDestinations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectDestination(item)}
                className="flex w-full items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-3 text-left transition hover:border-[#1F7A8C]/35 hover:-translate-y-0.5"
              >
                <img
                  src={item.image || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop"}
                  alt={item.name}
                  className="h-14 w-14 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {item.locationLabel || [item.district, item.province].filter(Boolean).join(", ") || "Nepal"}
                  </p>
                </div>
                <Heart className="h-4 w-4 text-[#ff7d57]" />
              </button>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
              Saved destinations will appear here.
            </div>
          )}
        </div>
      </SectionShell>
    </aside>
  );
}
