import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const PROVINCES = [
  "Koshi",
  "Madhesh",
  "Bagmati",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SEASONS = {
  Winter: [11, 0, 1],
  Spring: [2, 3, 4],
  Monsoon: [5, 6, 7],
  Autumn: [8, 9, 10],
};

const daysBetween = (from, to) => {
  const start = new Date(from);
  const end = new Date(to);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();
const titleCase = (value) =>
  String(value || "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const toDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const firstMatchingLocation = (locations, text) => {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  return (
    locations.find((location) => normalized.includes(normalizeText(location?.name))) ||
    locations.find((location) => normalized.includes(normalizeText(location?.district)))
  );
};

const inferTransportMode = (booking) => {
  const transportText = normalizeText(
    [
      booking?.packageSnapshot?.pickupCity,
      booking?.packageSnapshot?.dropoffCity,
      booking?.packageSnapshot?.tripType,
      booking?.listingId?.title,
      booking?.tripPackageId?.title,
      booking?.notes,
      ...(booking?.packageSnapshot?.itineraryDays || []).map((day) => day?.transport),
    ].join(" ")
  );

  if (/(flight|airport|air)/.test(transportText)) return "Domestic flights";
  if (/(private|couple transfer|family vehicle|private vehicle|jeep)/.test(transportText)) return "Private transfers";
  if (/(shared|group transfer|tourist bus|coach|public bus|safari vehicle)/.test(transportText)) return "Shared mobility";
  if (/(hike|trek|walk|walking|cycling|bike|boat|canoe)/.test(transportText)) return "Low-impact routes";
  if (booking?.bookingType === "activity") return "Shared mobility";
  if (booking?.bookingType === "trip") return "Private transfers";
  return "Ground travel";
};

const transportEmissionFactor = {
  "Domestic flights": 128,
  "Private transfers": 84,
  "Shared mobility": 36,
  "Ground travel": 44,
  "Low-impact routes": 12,
};

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
      {
        label: "Confirmed",
        value: bookings.filter((booking) => booking?.bookingStatus === "confirmed" || booking?.bookingStatus === "awaiting_payment").length,
        accent: "#10b981",
      },
      { label: "Cancelled", value: bookings.filter((booking) => booking?.bookingStatus === "cancelled").length, accent: "#f97316" },
    ];
    const bookingStatusTotal = bookingStatusData.reduce((sum, item) => sum + item.value, 0);

    const spendingCategorySource = bookings.reduce(
      (acc, booking) => {
        const amount = Number(booking?.amount || 0);
        const type = normalizeText(booking?.bookingType);
        if (!amount) return acc;
        if (type.includes("package") || type.includes("trip")) acc.packages += amount;
        else if (type.includes("activity") || type.includes("tour")) acc.activities += amount;
        else if (type.includes("cafe") || type.includes("restaurant") || type.includes("food")) acc.food += amount;
        else acc.stays += amount;
        return acc;
      },
      { stays: 0, activities: 0, food: 0, packages: 0 }
    );

    const spendingCategoryData = [
      {
        label: "Stays",
        value: spendingCategorySource.stays,
        accent: "analytics-segment--stays",
        color: "#3b82f6",
      },
      {
        label: "Activities",
        value: spendingCategorySource.activities,
        accent: "analytics-segment--activities",
        color: "#14b8a6",
      },
      {
        label: "Food",
        value: spendingCategorySource.food,
        accent: "analytics-segment--food",
        color: "#f97316",
      },
      {
        label: "Packages",
        value: spendingCategorySource.packages,
        accent: "analytics-segment--packages",
        color: "#8b5cf6",
      },
    ].filter((item) => item.value > 0);

    const totalTrackedSpend = spendingCategoryData.reduce((sum, item) => sum + item.value, 0);
    const biggestSpendCategory = [...spendingCategoryData].sort((a, b) => b.value - a.value)[0] || null;

    const destinationFrequency = trips.reduce((acc, trip) => {
      const title = normalizeText(trip?.title || trip?.destination || "");
      if (!title) return acc;
      const matchedDestination = firstMatchingLocation(locations, title);
      const key = matchedDestination?.name || trip?.destination || trip?.title || "";
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topDestinationEntry = Object.entries(destinationFrequency).sort((a, b) => b[1] - a[1])[0] || null;
    const acceptedBuddyCount = buddyCards.filter((buddy) => /chat/i.test(buddy?.status || "")).length;

    const destinationSignals = [
      ...bookings.map((booking) => ({
        source: "booking",
        title:
          booking?.tripPackageId?.title ||
          booking?.listingId?.title ||
          booking?.locationId?.name ||
          booking?.packageSnapshot?.title ||
          "",
        province: booking?.locationId?.province || "",
        district: booking?.locationId?.district || "",
        category: booking?.listingId?.type || booking?.bookingType || "",
        completed: normalizeText(booking?.bookingStatus) === "confirmed" || normalizeText(booking?.paymentStatus) === "paid",
        weight: normalizeText(booking?.bookingStatus) === "confirmed" || normalizeText(booking?.paymentStatus) === "paid" ? 3 : 2,
        date: toDate(booking?.checkIn || booking?.date || booking?.createdAt),
        amount: Number(booking?.amount || 0),
        guests: Number(booking?.guests || 1),
      })),
      ...trips.map((trip) => ({
        source: "trip",
        title: trip?.title || trip?.destination || "",
        province: "",
        district: "",
        category: "trip",
        completed: toDate(trip?.endDate) ? toDate(trip?.endDate) < now : false,
        weight: 3,
        date: toDate(trip?.startDate || trip?.createdAt),
        amount: Number(trip?.price || 0),
        guests: 1,
      })),
      ...savedPlaces.map((place) => ({
        source: "saved",
        title: place?.name || "",
        province: place?.province || "",
        district: place?.district || "",
        category: place?.category || "",
        completed: false,
        weight: 1,
        date: toDate(place?.createdAt || now),
        amount: Number(place?.averageCost || 0),
        guests: 1,
      })),
    ].map((entry) => {
      const matchedLocation =
        entry.province || entry.district ? null : firstMatchingLocation(locations, entry.title);
      return {
        ...entry,
        province: entry.province || matchedLocation?.province || "",
        district: entry.district || matchedLocation?.district || "",
        category: entry.category || matchedLocation?.category || "",
      };
    });

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

    const personaTexts = destinationSignals.map((entry) =>
      normalizeText([entry.title, entry.category, entry.province, entry.district].join(" "))
    );
    const activityTexts = bookings.flatMap((booking) =>
      (booking?.packageSnapshot?.itineraryDays || []).flatMap((day) => [day?.title, day?.transport, ...(day?.activities || []).map((item) => item?.title)])
    );
    const combinedText = normalizeText([...personaTexts, ...activityTexts].join(" "));

    const avgGuests = average(bookings.map((booking) => Number(booking?.guests || 1))) || 1;
    const avgLeadDays =
      average(
        bookings
          .map((booking) => {
            const createdAt = toDate(booking?.createdAt);
            const checkIn = toDate(booking?.checkIn || booking?.date);
            if (!createdAt || !checkIn) return null;
            return Math.max(0, daysBetween(createdAt, checkIn));
          })
          .filter((value) => value !== null)
      ) || 0;
    const adventureHits = (combinedText.match(/adventure|trek|hike|paraglid|zip|safari|wildlife|cave|cycling|ultralight|flight/g) || []).length;
    const relaxationHits = (combinedText.match(/retreat|spa|lakeside|temple|heritage|culture|museum|sunset|sunrise|wellness|resort/g) || []).length;
    const natureHits = (combinedText.match(/mountain|lake|forest|jungle|wildlife|river|hike|trek|pagoda|waterfall|nature/g) || []).length;
    const cityHits = (combinedText.match(/city|market|museum|cafe|restaurant|urban|heritage|durbar/g) || []).length;
    const luxuryHits = (combinedText.match(/luxury|premium|resort|spa|honeymoon|serai|boutique|private/g) || []).length;
    const budgetHits = (combinedText.match(/budget|shared|group|hostel|local|value/g) || []).length;

    const travelerDnaAxes = [
      {
        key: "luxury",
        label: "Luxury",
        leftLabel: "Budget",
        rightLabel: "Luxury",
        value: clamp(
          50 +
            luxuryHits * 8 -
            budgetHits * 6 +
            (averageBookingValue >= 18000 ? 18 : averageBookingValue >= 9000 ? 8 : -10) +
            (spendingCategorySource.packages > spendingCategorySource.activities ? 4 : 0),
          10,
          95
        ),
      },
      {
        key: "adventure",
        label: "Adventure",
        leftLabel: "Relaxation",
        rightLabel: "Adventure",
        value: clamp(50 + adventureHits * 7 - relaxationHits * 5, 10, 95),
      },
      {
        key: "social",
        label: "Social",
        leftLabel: "Solo",
        rightLabel: "Social",
        value: clamp(44 + (avgGuests - 1) * 16 + acceptedBuddyCount * 7 + buddyCards.length * 3, 8, 95),
      },
      {
        key: "planner",
        label: "Planner",
        leftLabel: "Spontaneous",
        rightLabel: "Planner",
        value: clamp(34 + avgLeadDays * 2.2, 10, 95),
      },
      {
        key: "nature",
        label: "Nature",
        leftLabel: "City",
        rightLabel: "Nature",
        value: clamp(50 + natureHits * 6 - cityHits * 5, 10, 95),
      },
    ];
    const dnaScoreMap = travelerDnaAxes.reduce((acc, axis) => ({ ...acc, [axis.key]: axis.value }), {});

    let travelerPersonaTitle = "Balanced Explorer";
    if (dnaScoreMap.adventure >= 68 && dnaScoreMap.nature >= 65) travelerPersonaTitle = "Himalayan Nomad";
    else if (dnaScoreMap.luxury >= 68 && dnaScoreMap.nature <= 45) travelerPersonaTitle = "City Sophisticate";
    else if (dnaScoreMap.social >= 65 && dnaScoreMap.adventure >= 58) travelerPersonaTitle = "Summit Circle Curator";
    else if (dnaScoreMap.luxury <= 42 && dnaScoreMap.planner >= 60) travelerPersonaTitle = "Savvy Trail Strategist";
    else if (dnaScoreMap.adventure <= 45 && dnaScoreMap.luxury >= 55) travelerPersonaTitle = "Serene Escape Collector";

    const strongestAxis = [...travelerDnaAxes].sort((a, b) => b.value - a.value)[0];
    const travelerPersona = {
      title: travelerPersonaTitle,
      subtitle:
        strongestAxis
          ? `Your strongest signal leans toward ${strongestAxis.label.toLowerCase()} travel with a ${dnaScoreMap.planner >= 55 ? "thoughtful planning" : "flexible"} rhythm.`
          : "Your profile will sharpen as you add a few more trips.",
      axes: travelerDnaAxes,
      smartTip:
        travelerPersonaTitle === "Himalayan Nomad"
          ? "Adventure is clearly your signature. Shoulder-season mountain escapes with one comfort upgrade will match your style best."
          : travelerPersonaTitle === "City Sophisticate"
            ? "You respond well to polished, culture-rich city breaks. Kathmandu heritage stays and premium Pokhara retreats should feel naturally on-brand."
            : travelerPersonaTitle === "Summit Circle Curator"
              ? "You get more value when travel has both people and momentum. Group-ready scenic routes will likely outperform purely solo itineraries."
              : "Mixing one unfamiliar travel style into your next booking could sharpen your profile and unlock more tailored recommendations.",
    };

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const provinceCounts = destinationSignals
      .filter((entry) => entry.province)
      .reduce((acc, entry) => {
        const key = titleCase(entry.province);
        acc[key] = (acc[key] || 0) + entry.weight;
        return acc;
      }, {});
    const districtRollup = destinationSignals
      .filter((entry) => entry.district)
      .reduce((acc, entry) => {
        const key = titleCase(entry.district);
        if (!acc[key]) {
          acc[key] = {
            count: 0,
            lastVisited: null,
            province: titleCase(entry.province || ""),
          };
        }
        acc[key].count += 1;
        if (entry.date && (!acc[key].lastVisited || entry.date > acc[key].lastVisited)) {
          acc[key].lastVisited = entry.date;
        }
        return acc;
      }, {});
    const provincesVisited = PROVINCES.filter((province) => provinceCounts[province] > 0);
    const provinceCards = PROVINCES.map((province) => {
      const visits = provinceCounts[province] || 0;
      const status = visits >= 4 ? "Deep explored" : visits > 0 ? "Conquered" : "Next frontier";
      return {
        name: province,
        visits,
        progress: clamp(visits * 22, 0, 100),
        status,
      };
    });
    const districtEntries = Object.entries(districtRollup).map(([name, meta]) => ({
      name,
      ...meta,
      isStronghold: meta.count > 3,
      isRecent: meta.lastVisited ? meta.lastVisited >= sixMonthsAgo : false,
    }));
    const topDistricts = districtEntries
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(({ name, count }) => ({ name, value: count }));
    const strongholds = districtEntries
      .filter((district) => district.isStronghold)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((district) => ({
        name: district.name,
        province: district.province,
        visits: district.count,
        badge: "Veteran",
      }));
    const recentConquests = districtEntries
      .filter((district) => district.isRecent)
      .sort((a, b) => (b.lastVisited?.getTime?.() || 0) - (a.lastVisited?.getTime?.() || 0))
      .slice(0, 3)
      .map((district) => ({
        name: district.name,
        province: district.province,
        lastVisitedLabel: district.lastVisited
          ? district.lastVisited.toLocaleDateString("en-US", { month: "short", year: "numeric" })
          : "Recently",
        badge: "New Discovery",
      }));
    const unvisitedProvinceCards = provinceCards.filter((province) => province.visits === 0);
    const nextProvince = unvisitedProvinceCards[0]?.name || "All provinces explored";

    const transportMix = bookings.reduce((acc, booking) => {
      const mode = inferTransportMode(booking);
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {});
    const transportLegend = Object.entries(transportMix)
      .map(([label, value]) => ({ label, value, emissionFactor: transportEmissionFactor[label] || 40 }))
      .sort((a, b) => b.value - a.value);
    const co2Footprint = Math.round(
      bookings.reduce((sum, booking) => {
        const mode = inferTransportMode(booking);
        const tripDays = Math.max(
          1,
          booking?.checkIn && booking?.checkOut ? daysBetween(booking.checkIn, booking.checkOut) + 1 : booking?.packageSnapshot?.durationDays || 1
        );
        return sum + (transportEmissionFactor[mode] || 40) * Math.min(2.4, 1 + tripDays / 4);
      }, 0)
    );
    const ecoStayCount = bookings.filter((booking) =>
      /(eco|green|jungle lodge|community|homestay|nature lodge|forest park)/.test(
        normalizeText([booking?.listingId?.title, booking?.tripPackageId?.title, booking?.packageSnapshot?.title].join(" "))
      )
    ).length;
    const lowImpactTrips = (transportMix["Low-impact routes"] || 0) + (transportMix["Shared mobility"] || 0);
    const greenScore = clamp(
      Math.round(38 + ecoStayCount * 12 + lowImpactTrips * 7 - (transportMix["Domestic flights"] || 0) * 9 + completedTripsCount * 2),
      8,
      96
    );
    const velocity = clamp(Math.round((trips.length * 14) + totalTripDays * 0.8 + monthlyTripStarts.reduce((sum, item) => sum + item.count, 0) * 4), 0, 100);
    const sustainabilityInsights = {
      co2Footprint,
      greenScore,
      velocity,
      ecoStayCount,
      transportLegend,
      velocityLabel: velocity >= 72 ? "Fast-moving traveler" : velocity >= 45 ? "Steady explorer" : "Slow travel rhythm",
      smartTip:
        greenScore >= 70
          ? "Your current mix already leans greener than average. Keeping shared ground transfers in the rotation will preserve that edge."
          : transportMix["Domestic flights"] > 0
            ? "Short flight-led trips are doing most of the footprint damage. Replacing one with a longer road-based circuit would noticeably improve your Green Score."
            : "Adding one eco-leaning lodge or community stay to your next itinerary would lift your sustainability profile quickly.",
    };

    const groupBookings = bookings.filter((booking) => Number(booking?.guests || 1) > 1);
    const estimatedGroupSavings = Math.round(
      groupBookings.reduce((sum, booking) => {
        const guests = Number(booking?.guests || 1);
        const rate =
          booking?.bookingType === "trip"
            ? 0.18
            : booking?.bookingType === "hotel"
              ? 0.12
              : booking?.bookingType === "activity"
                ? 0.1
                : 0.08;
        return sum + Number(booking?.amount || 0) * rate * Math.max(1, guests - 1);
      }, 0)
    );
    const travelersInfluenced = acceptedBuddyCount + groupBookings.length + Math.max(0, buddyCards.length - acceptedBuddyCount);
    const socialValueScore = clamp(Math.round(travelersInfluenced * 12 + groupBookings.length * 10 + estimatedGroupSavings / 1800), 0, 100);
    const socialConnectivity = {
      travelersInfluenced,
      activeConnections: buddyCards.length,
      groupBookings: groupBookings.length,
      savings: estimatedGroupSavings,
      valueScore: socialValueScore,
      networkNodes: [
        { label: "You", size: 1 },
        ...buddyCards.map((card) => ({ label: card.name, size: /chat/i.test(card.status) ? 0.9 : 0.7 })),
      ],
      smartTip:
        estimatedGroupSavings > 0
          ? `Your strongest social value is cost-sharing. Small-group bookings are already saving roughly NPR ${estimatedGroupSavings.toLocaleString()} across your trips.`
          : "You have the beginnings of a network, but the biggest gain now would come from converting one future trip into a shared booking.",
    };

    const monthWeights = Array.from({ length: 12 }, (_, index) => ({
      key: MONTH_LABELS[index],
      monthIndex: index,
      score: 0,
    }));
    const addMonthWeight = (dateValue, weight) => {
      const date = toDate(dateValue);
      if (!date) return;
      monthWeights[date.getMonth()].score += weight;
    };
    trips.forEach((trip) => addMonthWeight(trip?.startDate, 3));
    bookings.forEach((booking) => addMonthWeight(booking?.checkIn || booking?.date || booking?.createdAt, 2));
    savedPlaces.forEach((place) => addMonthWeight(place?.createdAt, 1));

    const maxMonthScore = Math.max(...monthWeights.map((item) => item.score), 1);
    const seasonalMonths = monthWeights.map((item) => ({
      ...item,
      intensity: clamp(Math.ceil((item.score / maxMonthScore) * 4), item.score > 0 ? 1 : 0, 4),
    }));
    const favoriteMonth = [...seasonalMonths].sort((a, b) => b.score - a.score)[0] || seasonalMonths[0];
    const seasonScores = Object.entries(SEASONS).map(([season, monthIndexes]) => ({
      season,
      score: monthIndexes.reduce((sum, monthIndex) => sum + monthWeights[monthIndex].score, 0),
    }));
    const favoriteSeason = seasonScores.sort((a, b) => b.score - a.score)[0] || { season: "Autumn", score: 0 };
    const offSeasonTarget = seasonScores.sort((a, b) => a.score - b.score)[0] || favoriteSeason;
    const provinceAffinityRules = [
      {
        province: "Koshi",
        score:
          dnaScoreMap.adventure * 1.2 +
          dnaScoreMap.nature * 1.1 +
          (favoriteSeason.season === "Autumn" ? 8 : 0),
      },
      {
        province: "Madhesh",
        score: (100 - dnaScoreMap.nature) * 0.55 + dnaScoreMap.social * 0.65 + dnaScoreMap.luxury * 0.2,
      },
      {
        province: "Bagmati",
        score: dnaScoreMap.luxury * 0.7 + (100 - dnaScoreMap.nature) * 0.45 + dnaScoreMap.planner * 0.35,
      },
      {
        province: "Gandaki",
        score: dnaScoreMap.adventure * 0.9 + dnaScoreMap.nature * 0.85 + dnaScoreMap.social * 0.2,
      },
      {
        province: "Lumbini",
        score: (100 - dnaScoreMap.adventure) * 0.35 + dnaScoreMap.planner * 0.55 + (100 - dnaScoreMap.nature) * 0.15,
      },
      {
        province: "Karnali",
        score: dnaScoreMap.adventure * 1.1 + dnaScoreMap.nature * 0.95 + (100 - dnaScoreMap.luxury) * 0.15,
      },
      {
        province: "Sudurpashchim",
        score: dnaScoreMap.nature * 0.85 + dnaScoreMap.social * 0.35 + dnaScoreMap.adventure * 0.55,
      },
    ];
    const recommendedFrontiers = provinceAffinityRules
      .filter((item) => unvisitedProvinceCards.some((province) => province.name === item.province))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((item) => item.province);
    const seasonalAffinity = {
      months: seasonalMonths,
      favoriteMonth: favoriteMonth?.key || "Oct",
      favoriteSeason: favoriteSeason.season,
      offSeason: offSeasonTarget.season,
      travelMode:
        favoriteSeason.score >= 6
          ? `${favoriteSeason.season} loyalist`
          : "Flexible all-season traveler",
      smartTip:
        favoriteSeason.season === "Autumn"
          ? "Autumn is clearly your comfort zone. A spring trip with similar scenery but lighter crowds could feel like the perfect controlled stretch."
          : `You naturally gravitate toward ${favoriteSeason.season.toLowerCase()} travel. Testing one ${offSeasonTarget.season.toLowerCase()} itinerary could unlock better value without losing your style.`,
    };
    const nepalMastery = {
      conqueredCount: provincesVisited.length,
      totalCount: PROVINCES.length,
      provinces: provinceCards,
      topDistricts,
      nextProvince,
      strongholds,
      recentConquests,
      recommendedFrontiers,
      smartTip:
        provincesVisited.length >= 4
          ? `${recommendedFrontiers[0] || nextProvince} is the cleanest next unlock if you want broader Nepal coverage without repeating the same circuit.`
          : `You already have momentum in ${topDistricts[0]?.name || "your current circuit"}. Branching into ${recommendedFrontiers[0] || nextProvince} would make your Nepal profile feel more complete.`,
    };

    const dashboardSummary = [
      nepalMastery.strongholds[0]
        ? `${nepalMastery.strongholds[0].name} is now a veteran district in your profile, giving your Nepal footprint a recognizable home base.`
        : "Your Nepal footprint is still forming, which means new provinces can quickly reshape your profile.",
      nepalMastery.recentConquests[0]
        ? `${nepalMastery.recentConquests[0].name} is your freshest conquest from ${nepalMastery.recentConquests[0].lastVisitedLabel}, keeping your map momentum active.`
        : "A fresh district visit in the next few months would unlock a more dynamic conquest pattern on your map.",
      recommendedFrontiers.length > 0
        ? `${recommendedFrontiers.join(" and ")} look like the best unvisited province matches for your current Traveler DNA.`
        : "You have already touched every province in the current dataset, so depth rather than breadth is the next mastery move.",
      `Your ${travelerPersona.title} profile, ${seasonalAffinity.favoriteSeason.toLowerCase()} preference, and ${sustainabilityInsights.velocityLabel.toLowerCase()} rhythm all point toward more curated regional recommendations.`,
    ];

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
      travelerPersona,
      nepalMastery,
      sustainabilityInsights,
      socialConnectivity,
      seasonalAffinity,
      dashboardSummary,
    };
  }, [bookings, buddyCards, error, loading, locations, payments, savedPlaces, trips]);
}
