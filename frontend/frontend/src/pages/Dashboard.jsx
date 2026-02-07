import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">ST</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Smart Travel</span>
              </Link>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name || 'User'}</span>
              <button 
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Your Dashboard</h1>
          <p className="text-gray-600">Manage your travel plans and explore new destinations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">Total Trips</p>
            <p className="text-2xl font-bold text-gray-900">12</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">Upcoming</p>
            <p className="text-2xl font-bold text-gray-900">3</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">Destinations</p>
            <p className="text-2xl font-bold text-gray-900">8</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">Total Spent</p>
            <p className="text-2xl font-bold text-gray-900">$2,450</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link to="/destinations" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <p className="font-medium text-gray-900">Explore Destinations</p>
            </Link>

            <Link to="/tours" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <p className="font-medium text-gray-900">Book Tours</p>
            </Link>

            <Link to="/profile" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <p className="font-medium text-gray-900">Edit Profile</p>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Trips</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Paris, France</p>
                  <p className="text-sm text-gray-500">Dec 15, 2024</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Completed
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Travel Recommendations</h2>
            <div className="space-y-4">
              <div className="p-3 border border-gray-200 rounded-lg">
                <p className="font-medium text-gray-900">Best time to visit Bali</p>
                <p className="text-sm text-gray-500">Travel Tip</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
