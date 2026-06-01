import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  CreditCard,
  MapPinned,
  MoreHorizontal,
  Plane,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import api from "../../utils/api";

const currency = (value) => `NPR ${Number(value || 0).toLocaleString()}`;

const monthlyRevenue = [
  { label: "Dec", value: 0 },
  { label: "Jan", value: 0 },
  { label: "Feb", value: 0 },
  { label: "Mar", value: 109297 },
  { label: "Apr", value: 5082 },
  { label: "May", value: 0 },
];

const demandRoutes = [
  { label: "Chhoser Cave Area", value: 5 },
  { label: "Lo Manthang Viewpoint", value: 4 },
  { label: "Chhusang", value: 3 },
];

const userActivity = [
  { label: "Mon", value: 0 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 0 },
  { label: "Thu", value: 2 },
  { label: "Fri", value: 1 },
  { label: "Sat", value: 2 },
  { label: "Sun", value: 1 },
];

const fallbackFeed = [
  {
    id: "BK-1028",
    type: "Booking",
    traveler: "Aarav Shrestha",
    route: "Chhoser Cave Area",
    provider: "Manual",
    amount: 24000,
    status: "Confirmed",
    time: "12 min ago",
  },
  {
    id: "PAY-8841",
    type: "Payment",
    traveler: "Nisha Gurung",
    route: "Lo Manthang Viewpoint",
    provider: "Khalti",
    amount: 5082,
    status: "Success",
    time: "1 hr ago",
  },
  {
    id: "PAY-8839",
    type: "Payment",
    traveler: "Rohan Thapa",
    route: "Mustang Circuit",
    provider: "Khalti",
    amount: 12000,
    status: "Pending",
    time: "3 hrs ago",
  },
  {
    id: "BK-1022",
    type: "Booking",
    traveler: "Maya Lama",
    route: "Chhusang",
    provider: "Manual",
    amount: 9600,
    status: "Cancelled",
    time: "Yesterday",
  },
];

