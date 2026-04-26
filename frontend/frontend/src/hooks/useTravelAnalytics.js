import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const daysBetween = (from, to) => {
  const start = new Date(from);
  const end = new Date(to);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

export default function useTravelAnalytics(userId) {
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [buddyCards, setBuddyCards] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    if (!userId) {
      setTrips([]);
      setBookings([]);
      setPayments([]);
      setSavedPlaces([]);
      setBuddyCards([]);
      setLocations([]);
      setLoading(false);
      setError("");
      return;
    }

    const makeStatusLabel = (request, isReceiver) => {
      if (request?.status === "accepted") return "Chat ready";
      if (request?.status === "rejected") return "Request declined";
      if (request?.status === "cancelled") return "Request cancelled";
      if (isReceiver) return "Request waiting for you";
      return "Request pending";
    };

    try {
      setLoading(true);
      setError("");

      const [
        recentTripsResponse,
        bookingsResponse,
        paymentsResponse,
        savedPlacesResponse,
        buddyRequestsResponse,
        locationsResponse,
      ] = await Promise.all([
        api.get("/api/user/recent-trips"),
        api.get("/api/bookings/me"),
        api.get("/api/payments/me"),
        api.get("/api/locations/saved/me"),
        api.get("/api/buddy/requests"),
        api.get("/api/locations"),
      ]);

      setTrips(Array.isArray(recentTripsResponse?.data?.trips) ? recentTripsResponse.data.trips : []);
      setBookings(Array.isArray(bookingsResponse?.data?.bookings) ? bookingsResponse.data.bookings : []);
      setPayments(Array.isArray(paymentsResponse?.data?.payments) ? paymentsResponse.data.payments : []);
      setSavedPlaces(
        Array.isArray(savedPlacesResponse?.data?.savedLocations) ? savedPlacesResponse.data.savedLocations : []
      );
      setLocations(Array.isArray(locationsResponse?.data) ? locationsResponse.data : []);

      const nextBuddyCards = new Map();
      const buddyData = buddyRequestsResponse?.data;

      (Array.isArray(buddyData?.chatRooms) ? buddyData.chatRooms : []).forEach((room, index) => {
        const other = (room?.participants || []).find((participant) => participant?._id !== userId);
        if (!other?._id) return;
        nextBuddyCards.set(other._id, {
          id: other._id,
          name: other.name || "Traveler",
          plan: room?.travelPlanId?.destination || "Travel chat",
          status: "Chat available",
          priority: 3,
          order: index,
        });
      });

      (Array.isArray(buddyData?.buddyRequests) ? buddyData.buddyRequests : []).forEach((request, index) => {
        const isReceiver = request?.receiverId?._id === userId;
        const other = isReceiver ? request?.senderId : request?.receiverId;
        if (!other?._id) return;

        const candidate = {
          id: other._id,
          name: other.name || "Traveler",
          plan:
            request?.travelPlanId?.destination ||
            request?.receiverPlanId?.destination ||
            request?.senderPlanId?.destination ||
            "Travel plan",
          status: makeStatusLabel(request, isReceiver),
          priority: request?.status === "accepted" ? 2 : 1,
          order: index,
        };

        const existing = nextBuddyCards.get(other._id);
        if (!existing || candidate.priority > existing.priority) {
          nextBuddyCards.set(other._id, candidate);
        }
      });

      setBuddyCards(
        [...nextBuddyCards.values()]
          .sort((a, b) => b.priority - a.priority || a.order - b.order)
          .slice(0, 3)
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load your travel analytics right now.");
      setTrips([]);
      setBookings([]);
      setPayments([]);
      setSavedPlaces([]);
      setBuddyCards([]);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return useMemo(() => {
    const now = new Date();
    const tripHistory = [...trips].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)).slice(0, 4);
    const totalBookedAmount = bookings.reduce((sum, booking) => sum + Number(booking?.amount || 0), 0);
    const totalPaidAmount = payments
      .filter((payment) => payment?.status === "success")
      .reduce((sum, payment) => sum + Number(payment?.amount || 0), 0);
    const budgetBarPercent =
      totalBookedAmount > 0
        ? Math.max(18, Math.min(100, Math.round((totalPaidAmount / totalBookedAmount) * 100)))
        : 24;
    const totalTripDays = trips.reduce((sum, trip) => {
      if (!trip?.startDate || !trip?.endDate) return sum;
      return sum + Math.max(1, daysBetween(trip.startDate, trip.endDate) + 1);
    }, 0);
    const averageBookingValue = bookings.length ? Math.round(totalBookedAmount / bookings.length) : 0;
    const activeTripsCount = trips.filter((trip) => {
      const start = new Date(trip?.startDate || 0);
      const end = new Date(trip?.endDate || 0);
      return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= now && end >= now;
    }).length;
    const completedTripsCount = tripHistory.filter((trip) => new Date(trip?.endDate) < now).length;
    const upcomingTripsCount = trips.filter((trip) => new Date(trip?.startDate || 0) > now).length;
    const upcomingBookings = bookings.filter((booking) => {
      const bookingDate = new Date(booking?.checkIn || booking?.travelDate || booking?.createdAt || 0);
      return !Number.isNaN(bookingDate.getTime()) && bookingDate >= now;
    }).length;

    const analyticsCards = [
      { label: "Days mapped", value: totalTripDays, detail: "planned across all trips", accent: "sky" },
      {
        label: "Average booking",
        value: averageBookingValue ? `NPR ${averageBookingValue.toLocaleString()}` : "NPR 0",
        detail: "per booking",
        accent: "gold",
      },
      {
        label: "Payment readiness",
        value: `${budgetBarPercent}%`,
        detail: totalBookedAmount > 0 ? "of booked travel paid" : "ready for your next booking",
        accent: "mint",
      },
      {
        label: "Buddy network",
        value: buddyCards.length,
        detail: buddyCards.length ? "travelers in your circle" : "start matching now",
        accent: "coral",
      },
    ];

    const tripStatusData = [
      { label: "Upcoming", value: upcomingBookings || upcomingTripsCount, accent: "var(--travel-sky, #3b82f6)" },
      { label: "In progress", value: activeTripsCount, accent: "var(--travel-mint, #10b981)" },
      { label: "Completed", value: completedTripsCount, accent: "var(--travel-coral, #f97316)" },
    ];

    const monthlyTripStarts = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const count = trips.filter((trip) => {
        const tripDate = new Date(trip?.startDate || 0);
        return (
          !Number.isNaN(tripDate.getTime()) &&
          tripDate.getMonth() === date.getMonth() &&
          tripDate.getFullYear() === date.getFullYear()
        );
      }).length;
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString("en-US", { month: "short" }),
        count,
      };
    });

    const peakMonth = monthlyTripStarts.reduce(
      (best, current) => (current.count > best.count ? current : best),
      monthlyTripStarts[0] || { label: "This month", count: 0 }
    );

    const savedCategoryData = Object.entries(
      savedPlaces.reduce((acc, place) => {
        const key = place?.category || "Scenic stops";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const bookingStatusData = [
      { label: "Pending", value: bookings.filter((booking) => booking?.bookingStatus === "pending").length, accent: "#f59e0b" },
      { label: "Confirmed", value: bookings.filter((booking) => booking?.bookingStatus === "confirmed").length, accent: "#10b981" },
      { label: "Cancelled", value: bookings.filter((booking) => booking?.bookingStatus === "cancelled").length, accent: "#f97316" },
    ];
    const bookingStatusTotal = bookingStatusData.reduce((sum, item) => sum + item.value, 0);

    const spendingCategorySource = bookings.reduce(
      (acc, booking) => {
        const amount = Number(booking?.amount || 0);
        const type = normalizeText(booking?.bookingType);
        if (!amount) return acc;
        if (type.includes("package")) acc.packages += amount;
        else if (type.includes("activity") || type.includes("tour")) acc.activities += amount;
        else if (type.includes("cafe") || type.includes("restaurant") || type.includes("food")) acc.food += amount;
        else acc.stays += amount;
        return acc;
      },
      { stays: 0, activities: 0, food: 0, packages: 0 }
    );

    const spendingCategoryData = [
      { label: "Stays", value: spendingCategorySource.stays, accent: "analytics-segment--stays" },
      { label: "Activities", value: spendingCategorySource.activities, accent: "analytics-segment--activities" },
      { label: "Food", value: spendingCategorySource.food, accent: "analytics-segment--food" },
      { label: "Packages", value: spendingCategorySource.packages, accent: "analytics-segment--packages" },
    ].filter((item) => item.value > 0);

    const totalTrackedSpend = spendingCategoryData.reduce((sum, item) => sum + item.value, 0);
    const biggestSpendCategory = [...spendingCategoryData].sort((a, b) => b.value - a.value)[0] || null;

    const destinationFrequency = trips.reduce((acc, trip) => {
      const title = normalizeText(trip?.title || trip?.destination || "");
      if (!title) return acc;
      const matchedDestination = locations.find((destination) =>
        title.includes(normalizeText(destination?.name))
      );
      const key = matchedDestination?.name || trip?.destination || trip?.title || "";
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topDestinationEntry = Object.entries(destinationFrequency).sort((a, b) => b[1] - a[1])[0] || null;
    const acceptedBuddyCount = buddyCards.filter((buddy) => /chat/i.test(buddy?.status || "")).length;

    const personalInsights = [
      trips.length > 0
        ? `You plan most often around ${peakMonth.label}, with ${peakMonth.count} trip start${peakMonth.count === 1 ? "" : "s"} in that month.`
        : "Start your first trip plan and the dashboard will begin building travel pattern insights for you.",
      topDestinationEntry
        ? `${topDestinationEntry[0]} is currently your strongest destination pattern with ${topDestinationEntry[1]} saved or planned trip${topDestinationEntry[1] === 1 ? "" : "s"}.`
        : "Your top destination signal will appear once you save places or plan a few trips.",
      totalTrackedSpend > 0
        ? `${budgetBarPercent}% of your booked value is already covered, and your biggest spend area is ${biggestSpendCategory?.label?.toLowerCase() || "travel"}.`
        : "Once you make bookings and payments, spending analytics will show where your travel budget is going.",
      acceptedBuddyCount > 0
        ? `You already have ${acceptedBuddyCount} active travel connection${acceptedBuddyCount === 1 ? "" : "s"} ready for chat and planning.`
        : "Buddy matching is still early, so this is a good place to start building your travel circle.",
    ];

    const analyticsNarrative =
      totalTripDays > 0
        ? `You have ${totalTripDays} planned travel day${totalTripDays === 1 ? "" : "s"} spread across ${trips.length} trip${trips.length === 1 ? "" : "s"}.`
        : "Start planning one trip to unlock your personal travel analytics snapshot.";

    return {
      loading,
      error,
      analyticsCards,
      tripStatusData,
      monthlyTripStarts,
      peakMonth,
      savedCategoryData,
      savedPlacesCount: savedPlaces.length,
      bookingStatusData,
      bookingStatusTotal,
      spendingCategoryData,
      totalTrackedSpend,
      personalInsights,
      analyticsNarrative,
    };
  }, [bookings, buddyCards, error, loading, locations, payments, savedPlaces, trips]);
}
