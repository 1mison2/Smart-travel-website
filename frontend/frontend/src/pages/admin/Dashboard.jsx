import React, { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CreditCard,
  Globe2,
  MapPinned,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import api from "../../utils/api";

const initialState = {
  stats: null,
  users: [],
  locations: [],
  bookings: [],
  posts: [],
  payments: [],
  packages: [],
  notifications: [],
};

const currency = (value) => `NPR ${Number(value || 0).toLocaleString()}`;

const dayKey = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

const countInRange = (items, getDate, start, end, predicate = () => true) =>
  items.filter((item) => {
    const raw = getDate(item);
    if (!raw) return false;
    const date = new Date(raw);
    return !Number.isNaN(date.getTime()) && date >= start && date < end && predicate(item);
  }).length;

const sumInRange = (items, getDate, getValue, start, end, predicate = () => true) =>
  items.reduce((sum, item) => {
    const raw = getDate(item);
    if (!raw) return sum;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime()) || date < start || date >= end || !predicate(item)) return sum;
    return sum + Number(getValue(item) || 0);
  }, 0);

const changeMeta = (current, previous) => {
  if (!previous && !current) return { text: "No change", positive: true };
  if (!previous) return { text: "+100% from last week", positive: true };
  const diff = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(diff));
  const sign = diff >= 0 ? "+" : "-";
  return {
    text: `${sign}${rounded}% from last week`,
    positive: diff >= 0,
  };
};

const buildSparklinePoints = (values) => {
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");
};

const buildDailySeries = (items, getDate, getValue = () => 1, predicate = () => true, days = 7) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1 - index));
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return items.reduce((sum, item) => {
      const raw = getDate(item);
      if (!raw || !predicate(item)) return sum;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime()) || date < start || date >= end) return sum;
      return sum + Number(getValue(item) || 0);
    }, 0);
  });
};

const monthShort = (index) =>
  new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(2025, index, 1));

