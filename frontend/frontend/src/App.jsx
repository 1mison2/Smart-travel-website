import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ExploreLocations from "./pages/ExploreLocations";
import LocationDetails from "./pages/LocationDetails";
import MyTrips from "./pages/MyTrips";
import Bookings from "./pages/Bookings";
import BookingDetails from "./pages/BookingDetails";
import Notifications from "./pages/Notifications";
import DestinationSearch from "./pages/DestinationSearch";
import MapExplorer from "./pages/MapExplorer";
import ItineraryPlanner from "./pages/ItineraryPlanner";
import ItineraryDetails from "./pages/ItineraryDetails";
import PaymentPage from "./pages/PaymentPage";
import PaymentHistory from "./pages/PaymentHistory";
import BuddyFinder from "./pages/BuddyFinder";
import PlaceDetails from "./pages/PlaceDetails";
import BookingCheckout from "./pages/BookingCheckout";
import TripPackages from "./pages/TripPackages";
import TripPackageDetails from "./pages/TripPackageDetails";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import CreateTripPlan from "./pages/CreateTripPlan";
import BrowseTripPlans from "./pages/BrowseTripPlans";
import BuddyMatches from "./pages/BuddyMatches";
import BuddyRequestsPage from "./pages/BuddyRequestsPage";
import BuddyChatPage from "./pages/BuddyChatPage";
import CommunityFeed from "./pages/CommunityFeed";
import CreatePostPage from "./pages/CreatePostPage";
import PostDetailsPage from "./pages/PostDetailsPage";
import SavedPostsPage from "./pages/SavedPostsPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminLocations from "./pages/admin/Locations";
import AdminListings from "./pages/admin/Listings";
import AdminBookings from "./pages/admin/Bookings";
import AdminPosts from "./pages/admin/Posts";
import AdminPayments from "./pages/admin/Payments";
import AdminTripPackages from "./pages/admin/TripPackages";
import AdminNotifications from "./pages/admin/Notifications";
import NotificationPopups from "./components/NotificationPopups";
import GlobalHeader from "./components/GlobalHeader";
import GlobalFooter from "./components/GlobalFooter";
import { FloatingGlobalSearch } from "./components/GlobalSearch";
import { useAuth } from "./context/AuthContext";
import { getAuthRedirect, setAuthRedirect } from "./utils/authRedirect";

function RouteLoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "linear-gradient(180deg, #edf6ff 0%, #f8fafc 100%)",
      color: "#334155",
      padding: "24px",
    }}>
      <div style={{
        display: "grid",
        gap: "12px",
        justifyItems: "center",
        textAlign: "center",
      }}>
        <div style={{
          width: "44px",
          height: "44px",
          borderRadius: "999px",
          border: "4px solid rgba(14,165,233,0.18)",
          borderTopColor: "#0ea5e9",
          animation: "st-spin 0.8s linear infinite",
        }} />
        <strong>Loading your travel space...</strong>
      </div>
      <style>{`
        @keyframes st-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function Protected({ children }) {
  const location = useLocation();
  const { user, token, ready } = useAuth();
  if (!ready) return <RouteLoadingScreen />;
  if (user && token) return children;
  const from = `${location.pathname}${location.search}${location.hash}`;
  setAuthRedirect(from);
  return <Navigate to="/login" replace state={{ from }} />;
}

function UserOnly({ children }) {
  const location = useLocation();
  const { user, token, ready } = useAuth();
  if (!ready) return <RouteLoadingScreen />;
  if (!user || !token) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    setAuthRedirect(from);
    return <Navigate to="/login" replace state={{ from }} />;
  }
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

function PublicOnly({ children }) {
  const location = useLocation();
  const { user, ready } = useAuth();
  if (!ready) return <RouteLoadingScreen />;
  const from = location.state?.from || getAuthRedirect();
  const redirectTo = typeof from === "string" && from.startsWith("/") ? from : "/dashboard";
  return !user ? children : <Navigate to={user?.role === "admin" ? "/admin" : redirectTo} replace />;
}

function AdminOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <RouteLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function LandingRoute() {
  const { user, ready } = useAuth();
  if (!ready) return <RouteLoadingScreen />;
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Home />;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <ScrollToTop />
      <GlobalHeader />
      <FloatingGlobalSearch />
      <NotificationPopups key={user?._id || "guest"} />
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        <Route path="/reset-password" element={<PublicOnly><ResetPassword /></PublicOnly>} />
        <Route path="/dashboard" element={<UserOnly><Dashboard /></UserOnly>} />
        <Route path="/explore" element={<UserOnly><ExploreLocations /></UserOnly>} />
        <Route path="/locations/:id" element={<UserOnly><LocationDetails /></UserOnly>} />
        <Route path="/my-trips" element={<UserOnly><MyTrips /></UserOnly>} />
        <Route path="/profile" element={<UserOnly><Profile /></UserOnly>} />
        <Route path="/settings" element={<UserOnly><Settings /></UserOnly>} />
        <Route path="/bookings" element={<UserOnly><Bookings /></UserOnly>} />
        <Route path="/bookings/:id" element={<UserOnly><BookingDetails /></UserOnly>} />
        <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="/destination-search" element={<UserOnly><DestinationSearch /></UserOnly>} />
        <Route path="/places/:id" element={<UserOnly><PlaceDetails /></UserOnly>} />
        <Route path="/book/:listingId" element={<UserOnly><BookingCheckout /></UserOnly>} />
        <Route path="/map-explorer" element={<UserOnly><MapExplorer /></UserOnly>} />
        <Route path="/itinerary-planner" element={<UserOnly><ItineraryPlanner /></UserOnly>} />
        <Route path="/itineraries/:id" element={<UserOnly><ItineraryDetails /></UserOnly>} />
        <Route path="/payment" element={<UserOnly><PaymentPage /></UserOnly>} />
        <Route path="/payments" element={<UserOnly><PaymentHistory /></UserOnly>} />
        <Route path="/buddy-finder" element={<UserOnly><BuddyFinder /></UserOnly>} />
        <Route path="/buddy/create-trip" element={<UserOnly><CreateTripPlan /></UserOnly>} />
        <Route path="/buddy/browse" element={<UserOnly><BrowseTripPlans /></UserOnly>} />
        <Route path="/buddy/matches" element={<UserOnly><BuddyMatches /></UserOnly>} />
        <Route path="/buddy/requests" element={<UserOnly><BuddyRequestsPage /></UserOnly>} />
        <Route path="/buddy/chat/:chatRoomId" element={<UserOnly><BuddyChatPage /></UserOnly>} />
        <Route path="/community" element={<UserOnly><CommunityFeed /></UserOnly>} />
        <Route path="/community/create" element={<UserOnly><CreatePostPage /></UserOnly>} />
        <Route path="/community/posts/:postId" element={<UserOnly><PostDetailsPage /></UserOnly>} />
        <Route path="/community/saved" element={<UserOnly><SavedPostsPage /></UserOnly>} />
        <Route path="/trip-packages" element={<UserOnly><TripPackages /></UserOnly>} />
        <Route path="/trip-packages/:id" element={<UserOnly><TripPackageDetails /></UserOnly>} />
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
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="trip-packages" element={<AdminTripPackages />} />
        </Route>
      </Routes>
      <GlobalFooter />
    </>
  );
}
