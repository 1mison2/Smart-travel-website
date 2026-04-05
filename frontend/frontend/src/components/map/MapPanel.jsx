import { LocateFixed, MapPin, Plus, RefreshCw } from "lucide-react";

function FloatingAction({ icon: Icon, label, onClick, disabled = false, busy = false, tone = "primary" }) {
  const toneClass =
    tone === "secondary"
      ? "border-white/70 bg-white/85 text-slate-700 hover:border-[#1F7A8C]/35 hover:text-[#1F7A8C]"
      : tone === "accent"
        ? "bg-[linear-gradient(135deg,#ff8a63,#f06a42)] text-white hover:brightness-105"
        : "bg-[linear-gradient(135deg,#0f766e,#1f7a8c)] text-white hover:brightness-105";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-[0_14px_28px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 ${toneClass} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <Icon className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
      {label}
    </button>
  );
}

export default function MapPanel({
  selectedDestination,
  route,
  loadingCurrentLocation,
  onLocateMe,
  onResetMap,
  onAddStop,
  canAddStop,
  mapInfoItems,
  children,
}) {
  return (
    <section className="rounded-[32px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,248,250,0.92))] p-4 shadow-[0_24px_56px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#1F7A8C]">
              Interactive Map
            </p>
            <h2 className="mt-2 text-[1.9rem] font-semibold text-slate-950">
              {selectedDestination?.name || "Map overview"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Select destinations, inspect nearby places, and shape your route visually.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FloatingAction
              icon={LocateFixed}
              label={loadingCurrentLocation ? "Locating..." : "Locate me"}
              onClick={onLocateMe}
              busy={loadingCurrentLocation}
            />
            <FloatingAction
              icon={RefreshCw}
              label="Reset map"
              onClick={onResetMap}
              tone="secondary"
            />
            <FloatingAction
              icon={Plus}
              label="Add stop"
              onClick={onAddStop}
              tone="accent"
              disabled={!canAddStop}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {mapInfoItems.map((item) => {
            const Icon = item.icon || MapPin;
            return (
              <article
                key={item.label}
                className="rounded-[24px] border border-white/70 bg-white/85 px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#e6f7f9,#ffffff)] text-[#1F7A8C] shadow-sm">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900">{item.value}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="relative overflow-hidden rounded-[30px] border border-white/70 bg-[#ecf4f5] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          {children}
          <div className="pointer-events-none absolute left-4 top-4 z-[500] hidden max-w-[320px] rounded-[22px] border border-white/70 bg-white/86 p-3 text-slate-900 shadow-[0_18px_34px_rgba(15,23,42,0.12)] backdrop-blur sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1F7A8C]">
              Map focus
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {selectedDestination?.name || "Pan across Nepal and choose a destination"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                Immersive map
              </span>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-semibold text-cyan-700">
                Live controls
              </span>
            </div>
          </div>
          {!route ? (
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-slate-950/78 px-4 py-2 text-xs font-semibold text-white backdrop-blur">
              Route preview inactive
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