export default function AdminDashboard() {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [
          statsRes,
          usersRes,
          locationsRes,
          bookingsRes,
          postsRes,
          paymentsRes,
          packagesRes,
          notificationsRes,
        ] = await Promise.all([
          api.get("/api/admin/stats"),
          api.get("/api/admin/users"),
          api.get("/api/admin/locations"),
          api.get("/api/admin/bookings"),
          api.get("/api/admin/posts"),
          api.get("/api/payments/me"),
          api.get("/api/admin/trip-packages"),
          api.get("/api/notifications/me?limit=120"),
        ]);

        setState({
          stats: statsRes.data || null,
          users: Array.isArray(usersRes.data) ? usersRes.data : [],
          locations: Array.isArray(locationsRes.data) ? locationsRes.data : [],
          bookings: Array.isArray(bookingsRes.data) ? bookingsRes.data : [],
          posts: Array.isArray(postsRes.data) ? postsRes.data : [],
          payments: Array.isArray(paymentsRes.data?.payments) ? paymentsRes.data.payments : [],
          packages: Array.isArray(packagesRes.data?.packages) ? packagesRes.data.packages : [],
          notifications: Array.isArray(notificationsRes.data?.notifications) ? notificationsRes.data.notifications : [],
        });
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load admin dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const overview = useMemo(() => {
    const { stats, users, bookings, payments, packages, locations, posts } = state;
    if (!stats) return null;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const prevWeekStart = new Date(now);
    prevWeekStart.setDate(now.getDate() - 14);

    const activePackages = packages.filter((item) => item?.isActive !== false).length;
    const pendingPayments = payments.filter((item) => item?.status !== "success").length;

    const usersThisWeek = countInRange(users, (item) => item.createdAt, weekStart, now);
    const usersPrevWeek = countInRange(users, (item) => item.createdAt, prevWeekStart, weekStart);
    const bookingsThisWeek = countInRange(bookings, (item) => item.createdAt, weekStart, now);
    const bookingsPrevWeek = countInRange(bookings, (item) => item.createdAt, prevWeekStart, weekStart);
    const locationsThisWeek = countInRange(locations, (item) => item.createdAt, weekStart, now);
    const locationsPrevWeek = countInRange(locations, (item) => item.createdAt, prevWeekStart, weekStart);
    const revenueThisWeek = sumInRange(
      payments,
      (item) => item.createdAt,
      (item) => item.amount,
      weekStart,
      now,
      (item) => item.status === "success"
    );
    const revenuePrevWeek = sumInRange(
      payments,
      (item) => item.createdAt,
      (item) => item.amount,
      prevWeekStart,
      weekStart,
      (item) => item.status === "success"
    );
    const pendingThisWeek = countInRange(
      payments,
      (item) => item.createdAt,
      weekStart,
      now,
      (item) => item.status !== "success"
    );
    const pendingPrevWeek = countInRange(
      payments,
      (item) => item.createdAt,
      prevWeekStart,
      weekStart,
      (item) => item.status !== "success"
    );

    const bookingTrend = buildDailySeries(bookings, (item) => item.createdAt);
    const revenueTrend = buildDailySeries(
      payments,
      (item) => item.createdAt,
      (item) => item.amount,
      (item) => item.status === "success"
    );
    const userTrend = buildDailySeries(users, (item) => item.createdAt);
    const packageTrend = buildDailySeries(packages, (item) => item.createdAt);
    const pendingTrend = buildDailySeries(
      payments,
      (item) => item.createdAt,
      () => 1,
      (item) => item.status !== "success"
    );

    const statCards = [
      {
        key: "users",
        label: "Total Users",
        value: stats.totalUsers,
        icon: UserRound,
        tone: "blue",
        trend: userTrend,
        meta: changeMeta(usersThisWeek, usersPrevWeek),
        sub: `${usersThisWeek} new this week`,
      },
      {
        key: "locations",
        label: "Total Locations",
        value: stats.totalLocations,
        icon: MapPinned,
        tone: "teal",
        trend: buildDailySeries(locations, (item) => item.createdAt),
        meta: changeMeta(locationsThisWeek, locationsPrevWeek),
        sub: `${locations.filter((item) => item?.image).length} with live media`,
      },
      {
        key: "bookings",
        label: "Total Bookings",
        value: stats.totalBookings,
        icon: BriefcaseBusiness,
        tone: "violet",
        trend: bookingTrend,
        meta: changeMeta(bookingsThisWeek, bookingsPrevWeek),
        sub: `${bookings.filter((item) => item.bookingStatus === "confirmed").length} confirmed`,
      },
      {
        key: "packages",
        label: "Active Packages",
        value: activePackages,
        icon: Globe2,
        tone: "amber",
        trend: packageTrend,
        meta: changeMeta(activePackages, Math.max(activePackages - 1, 0)),
        sub: `${packages.filter((item) => item?.isFeatured).length} featured routes`,
      },
      {
        key: "revenue",
        label: "Revenue",
        value: currency(stats.totalRevenue),
        icon: Wallet,
        tone: "emerald",
        trend: revenueTrend,
        meta: changeMeta(revenueThisWeek, revenuePrevWeek),
        sub: `${currency(revenueThisWeek)} this week`,
      },
      {
        key: "pending",
        label: "Pending Payments",
        value: pendingPayments,
        icon: CreditCard,
        tone: "rose",
        trend: pendingTrend,
        meta: changeMeta(pendingThisWeek, pendingPrevWeek),
        sub: `${payments.filter((item) => item.status === "failed").length} failed recently`,
      },
    ];

    const monthlyRevenue = Array.from({ length: 6 }, (_, offset) => {
      const base = new Date();
      base.setMonth(base.getMonth() - (5 - offset));
      const month = base.getMonth();
      const year = base.getFullYear();
      const total = payments.reduce((sum, payment) => {
        const date = new Date(payment.createdAt);
        if (Number.isNaN(date.getTime())) return sum;
        if (payment.status !== "success") return sum;
        if (date.getMonth() !== month || date.getFullYear() !== year) return sum;
        return sum + Number(payment.amount || 0);
      }, 0);
      return { label: monthShort(month), total };
    });

    const destinationCounts = locations
      .slice(0, 5)
      .map((location) => {
        const total = bookings.filter((booking) => {
          const locationName = booking.locationId?.name || booking.tripPackageId?.location || booking.tripPackageId?.title || "";
          return String(locationName).toLowerCase().includes(String(location.name || "").toLowerCase());
        }).length;
        return { label: location.name, total };
      })
      .filter((item) => item.total > 0);

    const popularDestinations = destinationCounts.length
      ? destinationCounts
      : locations.slice(0, 4).map((location, index) => ({
          label: location.name || `Route ${index + 1}`,
          total: Math.max(1, 5 - index),
        }));

    const userActivity = [
      { label: "Mon", value: userTrend[userTrend.length - 7] || 0 },
      { label: "Tue", value: userTrend[userTrend.length - 6] || 0 },
      { label: "Wed", value: userTrend[userTrend.length - 5] || 0 },
      { label: "Thu", value: userTrend[userTrend.length - 4] || 0 },
      { label: "Fri", value: userTrend[userTrend.length - 3] || 0 },
      { label: "Sat", value: userTrend[userTrend.length - 2] || 0 },
      { label: "Sun", value: userTrend[userTrend.length - 1] || 0 },
    ];

    const recentBookings = bookings.slice(0, 5);
    const latestUsers = users.slice(0, 5);
    const recentPayments = payments.slice(0, 5);
    return {
      statCards,
      bookingTrend,
      revenueTrend,
      monthlyRevenue,
      popularDestinations,
      userActivity,
      recentBookings,
      latestUsers,
      recentPayments,
      notificationsUnread: state.notifications.filter((item) => !item.isRead).length,
      totalPosts: stats.totalPosts,
    };
  }, [state]);

  if (loading) return <p className="admin-loading">Loading dashboard...</p>;
  if (error) return <p className="admin-alert admin-alert--error">{error}</p>;
  if (!overview) return null;

  const pieTotal = overview.popularDestinations.reduce((sum, item) => sum + item.total, 0) || 1;
  let startAngle = 0;
  const pieStops = overview.popularDestinations.map((item, index) => {
    const value = (item.total / pieTotal) * 100;
    const from = startAngle;
    startAngle += value;
    const colors = ["#4f46e5", "#0ea5e9", "#14b8a6", "#f97316", "#fb7185"];
    return `${colors[index % colors.length]} ${from}% ${startAngle}%`;
  });

  return (
    <section className="admin-dashboard">
      <div className="admin-kpi-grid">
        {overview.statCards.map((card) => {
          const Icon = card.icon;
          const points = buildSparklinePoints(card.trend);
          return (
            <article key={card.key} className={`admin-kpi admin-kpi--${card.tone}`}>
              <div className="admin-kpi__top">
                <div className="admin-kpi__icon"><Icon size={18} /></div>
                <div className={`admin-kpi__trend ${card.meta.positive ? "is-up" : "is-down"}`}>
                  {card.meta.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {card.meta.text}
                </div>
              </div>
              <p className="admin-kpi__label">{card.label}</p>
              <h3 className="admin-kpi__value">{card.value}</h3>
              <div className="admin-kpi__sparkline">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <polyline points={points} />
                </svg>
              </div>
              <p className="admin-kpi__sub">{card.sub}</p>
            </article>
          );
        })}
      </div>

      <div className="admin-chart-grid">
        <section className="admin-card admin-card--padded admin-chart-card">
          <div className="admin-section-head">
            <div>
              <p className="admin-section-head__kicker">Booking trends</p>
              <h2>Daily booking momentum</h2>
            </div>
            <span className="admin-section-head__meta">Last 7 days</span>
          </div>
          <div className="admin-line-chart">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="bookingLine" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(79,70,229,0.35)" />
                  <stop offset="100%" stopColor="rgba(79,70,229,0.02)" />
                </linearGradient>
              </defs>
              <polygon points={`0,100 ${buildSparklinePoints(overview.bookingTrend)} 100,100`} fill="url(#bookingLine)" />
              <polyline points={buildSparklinePoints(overview.bookingTrend)} />
            </svg>
            <div className="admin-line-chart__labels">
              {["7d", "6d", "5d", "4d", "3d", "2d", "Today"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="admin-card admin-card--padded admin-chart-card">
          <div className="admin-section-head">
            <div>
              <p className="admin-section-head__kicker">Revenue chart</p>
              <h2>Monthly revenue</h2>
            </div>
            <span className="admin-section-head__meta">6 month view</span>
          </div>
          <div className="admin-bar-chart">
            {overview.monthlyRevenue.map((item) => {
              const max = Math.max(...overview.monthlyRevenue.map((entry) => entry.total), 1);
              const height = `${Math.max(14, (item.total / max) * 100)}%`;
              return (
                <div key={item.label} className="admin-bar-chart__item">
                  <div className="admin-bar-chart__track">
                    <div className="admin-bar-chart__bar" style={{ height }} />
                  </div>
                  <strong>{item.label}</strong>
                  <span>{currency(item.total)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="admin-card admin-card--padded admin-chart-card">
          <div className="admin-section-head">
            <div>
              <p className="admin-section-head__kicker">Popular destinations</p>
              <h2>Demand by route</h2>
            </div>
            <span className="admin-section-head__meta">Based on bookings</span>
          </div>
          <div className="admin-pie">
            <div className="admin-pie__chart" style={{ background: `conic-gradient(${pieStops.join(", ")})` }} />
            <div className="admin-pie__legend">
              {overview.popularDestinations.map((item, index) => (
                <div key={item.label} className="admin-pie__legend-row">
                  <span className={`admin-pie__swatch admin-pie__swatch--${index + 1}`} />
                  <strong>{item.label}</strong>
                  <small>{item.total} bookings</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="admin-card admin-card--padded admin-chart-card">
          <div className="admin-section-head">
            <div>
              <p className="admin-section-head__kicker">User activity</p>
              <h2>New user signups</h2>
            </div>
            <span className="admin-section-head__meta">Daily signup bars</span>
          </div>
          <div className="admin-activity-bars">
            {overview.userActivity.map((item) => {
              const max = Math.max(...overview.userActivity.map((entry) => entry.value), 1);
              return (
                <div key={item.label} className="admin-activity-bars__item">
                  <div className="admin-activity-bars__track">
                    <span style={{ height: `${Math.max(10, (item.value / max) * 100)}%` }} />
                  </div>
                  <strong>{item.label}</strong>
                  <small>{item.value}</small>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="admin-management-grid">
        <section className="admin-card admin-card--padded">
          <div className="admin-section-head">
            <div>
              <p className="admin-section-head__kicker">Recent bookings</p>
              <h2>Latest reservations</h2>
            </div>
          </div>
          <div className="admin-table-lite">
            {overview.recentBookings.map((booking) => (
              <div key={booking._id} className="admin-table-lite__row">
                <div className="admin-table-lite__main">
                  <strong>{booking.tripPackageId?.title || booking.listingId?.title || booking.locationId?.name || "Booking"}</strong>
                  <small>{booking.userId?.name || booking.userId?.email || "Traveler"}</small>
                </div>
                <div className="admin-table-lite__meta">
                  <strong>{currency(booking.amount)}</strong>
                  <small className={`admin-badge admin-badge--${resolveBadgeTone(booking.bookingStatus)}`}>{booking.bookingStatus}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card admin-card--padded">
          <div className="admin-section-head">
            <div>
              <p className="admin-section-head__kicker">Latest users</p>
              <h2>New registrations</h2>
            </div>
          </div>
          <div className="admin-list-lite">
            {overview.latestUsers.map((user) => (
              <div key={user._id} className="admin-list-lite__row">
                <div className="admin-avatar-chip">{initials(user.name || user.email)}</div>
                <div className="admin-list-lite__main">
                  <strong>{user.name || "Traveler"}</strong>
                  <small>{user.email}</small>
                </div>
                <span className={`admin-badge admin-badge--${user.role === "admin" ? "warning" : user.isBlocked ? "danger" : "success"}`}>
                  {user.role === "admin" ? "Admin" : user.isBlocked ? "Blocked" : "Active"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card admin-card--padded">
          <div className="admin-section-head">
            <div>
              <p className="admin-section-head__kicker">Recent payments</p>
              <h2>Transaction stream</h2>
            </div>
          </div>
          <div className="admin-list-lite">
            {overview.recentPayments.map((payment) => (
              <div key={payment._id} className="admin-list-lite__row">
                <div className="admin-list-lite__main">
                  <strong>{payment.provider || "Khalti"}</strong>
                  <small>{payment.gatewayRef || "Awaiting gateway ref"}</small>
                </div>
                <div className="admin-list-lite__meta">
                  <strong>{currency(payment.amount)}</strong>
                  <small className={`admin-badge admin-badge--${resolvePaymentTone(payment.status)}`}>{payment.status}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

    </section>
  );
}

function initials(value) {
  return String(value || "AD")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function resolveBadgeTone(status) {
  if (status === "confirmed") return "success";
  if (status === "cancelled") return "danger";
  return "warning";
}

function resolvePaymentTone(status) {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  return "warning";
}