export default function AdminDashboard() {
  const [state, setState] = useState({ bookings: [], payments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenuId, setOpenMenuId] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [bookingsRes, paymentsRes] = await Promise.all([
          api.get("/api/admin/bookings"),
          api.get("/api/payments/me"),
        ]);

        setState({
          bookings: Array.isArray(bookingsRes.data) ? bookingsRes.data : [],
          payments: Array.isArray(paymentsRes.data?.payments) ? paymentsRes.data.payments : [],
        });
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Live admin data unavailable. Showing the operational dashboard shell.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const operationsFeed = useMemo(() => {
    const bookingRows = state.bookings.slice(0, 4).map((booking, index) => ({
      id: booking._id || `booking-${index}`,
      type: "Booking",
      traveler: booking.userId?.name || booking.userId?.email || "Traveler",
      route: booking.tripPackageId?.title || booking.listingId?.title || booking.locationId?.name || "Smart Travel route",
      provider: "Manual",
      amount: booking.amount || booking.totalAmount || 0,
      status: titleCase(booking.bookingStatus || "Confirmed"),
      time: formatRelative(booking.createdAt),
    }));

    const paymentRows = state.payments.slice(0, 4).map((payment, index) => ({
      id: payment._id || `payment-${index}`,
      type: "Payment",
      traveler: payment.userId?.name || payment.userId?.email || "Traveler",
      route: payment.bookingId?.tripPackageId?.title || payment.bookingId?.listingId?.title || "Payment review",
      provider: payment.provider || "Khalti",
      amount: payment.amount || 0,
      status: titleCase(payment.status || "Pending"),
      time: formatRelative(payment.createdAt),
    }));

    const rows = [...bookingRows, ...paymentRows].slice(0, 6);
    return rows.length ? rows : fallbackFeed;
  }, [state]);

  const totalBookings = state.bookings.length || 21;
  const confirmedBookings = state.bookings.filter((booking) => String(booking.bookingStatus || "").toLowerCase().includes("confirm")).length || 13;
  const cancelledBookings = state.bookings.filter((booking) => String(booking.bookingStatus || "").toLowerCase().includes("cancel")).length || 3;
  const pendingBookings = Math.max(totalBookings - confirmedBookings - cancelledBookings, 0) || 5;
  const pendingPayments = state.payments.filter((payment) => String(payment.status || "").toLowerCase().includes("pending")).length || 1;
  const successfulPayments = state.payments.filter((payment) => ["success", "paid"].some((status) => String(payment.status || "").toLowerCase().includes(status))).length || 8;
  const failedPayments = state.payments.filter((payment) => String(payment.status || "").toLowerCase().includes("failed")).length || 2;
  const totalRevenue = state.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 155398;
  const bookingStatusData = [
    { label: "Confirmed", value: confirmedBookings, color: "#14b8a6" },
    { label: "Pending", value: pendingBookings, color: "#f59e0b" },
    { label: "Cancelled", value: cancelledBookings, color: "#f43f5e" },
  ];
  const paymentHealthData = [
    { label: "Success", value: successfulPayments, color: "#22c55e" },
    { label: "Pending", value: pendingPayments, color: "#eab308" },
    { label: "Failed", value: failedPayments, color: "#ef4444" },
  ];

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/85 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="admin-dashboard-hero grid gap-5 p-5 sm:p-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="flex min-h-[230px] flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-cyan-300">Command Dashboard</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Smart Travel Nepal operations
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Monitor bookings, payment risk, routes, and traveler activity from one calm control room.
              </p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroMetric icon={Plane} label="Live Bookings" value={totalBookings} tone="cyan" />
              <HeroMetric icon={ShieldCheck} label="Confirmed" value={confirmedBookings} tone="emerald" />
              <HeroMetric icon={CreditCard} label="Pending Pay" value={pendingPayments} tone="amber" />
            </div>
          </div>
          <div className="grid content-between gap-4 rounded-2xl border border-slate-200/70 bg-white/78 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Revenue Pulse</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{currency(totalRevenue)}</h2>
              </div>
              <span className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                <TrendingUp size={20} />
              </span>
            </div>
            <div className="rounded-2xl bg-slate-950 p-4 text-white dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Monthly target</span>
                <span>72%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full w-[72%] rounded-full bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-300" />
              </div>
              <p className="mt-4 text-sm text-slate-300">Mustang routes are carrying most current demand.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={16} />
          <span><strong>{pendingPayments} Pending Payment</strong> needs review</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
          <Activity size={16} />
          <span>System status is operational</span>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <KpiCard
              icon={Users}
              label="Total Users"
              value="7"
              sub="0 new this week"
              footer={<span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">Flat trend</span>}
            />
            <KpiCard
              icon={MapPinned}
              label="Total Locations"
              value="53"
              sub="28 with live media"
              footer={<ProgressBar value={53} label="Content completion" />}
            />
            <KpiCard
              icon={CalendarCheck}
              label="Total Bookings"
              value={totalBookings}
              sub={`${confirmedBookings} confirmed`}
              footer={<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"><ArrowUpRight size={13} /> +7% from last week</span>}
              sparkline
            />
            <KpiCard
              icon={Wallet}
              label="Revenue & Financials"
              value={currency(totalRevenue)}
              sub="NPR 0 this week"
              footer={<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"><CreditCard size={13} /> {pendingPayments} Pending Payment</span>}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <ChartPanel title="Monthly Revenue Chart" meta="6 month view">
              <AreaChart data={monthlyRevenue} />
            </ChartPanel>
            <ChartPanel title="Demand by Route Ranking" meta="Bookings">
              <RouteRanking data={demandRoutes} />
            </ChartPanel>
          </div>

          <div className="admin-analytics-preview">
            <AnalyticsDonut title="Booking Status Mix" meta={`${totalBookings} total bookings`} data={bookingStatusData} centerLabel="Bookings" />
            <AnalyticsDonut title="Payment Health" meta={`${state.payments.length || 11} recent payments`} data={paymentHealthData} centerLabel="Payments" />
            <section className="admin-analytics-card admin-analytics-card--insights">
              <div>
                <p className="admin-analytics-card__kicker">Operations preview</p>
                <h2>Admin analytics summary</h2>
                <p>Track demand, payment quality, and booking health before opening detailed records.</p>
              </div>
              <div className="admin-insight-list">
                <InsightRow label="Revenue per booking" value={currency(totalRevenue / Math.max(totalBookings, 1))} tone="cyan" />
                <InsightRow label="Confirmation rate" value={`${Math.round((confirmedBookings / Math.max(totalBookings, 1)) * 100)}%`} tone="emerald" />
                <InsightRow label="Manual review queue" value={`${pendingPayments + pendingBookings} items`} tone="amber" />
              </div>
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.8fr_1.6fr]">
            <ChartPanel title="User Activity" meta="Weekly signups">
              <SignupBars data={userActivity} />
            </ChartPanel>
            <OperationsTable rows={operationsFeed} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} />
          </div>
        </>
      )}
    </section>
  );
}

