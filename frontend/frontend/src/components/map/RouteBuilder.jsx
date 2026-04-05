import { Link } from "react-router-dom";
import { CarFront, Compass, GripVertical, Route, ShieldCheck, Timer, Trash2, Wallet } from "lucide-react";
import { formatDistance, formatDuration } from "../../utils/openRouteService";

function SummaryItem({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#e6f7f9,#ffffff)] text-[#1F7A8C] shadow-sm">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {label}
          </p>
          <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function RouteBuilder({
  currentLocation,
  selectedDestination,
  route,
  travelMode,
  onTravelModeChange,
  onGenerateRoute,
  loadingRoute,
  routeError,
  activeTripStops,
  onRemoveStop,
  onClearStops,
  dayPlan,
  staysHref,
}) {
  const estimatedCost = route ? `NPR ${Math.max(450, Math.round((route.distance / 1000) * 18))}` : "--";

  return (
    <aside className="rounded-[32px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(243,248,250,0.92))] p-5 shadow-[0_26px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#1F7A8C]">
            Route Builder
          </p>
          <h2 className="mt-2 text-[1.55rem] font-semibold text-slate-950">Trip planning</h2>
        </div>
        <span className="rounded-full border border-[#ff7d57]/15 bg-[#ff7d57]/10 px-3 py-1.5 text-xs font-semibold text-[#ff7d57]">
          {activeTripStops.length ? `${activeTripStops.length} stops` : "No stops"}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <SummaryItem
          label="Start Location"
          value={currentLocation?.name || "Use locate me"}
          icon={Compass}
        />
        <SummaryItem
          label="Destination"
          value={activeTripStops[activeTripStops.length - 1]?.name || selectedDestination?.name || "Choose a place"}
          icon={ShieldCheck}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryItem
          label="Distance"
          value={route ? formatDistance(route.distance) : "--"}
          icon={Route}
        />
        <SummaryItem
          label="Travel Time"
          value={route ? formatDuration(route.duration) : "--"}
          icon={Timer}
        />
        <SummaryItem
          label="Estimated Cost"
          value={estimatedCost}
          icon={Wallet}
        />
        <SummaryItem
          label="Travel Style"
          value={travelMode === "foot-walking" ? "Walking" : "Driving"}
          icon={CarFront}
        />
      </div>

      <div className="mt-4">
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          Travel mode
        </span>
        <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-slate-200/80 bg-white/80 p-2">
          {[
            { value: "driving-car", label: "Driving" },
            { value: "foot-walking", label: "Walking" },
          ].map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => onTravelModeChange(mode.value)}
              className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
                travelMode === mode.value
                  ? "bg-[linear-gradient(135deg,#0f766e,#1f7a8c)] text-white shadow-[0_14px_24px_rgba(31,122,140,0.28)]"
                  : "bg-transparent text-slate-600 hover:bg-slate-50"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <button
          type="button"
          onClick={onGenerateRoute}
          disabled={loadingRoute}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-[linear-gradient(135deg,#0f766e,#2563eb,#7c3aed)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(59,130,246,0.22)] transition hover:scale-[1.01] disabled:opacity-70"
        >
          <Route className="h-4 w-4" />
          {loadingRoute ? "Generating route..." : "Generate Route"}
        </button>
        <Link
          to={staysHref}
          className="inline-flex w-full items-center justify-center rounded-[22px] border border-slate-200 bg-white/80 px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-[#1F7A8C]/35 hover:text-[#1F7A8C]"
        >
          View stays
        </Link>
      </div>

      {routeError ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
          {routeError}
        </p>
      ) : null}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950">Route timeline</h3>
          {activeTripStops.length ? (
            <button
              type="button"
              onClick={onClearStops}
              className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 transition hover:text-rose-500"
            >
              Clear all
            </button>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Route order
            </span>
          )}
        </div>
        <div className="space-y-3">
          {activeTripStops.length ? (
            activeTripStops.map((stop, index) => (
              <div
                key={stop.id}
                className="relative flex items-center justify-between gap-3 rounded-[24px] border border-white/75 bg-white/82 px-4 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.05)]"
              >
                <div className="absolute bottom-[-14px] left-[27px] top-[52px] w-px bg-gradient-to-b from-cyan-200 to-transparent last:hidden" />
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#dcf7fb,#ffffff)] text-[#1F7A8C] shadow-sm">
                    <GripVertical className="h-4 w-4" />
                  </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Stop {index + 1}
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-900">{stop.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {stop.categoryLabel || stop.category}
                  </p>
                </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveStop(stop.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-500"
                  aria-label={`Remove ${stop.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm leading-6 text-slate-500">
              No stops added.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950">Day-by-day plan</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            Travel estimate
          </span>
        </div>
        <div className="space-y-3">
          {dayPlan.length ? (
            dayPlan.map((day) => (
              <article
                key={day.title}
                className="rounded-[24px] border border-white/75 bg-white/82 p-4 shadow-[0_14px_28px_rgba(15,23,42,0.05)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1F7A8C]">
                  {day.title}
                </p>
                <h4 className="mt-2 text-base font-semibold text-slate-900">{day.summary}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{day.detail}</p>
              </article>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm leading-6 text-slate-500">
              No plan yet.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
