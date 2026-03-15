import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ExploreLocations from "./pages/ExploreLocations";
import LocationDetails from "./pages/LocationDetails";
import PlanTrip from "./pages/PlanTrip";
import MyTrips from "./pages/MyTrips";
import Bookings from "./pages/Bookings";
import Notifications from "./pages/Notifications";
import DestinationSearch from "./pages/DestinationSearch";
import MapExplorer from "./pages/MapExplorer";
import ItineraryPlanner from "./pages/ItineraryPlanner";
import PaymentPage from "./pages/PaymentPage";
import BuddyFinder from "./pages/BuddyFinder";
import PlaceDetails from "./pages/PlaceDetails";
import BookingCheckout from "./pages/BookingCheckout";
import TripPackages from "./pages/TripPackages";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminLocations from "./pages/admin/Locations";
import AdminListings from "./pages/admin/Listings";
import AdminBookings from "./pages/admin/Bookings";
import AdminPosts from "./pages/admin/Posts";
import AdminPayments from "./pages/admin/Payments";
import AdminTripPackages from "./pages/admin/TripPackages";
import NotificationPopups from "./components/NotificationPopups";
import GlobalHeader from "./components/GlobalHeader";
import { useAuth } from "./context/AuthContext";

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to={user?.role === "admin" ? "/admin" : "/dashboard"} replace />;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <GlobalHeader />
      <NotificationPopups />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        <Route path="/reset-password" element={<PublicOnly><ResetPassword /></PublicOnly>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/explore" element={<Protected><ExploreLocations /></Protected>} />
        <Route path="/locations/:id" element={<Protected><LocationDetails /></Protected>} />
        <Route path="/plan-trip" element={<Protected><PlanTrip /></Protected>} />
        <Route path="/my-trips" element={<Protected><MyTrips /></Protected>} />
        <Route path="/bookings" element={<Protected><Bookings /></Protected>} />
        <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="/destination-search" element={<Protected><DestinationSearch /></Protected>} />
        <Route path="/places/:id" element={<Protected><PlaceDetails /></Protected>} />
        <Route path="/book/:listingId" element={<Protected><BookingCheckout /></Protected>} />
        <Route path="/map-explorer" element={<Protected><MapExplorer /></Protected>} />
        <Route path="/itinerary-planner" element={<Protected><ItineraryPlanner /></Protected>} />
        <Route path="/payment" element={<Protected><PaymentPage /></Protected>} />
        <Route path="/buddy-finder" element={<Protected><BuddyFinder /></Protected>} />
        <Route path="/trip-packages" element={<Protected><TripPackages /></Protected>} />
        <Route
          path="/admin"
          element={
            <AdminOnly>
              <AdminLayout />
            </AdminOnly>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="locations" element={<AdminLocations />} />
          <Route path="listings" element={<AdminListings />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="trip-packages" element={<AdminTripPackages />} />
        </Route>
      </Routes>
    </>
  );
}
