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
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Bookings & Payments</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          New Booking
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Booking ID</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Destination</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Details</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Dates</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Payment</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
              <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <span className="font-medium text-gray-900">{booking.id}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{booking.destination}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm">
                    {booking.hotel && (
                      <div className="text-gray-900">{booking.hotel}</div>
                    )}
                    {booking.flight && (
                      <div className="text-gray-600">Flight: {booking.flight}</div>
                    )}
                    <div className="text-gray-500">{booking.guests} guest{booking.guests > 1 ? 's' : ''}</div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-3 w-3" />
                      {booking.checkIn || booking.departure}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-3 w-3" />
                      {booking.checkOut || booking.return}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold">${booking.totalAmount}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(booking.paymentStatus)}`}>
                    {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1 text-gray-500 hover:text-blue-600" title="View Details">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-gray-500 hover:text-green-600" title="Download Receipt">
                      <Download className="h-4 w-4" />
                    </button>
                    {booking.paymentStatus === 'pending' && (
                      <button className="p-1 text-gray-500 hover:text-orange-600" title="Process Payment">
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
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500 mb-2">No bookings found</p>
          <p className="text-sm text-gray-400">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{bookings.length}</div>
            <div className="text-sm text-gray-600">Total Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {bookings.filter(b => b.status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {bookings.filter(b => b.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              ${bookings.reduce((sum, b) => sum + b.totalAmount, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Value</div>
          </div>
        </div>
      </div>
    </section>
  );
}
