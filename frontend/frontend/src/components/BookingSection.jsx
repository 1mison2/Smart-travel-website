import React, { useState } from 'react';
import { Search, Filter, Calendar, MapPin, DollarSign, CreditCard, Download, Eye } from 'lucide-react';

export default function BookingSection() {
  const [bookings] = useState([
    {
      id: 'BKG001',
      destination: 'Kathmandu, Nepal',
      hotel: 'Hotel Himalaya',
      checkIn: '2024-12-15',
      checkOut: '2024-12-20',
      guests: 2,
      totalAmount: 15000,
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingDate: '2024-11-01'
    },
    {
      id: 'BKG002',
      destination: 'Pokhara, Nepal',
      hotel: 'Fewa Lake Resort',
      checkIn: '2025-01-10',
      checkOut: '2025-01-17',
      guests: 1,
      totalAmount: 12000,
      status: 'pending',
      paymentStatus: 'pending',
      bookingDate: '2024-11-15'
    },
    {
      id: 'BKG003',
      destination: 'Lukla, Nepal',
      flight: 'Yeti Airlines 123',
      departure: '2024-12-25',
      return: '2025-01-02',
      guests: 2,
      totalAmount: 25000,
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingDate: '2024-10-20'
    }
  ]);

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.hotel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.flight?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || booking.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
      case 'pending': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
      case 'cancelled': return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
      default: return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch(status) {
      case 'paid': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
      case 'pending': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
      case 'failed': return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
      default: return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
    }
  };

  return (
    <section className="rounded-[30px] border border-white/70 bg-white/78 p-6 shadow-[0_22px_56px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-slate-950">Bookings & Payments</h2>
        <button className="rounded-full bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_50%,#38bdf8_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(37,99,235,0.32)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(37,99,235,0.4)]">
          New Booking
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white/85 py-3 pl-10 pr-4 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="rounded-2xl border border-slate-200 bg-white/85 p-3 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/80">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Booking ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Destination</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Details</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dates</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
              <tr key={booking.id} className="border-b border-slate-100 transition hover:bg-blue-50/40">
                <td className="py-3 px-4">
                  <span className="font-medium text-slate-950">{booking.id}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-slate-800">{booking.destination}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm">
                    {booking.hotel && (
                      <div className="text-slate-900">{booking.hotel}</div>
                    )}
                    {booking.flight && (
                      <div className="text-slate-600">Flight: {booking.flight}</div>
                    )}
                    <div className="text-slate-500">{booking.guests} guest{booking.guests > 1 ? 's' : ''}</div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Calendar className="h-3 w-3" />
                      {booking.checkIn || booking.departure}
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Calendar className="h-3 w-3" />
                      {booking.checkOut || booking.return}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-slate-950">${booking.totalAmount}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentStatusColor(booking.paymentStatus)}`}>
                    {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button className="rounded-full p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700" title="View Details">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="rounded-full p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700" title="Download Receipt">
                      <Download className="h-4 w-4" />
                    </button>
                    {booking.paymentStatus === 'pending' && (
                      <button className="rounded-full p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700" title="Process Payment">
                        <CreditCard className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredBookings.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <Search className="h-8 w-8 text-blue-500" />
          </div>
          <p className="mb-2 text-slate-600">No bookings found</p>
          <p className="text-sm text-slate-400">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 border-t border-slate-200/80 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 py-4 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <div className="text-2xl font-semibold text-blue-700">{bookings.length}</div>
            <div className="text-sm text-slate-500">Total Bookings</div>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 py-4 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <div className="text-2xl font-semibold text-slate-900">
              {bookings.filter(b => b.status === 'confirmed').length}
            </div>
            <div className="text-sm text-slate-500">Confirmed</div>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 py-4 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <div className="text-2xl font-semibold text-slate-900">
              {bookings.filter(b => b.status === 'pending').length}
            </div>
            <div className="text-sm text-slate-500">Pending</div>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 py-4 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <div className="text-2xl font-semibold text-slate-900">
              ${bookings.reduce((sum, b) => sum + b.totalAmount, 0)}
            </div>
            <div className="text-sm text-slate-500">Total Value</div>
          </div>
        </div>
      </div>
    </section>
  );
}