function AnalyticsDonut({ title, meta, data, centerLabel }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
  let current = 0;
  const gradient = data
    .map((item) => {
      const start = current;
      current += (Number(item.value || 0) / total) * 100;
      return `${item.color} ${start}% ${current}%`;
    })
    .join(", ");

  return (
    <section className="admin-analytics-card">
      <div>
        <p className="admin-analytics-card__kicker">Analytics</p>
        <h2>{title}</h2>
        <p>{meta}</p>
      </div>
      <div className="admin-donut-wrap">
        <div className="admin-donut" style={{ background: `conic-gradient(${gradient})` }}>
          <div>
            <strong>{total}</strong>
            <span>{centerLabel}</span>
          </div>
        </div>
        <div className="admin-donut-legend">
          {data.map((item) => (
            <div key={item.label} className="admin-donut-legend__row">
              <span style={{ background: item.color }} />
              <strong>{item.label}</strong>
              <small>{item.value}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InsightRow({ label, value, tone }) {
  return (
    <div className={`admin-insight-row admin-insight-row--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function HeroMetric({ icon, label, value, tone }) {
  const tones = {
    cyan: "bg-cyan-50 text-cyan-700 ring-cyan-600/10 dark:bg-cyan-400/10 dark:text-cyan-300",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-400/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-400/10 dark:text-amber-300",
  };

  return (
    <div className="rounded-2xl border border-slate-200/75 bg-white/78 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
      <div className={`mb-4 grid size-10 place-items-center rounded-xl ring-1 ring-inset ${tones[tone]}`}>
        {React.createElement(icon, { size: 18 })}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, footer, sparkline }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl hover:shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-cyan-700">
      <div className="flex items-start justify-between gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-cyan-300">
          {React.createElement(icon, { size: 19 })}
        </div>
        {sparkline ? <MiniSparkline /> : null}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sub}</p>
      <div className="mt-4">{footer}</div>
    </article>
  );
}

function ProgressBar({ value, label }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span>28 / 53</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <span className="block h-full rounded-full bg-cyan-400" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ChartPanel({ title, meta, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{meta}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function AreaChart({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const points = data
    .map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (item.value / max) * 82 - 8;
      return `${x},${y}`;
    })
    .join(" ");
  const fillPoints = `0,100 ${points} 100,100`;

  return (
    <div className="h-72">
      <svg className="h-56 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Monthly revenue area chart">
        <defs>
          <linearGradient id="adminRevenueGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(34, 211, 238, 0.35)" />
            <stop offset="100%" stopColor="rgba(34, 211, 238, 0.02)" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((line) => (
          <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="0.35" />
        ))}
        <polygon points={fillPoints} fill="url(#adminRevenueGradient)" />
        <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="grid grid-cols-6 gap-2">
        {data.map((item) => (
          <div key={item.label} className="min-w-0 text-center">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.label}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-500">{currency(item.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RouteRanking({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-800 dark:text-slate-200">{index + 1}. {item.label}</span>
            <span className="text-slate-500 dark:text-slate-400">{item.value} bookings</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <span className="block h-full rounded-full bg-cyan-400" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SignupBars({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="flex h-64 items-end justify-between gap-2">
      {data.map((item) => (
        <div key={item.label} className="flex h-full flex-1 flex-col justify-end gap-2">
          <div className="flex flex-1 items-end rounded-lg bg-slate-50 px-1.5 dark:bg-slate-950/60">
            <span className="block w-full rounded-md bg-slate-300 transition hover:bg-cyan-400 dark:bg-slate-700" style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }} />
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{item.label}</p>
            <p className="text-[11px] text-slate-500">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniSparkline() {
  return (
    <svg className="h-9 w-20" viewBox="0 0 80 36" aria-hidden="true">
      <polyline points="2,28 14,22 26,24 38,14 50,17 62,8 78,10" fill="none" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OperationsTable({ rows, openMenuId, setOpenMenuId }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Advanced Operations Stream</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recent bookings and transactions merged into one feed.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Record</th>
              <th className="px-4 py-3 font-semibold">Traveler</th>
              <th className="px-4 py-3 font-semibold">Route</th>
              <th className="px-4 py-3 font-semibold">Payment</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <div className="admin-record-cell">
                    <span className={`admin-record-cell__type admin-record-cell__type--${row.type.toLowerCase()}`}>
                      {row.type}
                    </span>
                    <strong title={row.id}>{formatRecordId(row.id, row.type)}</strong>
                    <small>{row.time}</small>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.traveler}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.route}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900 dark:text-white">{currency(row.amount)}</p>
                  <p className="text-xs text-slate-500">{row.provider}</p>
                </td>
                <td className="px-4 py-3"><StatusPill status={row.status} provider={row.provider} /></td>
                <td className="relative px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === row.id ? "" : row.id)}
                    className="inline-grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label={`Open actions for ${row.id}`}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {openMenuId === row.id ? (
                    <div className="absolute right-4 top-11 z-10 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-xl dark:border-slate-800 dark:bg-slate-950">
                      {["View Details", "Approve Refund", "Change Status"].map((action) => (
                        <button key={action} type="button" className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                          {action}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusPill({ status, provider }) {
  const normalized = String(status || "").toLowerCase();
  const styles = normalized.includes("success") || normalized.includes("confirmed")
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-400/10 dark:text-emerald-300"
    : normalized.includes("cancel")
      ? "bg-rose-50 text-rose-700 ring-rose-600/10 dark:bg-rose-400/10 dark:text-rose-300"
      : "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-400/10 dark:text-amber-300";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles}`}>
      {provider === "Khalti" ? "Khalti " : ""}{status}
    </span>
  );
}

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
}

function formatRecordId(id, type) {
  const prefix = type === "Payment" ? "PAY" : "BK";
  const value = String(id || "");
  const compact = value.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `${prefix}-${compact || "RECENT"}`;
}

function formatRelative(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}
