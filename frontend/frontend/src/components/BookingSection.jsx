import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  CreditCard,
  Download,
  Eye,
  MapPin,
  Search,
  Wallet,
  X,
} from "lucide-react";
import api from "../utils/api";

const badgeTone = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "confirmed" || normalized === "paid") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (normalized === "cancelled" || normalized === "failed" || normalized === "rejected") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  if (normalized === "refunded") return "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200";
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
};

const formatDate = (value) => {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
};

const formatAmount = (value) => `NPR ${Number(value || 0).toLocaleString()}`;

const getBookingName = (booking) =>
  booking?.tripPackageId?.title ||
  booking?.listingId?.title ||
  booking?.locationId?.name ||
  "Travel booking";

const createSkeletonRows = (count) => Array.from({ length: count }, (_, index) => ({ id: `booking-skeleton-${index}` }));

export default function BookingSection() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let active = true;
    const loadBookings = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/bookings/me");
        if (!active) return;
        setBookings(Array.isArray(data?.bookings) ? data.bookings : []);
        setError("");
      } catch (err) {
        if (!active) return;
        setBookings([]);
        setError(err?.response?.data?.message || "Failed to load bookings");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBookings();
    return () => {
      active = false;
    };
  }, []);

  const filteredBookings = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return bookings.filter((booking) => {
      const bookingName = getBookingName(booking).toLowerCase();
      const district = String(
        booking?.locationId?.district || booking?.listingId?.location?.district || ""
      ).toLowerCase();
      const bookingStatus = String(booking?.bookingStatus || "").toLowerCase();
      const paymentStatus = String(booking?.paymentStatus || "").toLowerCase();

      const matchesSearch =
        !keyword ||
        [bookingName, district, bookingStatus, paymentStatus]
          .filter(Boolean)
          .join(" ")
          .includes(keyword);

      const matchesFilter =
        filterStatus === "all" ||
        bookingStatus === filterStatus ||
        paymentStatus === filterStatus;

      return matchesSearch && matchesFilter;
    });
  }, [bookings, searchTerm, filterStatus]);

  const totals = useMemo(
    () => ({
      total: bookings.length,
      confirmed: bookings.filter((booking) => booking?.bookingStatus === "confirmed").length,
      pending: bookings.filter((booking) =>
        ["pending", "awaiting_payment"].includes(booking?.bookingStatus)
      ).length,
      totalValue: bookings.reduce((sum, booking) => sum + Number(booking?.amount || 0), 0),
    }),
    [bookings]
  );

  const hasActiveFilters = Boolean(searchTerm.trim()) || filterStatus !== "all";
  const skeletonRows = createSkeletonRows(4);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
  };

  return (
    <section className="ui-panel rounded-[30px] border border-white/70 bg-white/78 p-6 shadow-[0_22px_56px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Bookings & Payments</h2>
          <p className="mt-1 text-sm text-slate-500">
            Track stays, payment status, and upcoming reservations in one place.
          </p>
        </div>
        <Link
          to="/bookings"
          className="inline-flex w-fit items-center rounded-full bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_50%,#38bdf8_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(37,99,235,0.32)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(37,99,235,0.4)]"
        >
          Manage bookings
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(243,248,255,0.9))] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Total bookings
            </span>
            <span className="rounded-full bg-blue-50 p-2 text-blue-600">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{totals.total}</div>
        </div>
        <div className="rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,252,248,0.92))] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Confirmed
          </span>
          <div className="mt-4 text-3xl font-semibold text-emerald-700">{totals.confirmed}</div>
        </div>
        <div className="rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,250,241,0.94))] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Pending
          </span>
          <div className="mt-4 text-3xl font-semibold text-amber-600">{totals.pending}</div>
        </div>
        <div className="rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(242,248,255,0.92))] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Total value
          </span>
          <div className="mt-4 text-2xl font-semibold text-slate-950">
            {formatAmount(totals.totalValue)}
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-4 rounded-[24px] border border-slate-200/80 bg-white/70 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search bookings, places, district, or status"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3 pl-10 pr-10 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 lg:min-w-[220px]"
        >
          <option value="all">All status</option>
          <option value="confirmed">Confirmed</option>
          <option value="awaiting_payment">Awaiting payment</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        ) : null}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
          {filteredBookings.length} shown
        </span>
        {filterStatus !== "all" ? (
          <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
            Status: {filterStatus.replace(/_/g, " ")}
          </span>
        ) : null}
        {searchTerm.trim() ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            Search: {searchTerm.trim()}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <>
          <div className="hidden overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/75 lg:block">
            <div className="grid grid-cols-[2fr_1.3fr_1fr_1fr_1fr_1fr] gap-0 border-b border-slate-200/80 px-4 py-3">
              {["Place", "Dates", "Amount", "Booking", "Payment", "Actions"].map((label) => (
                <div key={label} className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {label}
                </div>
              ))}
            </div>
            {skeletonRows.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[2fr_1.3fr_1fr_1fr_1fr_1fr] items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0"
              >
                <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-6 animate-pulse rounded-full bg-slate-100" />
                <div className="h-6 animate-pulse rounded-full bg-slate-100" />
                <div className="h-6 animate-pulse rounded-full bg-slate-100" />
                <div className="h-10 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:hidden">
            {skeletonRows.map((item) => (
              <div
                key={item.id}
                className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
              >
                <div className="h-5 w-2/3 animate-pulse rounded-full bg-slate-100" />
                <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                  <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                </div>
                <div className="mt-5 h-10 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </>
      ) : null}

      {!loading && filteredBookings.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto rounded-[26px] border border-slate-200/80 bg-white/75 lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Place</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Booking</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking._id} className="border-b border-slate-100 transition hover:bg-blue-50/40">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="rounded-2xl bg-blue-50 p-2.5 text-blue-600">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="font-medium text-slate-800">{getBookingName(booking)}</div>
                          <div className="text-sm text-slate-500">
                            {[booking?.locationId?.district, booking?.locationId?.province].filter(Boolean).join(", ") || "Travel booking"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(booking?.checkIn || booking?.date)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(booking?.checkOut || booking?.date)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-950">{formatAmount(booking?.amount || 0)}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeTone(booking?.bookingStatus)}`}>
                        {String(booking?.bookingStatus || "pending").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeTone(booking?.paymentStatus)}`}>
                        {String(booking?.paymentStatus || "pending").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Link to={`/bookings/${booking._id}`} className="rounded-full p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700" title="View details">
                          <Eye className="h-4 w-4" />
                        </Link>
                        {booking?.paymentStatus === "paid" || booking?.paymentStatus === "refunded" ? (
                        <Link to="/payments" className="rounded-full p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700" title="Payment history">
                          <Download className="h-4 w-4" />
                        </Link>
                        ) : null}
                        {booking?.paymentStatus !== "paid" ? (
                          <Link to={`/payment?bookingId=${booking._id}`} className="rounded-full p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700" title="Process payment">
                            <CreditCard className="h-4 w-4" />
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:hidden">
            {filteredBookings.map((booking) => (
              <article
                key={booking._id}
                className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,249,255,0.92))] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{getBookingName(booking)}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {[booking?.locationId?.district, booking?.locationId?.province].filter(Boolean).join(", ") || "Travel booking"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">{formatAmount(booking?.amount || 0)}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Travel dates</p>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(booking?.checkIn || booking?.date)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(booking?.checkOut || booking?.date)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Status</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeTone(booking?.bookingStatus)}`}>
                        {String(booking?.bookingStatus || "pending").replace(/_/g, " ")}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeTone(booking?.paymentStatus)}`}>
                        {String(booking?.paymentStatus || "pending").replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/bookings/${booking._id}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50">
                    <Eye className="h-4 w-4" />
                    Details
                  </Link>
                  {booking?.paymentStatus === "paid" || booking?.paymentStatus === "refunded" ? (
                  <Link to="/payments" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50">
                    <Download className="h-4 w-4" />
                    Payments
                  </Link>
                  ) : null}
                  {booking?.paymentStatus !== "paid" ? (
                    <Link to={`/payment?bookingId=${booking._id}`} className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_50%,#38bdf8_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5">
                      <CreditCard className="h-4 w-4" />
                      Pay now
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {!loading && filteredBookings.length === 0 ? (
        <div className="ui-empty-state rounded-[24px] border border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center">
          <div className="ui-empty-state__icon mb-0 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <Search className="h-8 w-8 text-blue-500" />
          </div>
          <p className="mb-2 text-base font-semibold text-slate-700">No bookings found</p>
          <p className="max-w-md text-sm text-slate-400">
            Try adjusting your search or filters, or open destinations to make your next booking.
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
