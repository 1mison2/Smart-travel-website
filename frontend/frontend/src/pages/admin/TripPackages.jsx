import React, { useEffect, useMemo, useState } from "react";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import AdminSectionNav from "../../components/admin/AdminSectionNav";
import { useAdminUi } from "../../components/admin/adminUiContextValue";
import useUnsavedChangesPrompt from "../../hooks/useUnsavedChangesPrompt";
import api from "../../utils/api";

const createEmptyFaq = () => ({ question: "", answer: "" });
const createEmptyDay = (dayNumber = 1) => ({
  dayNumber,
  title: "",
  summary: "",
  hotelName: "",
  hotelListingId: "",
  meals: "",
  transport: "",
  altitude: "",
  notes: "",
  image: "",
  activities: [],
});

const emptyForm = {
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  location: "",
  region: "",
  pickupCity: "",
  dropoffCity: "",
  startDate: "",
  endDate: "",
  basePrice: "",
  discountPrice: "",
  rating: "",
  currency: "NPR",
  capacity: 1,
  minGuests: 1,
  maxGuests: 1,
  coverImage: "",
  galleryImages: "",
  videoUrl: "",
  included: "",
  excluded: "",
  highlights: "",
  bestSeason: "",
  difficulty: "",
  tripType: "",
  cancellationPolicy: "",
  paymentPolicy: "",
  faqs: [createEmptyFaq()],
  itineraryDays: [createEmptyDay(1)],
  addOnListings: [],
  isFeatured: false,
  isActive: true,
};

const buildSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const defaultOpenSections = {
  core: true,
  pricing: false,
  content: false,
  itinerary: false,
  policies: false,
  addons: false,
};

export default function AdminTripPackages() {
  const [form, setForm] = useState(emptyForm);
  const [packages, setPackages] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [tripTypeFilter, setTripTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    location: "all",
    tripType: "all",
    status: "all",
    startDate: "",
    endDate: "",
  });
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
  const [openSections, setOpenSections] = useState(defaultOpenSections);
  const { showToast } = useAdminUi();

  const hotelListings = useMemo(
    () => listings.filter((listing) => listing.type === "hotel"),
    [listings]
  );
  const activityListings = useMemo(
    () => listings.filter((listing) => listing.type === "activity"),
    [listings]
  );
  const addOnCandidates = useMemo(
    () => listings.filter((listing) => ["hotel", "activity", "cafe", "restaurant"].includes(listing.type)),
    [listings]
  );
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesLocation = appliedFilters.location === "all" || String(pkg.location || "") === appliedFilters.location;
      const matchesTripType = appliedFilters.tripType === "all" || String(pkg.tripType || "") === appliedFilters.tripType;
      const status = !pkg.isActive ? "inactive" : pkg.isFeatured ? "featured" : "active";
      const matchesStatus = appliedFilters.status === "all" || status === appliedFilters.status;
      const matchesDate = isDateRangeMatch(pkg.startDate, pkg.endDate, appliedFilters.startDate, appliedFilters.endDate);
      return matchesLocation && matchesTripType && matchesStatus && matchesDate;
    });
  }, [packages, appliedFilters]);
  const locationOptions = useMemo(
    () => Array.from(new Set(packages.map((pkg) => String(pkg.location || "").trim()).filter(Boolean))),
    [packages]
  );
  const tripTypeOptions = useMemo(
    () => Array.from(new Set(packages.map((pkg) => String(pkg.tripType || "").trim()).filter(Boolean))),
    [packages]
  );

  const loadPackages = async () => {
    try {
      setLoading(true);
      const [packagesRes, listingsRes] = await Promise.all([
        api.get("/api/admin/trip-packages"),
        api.get("/api/admin/listings?includeInactive=true"),
      ]);
      setPackages(Array.isArray(packagesRes.data?.packages) ? packagesRes.data.packages : []);
      setListings(Array.isArray(listingsRes.data?.listings) ? listingsRes.data.listings : []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load trip packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const isDirty =
    Boolean(editingId) ||
    Boolean(form.title || form.slug || form.shortDescription || form.description || form.location || form.region || form.pickupCity || form.dropoffCity || form.startDate || form.endDate) ||
    Boolean(form.basePrice || form.discountPrice || form.rating || form.coverImage || form.galleryImages || form.videoUrl || form.included || form.excluded || form.highlights || form.bestSeason || form.difficulty || form.tripType || form.cancellationPolicy || form.paymentPolicy) ||
    (form.faqs || []).some((faq) => faq.question || faq.answer) ||
    (form.itineraryDays || []).some((day) => day.title || day.summary || day.notes || (day.activities || []).length) ||
    Boolean((form.addOnListings || []).length);

  useUnsavedChangesPrompt(isDirty);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "title" && !prev.slug) next.slug = buildSlug(value);
      return next;
    });
  };

  const onToggleAddOn = (id) => {
    setForm((prev) => {
      const current = prev.addOnListings || [];
      const exists = current.includes(id);
      const next = exists ? current.filter((item) => item !== id) : [...current, id];
      return { ...prev, addOnListings: next };
    });
  };

  const addFaq = () => setForm((prev) => ({ ...prev, faqs: [...prev.faqs, createEmptyFaq()] }));
  const removeFaq = (index) =>
    setForm((prev) => ({ ...prev, faqs: prev.faqs.filter((_, faqIndex) => faqIndex !== index) }));
  const updateFaq = (index, key, value) =>
    setForm((prev) => ({
      ...prev,
      faqs: prev.faqs.map((faq, faqIndex) => (faqIndex === index ? { ...faq, [key]: value } : faq)),
    }));

  const addItineraryDay = () =>
    setForm((prev) => ({
      ...prev,
      itineraryDays: [...prev.itineraryDays, createEmptyDay(prev.itineraryDays.length + 1)],
    }));

  const removeItineraryDay = (index) =>
    setForm((prev) => ({
      ...prev,
      itineraryDays: prev.itineraryDays
        .filter((_, dayIndex) => dayIndex !== index)
        .map((day, nextIndex) => ({ ...day, dayNumber: nextIndex + 1 })),
    }));

  const updateDay = (index, key, value) =>
    setForm((prev) => ({
      ...prev,
      itineraryDays: prev.itineraryDays.map((day, dayIndex) =>
        dayIndex === index ? { ...day, [key]: value } : day
      ),
    }));

  const addDayActivity = (dayIndex) =>
    setForm((prev) => ({
      ...prev,
      itineraryDays: prev.itineraryDays.map((day, index) =>
        index === dayIndex
          ? { ...day, activities: [...(day.activities || []), { listingId: "", title: "", notes: "" }] }
          : day
      ),
    }));

  const updateDayActivity = (dayIndex, activityIndex, key, value) =>
    setForm((prev) => ({
      ...prev,
      itineraryDays: prev.itineraryDays.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              activities: (day.activities || []).map((activity, innerIndex) =>
                innerIndex === activityIndex ? { ...activity, [key]: value } : activity
              ),
            }
          : day
      ),
    }));

  const removeDayActivity = (dayIndex, activityIndex) =>
    setForm((prev) => ({
      ...prev,
      itineraryDays: prev.itineraryDays.map((day, index) =>
        index === dayIndex
          ? { ...day, activities: (day.activities || []).filter((_, innerIndex) => innerIndex !== activityIndex) }
          : day
      ),
    }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
    setOpenSections(defaultOpenSections);
  };

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const applyFilters = () => {
    setAppliedFilters({
      location: locationFilter,
      tripType: tripTypeFilter,
      status: statusFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
    });
    setHasAppliedFilters(true);
  };

  const resetBrowseFilters = () => {
    setLocationFilter("all");
    setTripTypeFilter("all");
    setStatusFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setAppliedFilters({
      location: "all",
      tripType: "all",
      status: "all",
      startDate: "",
      endDate: "",
    });
    setHasAppliedFilters(false);
  };

  const onEdit = (pkg) => {
    setEditingId(pkg._id);
    setOpenSections({
      core: true,
      pricing: true,
      content: false,
      itinerary: false,
      policies: false,
      addons: false,
    });
    setForm({
      title: pkg.title || "",
      slug: pkg.slug || "",
      shortDescription: pkg.shortDescription || "",
      description: pkg.description || "",
      location: pkg.location || "",
      region: pkg.region || "",
      pickupCity: pkg.pickupCity || "",
      dropoffCity: pkg.dropoffCity || "",
      startDate: pkg.startDate ? pkg.startDate.slice(0, 10) : "",
      endDate: pkg.endDate ? pkg.endDate.slice(0, 10) : "",
      basePrice: pkg.basePrice || "",
      discountPrice: pkg.discountPrice || "",
      rating: pkg.rating || "",
      currency: pkg.currency || "NPR",
      capacity: pkg.capacity || 1,
      minGuests: pkg.minGuests || 1,
      maxGuests: pkg.maxGuests || pkg.capacity || 1,
      coverImage: pkg.coverImage || "",
      galleryImages: Array.isArray(pkg.galleryImages) ? pkg.galleryImages.join(", ") : "",
      videoUrl: pkg.videoUrl || "",
      included: Array.isArray(pkg.included) ? pkg.included.join(", ") : "",
      excluded: Array.isArray(pkg.excluded) ? pkg.excluded.join(", ") : "",
      highlights: Array.isArray(pkg.highlights) ? pkg.highlights.join(", ") : "",
      bestSeason: pkg.bestSeason || "",
      difficulty: pkg.difficulty || "",
      tripType: pkg.tripType || "",
      cancellationPolicy: pkg.cancellationPolicy || "",
      paymentPolicy: pkg.paymentPolicy || "",
      faqs: Array.isArray(pkg.faqs) && pkg.faqs.length ? pkg.faqs : [createEmptyFaq()],
      itineraryDays:
        Array.isArray(pkg.itineraryDays) && pkg.itineraryDays.length
          ? pkg.itineraryDays.map((day, index) => ({
              dayNumber: day.dayNumber || index + 1,
              title: day.title || "",
              summary: day.summary || "",
              hotelName: day.hotelName || "",
              hotelListingId: day.hotelListingId?._id || day.hotelListingId || "",
              meals: Array.isArray(day.meals) ? day.meals.join(", ") : "",
              transport: day.transport || "",
              altitude: day.altitude || "",
              notes: day.notes || "",
              image: day.image || "",
              activities: Array.isArray(day.activities)
                ? day.activities.map((activity) => ({
                    listingId: activity.listingId?._id || activity.listingId || "",
                    title: activity.title || "",
                    notes: activity.notes || "",
                  }))
                : [],
            }))
          : [createEmptyDay(1)],
      addOnListings: Array.isArray(pkg.addOnListings)
        ? pkg.addOnListings.map((item) => (item._id ? item._id : item))
        : [],
      isFeatured: Boolean(pkg.isFeatured),
      isActive: typeof pkg.isActive === "boolean" ? pkg.isActive : true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      const payload = {
        ...form,
        slug: form.slug || buildSlug(form.title),
        basePrice: Number(form.basePrice || 0),
        discountPrice: Number(form.discountPrice || 0),
        rating: Number(form.rating || 0),
        capacity: Number(form.capacity || 1),
        minGuests: Number(form.minGuests || 1),
        maxGuests: Number(form.maxGuests || 1),
        faqs: (form.faqs || []).filter((faq) => faq.question.trim() || faq.answer.trim()),
        itineraryDays: (form.itineraryDays || []).map((day, index) => ({
          ...day,
          dayNumber: Number(day.dayNumber || index + 1),
          meals: day.meals,
          activities: (day.activities || []).filter(
            (activity) => String(activity.title || "").trim() || String(activity.listingId || "").trim()
          ),
        })),
      };
      if (new Date(payload.endDate) < new Date(payload.startDate)) {
        setError("End date must be after the start date.");
        return;
      }
      if (payload.basePrice < 0 || payload.discountPrice < 0) {
        setError("Prices cannot be negative.");
        return;
      }
      if (payload.discountPrice > payload.basePrice && payload.basePrice > 0) {
        setError("Discount price cannot be higher than the base price.");
        return;
      }
      if (payload.rating < 0 || payload.rating > 5) {
        setError("Rating must stay between 0 and 5.");
        return;
      }
      if (payload.minGuests < 1 || payload.maxGuests < payload.minGuests || payload.capacity < payload.maxGuests) {
        setError("Guest limits must be valid and stay within total capacity.");
        return;
      }
      if (editingId) {
        await api.put(`/api/admin/trip-packages/${editingId}`, payload);
        showToast({ title: "Package updated", message: `${payload.title} was updated successfully.` });
      } else {
        await api.post("/api/admin/trip-packages", payload);
        showToast({ title: "Package created", message: `${payload.title} is ready for publishing.` });
      }
      resetForm();
      await loadPackages();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save trip package");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/api/admin/trip-packages/${id}`);
      await loadPackages();
      showToast({ title: "Package deleted", message: "The trip package was removed from the catalog." });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete trip package");
    }
  };

  return (
    <section className="admin-page">
      <h1 className="admin-page__title">Trip Packages</h1>
      <p className="admin-page__subtitle">
        Build full travel packages with highlights, policies, itineraries, hotels, activities, and checkout add-ons.
      </p>
      {error && <p className="admin-alert admin-alert--error">{error}</p>}

      <form onSubmit={onSubmit} className="admin-card admin-card--padded admin-form">
        <div className="trip-admin-section__head">
          <div>
            <h2>{editingId ? "Edit Package" : "Create Package"}</h2>
            <p className="admin-page__subtitle">
              Use this form to manage the actual package details. Featured highlights the package, while active keeps it live on the site.
            </p>
          </div>
          <button type="button" className="admin-btn admin-btn--muted" onClick={resetForm}>
            Clear Form
          </button>
        </div>
        <div className="trip-admin-overview">
          <div className="trip-admin-overview__meta">
            <span>{Object.values(openSections).filter(Boolean).length} sections open</span>
            <span>{editingId ? "Editing package" : "New package draft"}</span>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--muted"
            onClick={() =>
              setOpenSections((prev) => {
                const hasClosedSection = Object.values(prev).some((isOpen) => !isOpen);
                return Object.fromEntries(Object.keys(prev).map((key) => [key, hasClosedSection]));
              })
            }
          >
            {Object.values(openSections).every(Boolean) ? "Collapse all" : "Expand all"}
          </button>
        </div>
        <AdminSectionNav
          sections={[
            { id: "trip-admin-core", label: "Core details" },
            { id: "trip-admin-pricing", label: "Pricing and media" },
            { id: "trip-admin-content", label: "Package content" },
            { id: "trip-admin-itinerary", label: "Itinerary" },
            { id: "trip-admin-policies", label: "Policies and FAQs" },
            { id: "trip-admin-addons", label: "Checkout add-ons" },
          ]}
        />
        <div className="trip-admin-section" id="trip-admin-core">
          <button type="button" className="trip-admin-toggle" onClick={() => toggleSection("core")}>
            <div>
              <h2>Core details</h2>
              <p>Title, route, dates, and the main package basics.</p>
            </div>
            <span>{openSections.core ? "Hide" : "Show"}</span>
          </button>
          {openSections.core && (
            <div className="trip-admin-section__body">
              <div className="admin-form__grid">
                <input className="admin-input" name="title" placeholder="Package Title" value={form.title} onChange={onChange} required />
                <input className="admin-input" name="slug" placeholder="package-slug" value={form.slug} onChange={onChange} />
                <input className="admin-input" name="location" placeholder="Location (e.g. Pokhara)" value={form.location} onChange={onChange} />
                <input className="admin-input" name="region" placeholder="Region" value={form.region} onChange={onChange} />
                <input className="admin-input" name="pickupCity" placeholder="Pickup City" value={form.pickupCity} onChange={onChange} />
                <input className="admin-input" name="dropoffCity" placeholder="Drop-off City" value={form.dropoffCity} onChange={onChange} />
                <input className="admin-input" name="startDate" type="date" value={form.startDate} onChange={onChange} required />
                <input className="admin-input" name="endDate" type="date" value={form.endDate} onChange={onChange} required />
                <input className="admin-input" name="tripType" placeholder="Trip Type" value={form.tripType} onChange={onChange} />
                <input className="admin-input" name="difficulty" placeholder="Difficulty" value={form.difficulty} onChange={onChange} />
                <input className="admin-input" name="bestSeason" placeholder="Best Season" value={form.bestSeason} onChange={onChange} />
              </div>
              <textarea className="admin-textarea" name="shortDescription" placeholder="Short description" value={form.shortDescription} onChange={onChange} rows={2} />
              <textarea className="admin-textarea" name="description" placeholder="Full description" value={form.description} onChange={onChange} rows={4} />
            </div>
          )}
        </div>

        <div className="trip-admin-section" id="trip-admin-pricing">
          <button type="button" className="trip-admin-toggle" onClick={() => toggleSection("pricing")}>
            <div>
              <h2>Pricing and media</h2>
              <p>Price, guest limits, and package images.</p>
            </div>
            <span>{openSections.pricing ? "Hide" : "Show"}</span>
          </button>
          {openSections.pricing && (
            <div className="trip-admin-section__body">
              <p className="admin-page__subtitle">
                If `Cover Image URL` is left empty, the package page will automatically use the uploaded image from the matching destination when available.
              </p>
              <div className="admin-form__grid">
                <input className="admin-input" name="basePrice" type="number" min="0" placeholder="Base Price" value={form.basePrice} onChange={onChange} required />
                <input className="admin-input" name="discountPrice" type="number" min="0" placeholder="Discount Price" value={form.discountPrice} onChange={onChange} />
                <input className="admin-input" name="rating" type="number" min="0" max="5" step="0.1" placeholder="Rating (0-5)" value={form.rating} onChange={onChange} />
                <input className="admin-input" name="currency" placeholder="Currency" value={form.currency} onChange={onChange} />
                <input className="admin-input" name="capacity" type="number" min="1" placeholder="Capacity" value={form.capacity} onChange={onChange} />
                <input className="admin-input" name="minGuests" type="number" min="1" placeholder="Minimum guests" value={form.minGuests} onChange={onChange} />
                <input className="admin-input" name="maxGuests" type="number" min="1" placeholder="Maximum guests" value={form.maxGuests} onChange={onChange} />
                <input className="admin-input" name="coverImage" placeholder="Cover Image URL" value={form.coverImage} onChange={onChange} />
                <input className="admin-input" name="galleryImages" placeholder="Gallery image URLs (comma separated)" value={form.galleryImages} onChange={onChange} />
              </div>
            </div>
          )}
        </div>

        <div className="trip-admin-section" id="trip-admin-content">
          <button type="button" className="trip-admin-toggle" onClick={() => toggleSection("content")}>
            <div>
              <h2>Package content</h2>
              <p>Highlights plus what is included and excluded.</p>
            </div>
            <span>{openSections.content ? "Hide" : "Show"}</span>
          </button>
          {openSections.content && (
            <div className="trip-admin-section__body">
              <textarea className="admin-textarea" name="highlights" placeholder="Highlights (comma separated)" value={form.highlights} onChange={onChange} rows={2} />
              <textarea className="admin-textarea" name="included" placeholder="Included items (comma separated)" value={form.included} onChange={onChange} rows={3} />
              <textarea className="admin-textarea" name="excluded" placeholder="Excluded items (comma separated)" value={form.excluded} onChange={onChange} rows={3} />
            </div>
          )}
        </div>

        <div className="trip-admin-section" id="trip-admin-itinerary">
          <button type="button" className="trip-admin-toggle" onClick={() => toggleSection("itinerary")}>
            <div>
              <h2>Day-wise itinerary</h2>
              <p>{form.itineraryDays.length} day{form.itineraryDays.length === 1 ? "" : "s"} planned so far.</p>
            </div>
            <span>{openSections.itinerary ? "Hide" : "Show"}</span>
          </button>
          {openSections.itinerary && (
            <div className="trip-admin-section__body">
              <div className="trip-admin-section__head">
                <h3>Package days</h3>
                <button type="button" className="admin-btn admin-btn--primary" onClick={addItineraryDay}>Add Day</button>
              </div>
              <div className="trip-admin-days">
                {form.itineraryDays.map((day, dayIndex) => (
                  <div key={`day-${dayIndex}`} className="trip-admin-day">
                    <div className="trip-admin-day__head">
                      <h3>Day {day.dayNumber}</h3>
                      {form.itineraryDays.length > 1 && (
                        <button type="button" className="admin-btn admin-btn--danger" onClick={() => removeItineraryDay(dayIndex)}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="admin-form__grid">
                      <input className="admin-input" placeholder="Day title" value={day.title} onChange={(e) => updateDay(dayIndex, "title", e.target.value)} />
                      <input className="admin-input" placeholder="Hotel name" value={day.hotelName} onChange={(e) => updateDay(dayIndex, "hotelName", e.target.value)} />
                      <select className="admin-input" value={day.hotelListingId} onChange={(e) => updateDay(dayIndex, "hotelListingId", e.target.value)}>
                        <option value="">Linked hotel listing</option>
                        {hotelListings.map((listing) => (
                          <option key={listing._id} value={listing._id}>{listing.title}</option>
                        ))}
                      </select>
                      <input className="admin-input" placeholder="Meals (comma separated)" value={day.meals} onChange={(e) => updateDay(dayIndex, "meals", e.target.value)} />
                      <input className="admin-input" placeholder="Transport" value={day.transport} onChange={(e) => updateDay(dayIndex, "transport", e.target.value)} />
                      <input className="admin-input" placeholder="Altitude / level" value={day.altitude} onChange={(e) => updateDay(dayIndex, "altitude", e.target.value)} />
                    </div>
                    <textarea className="admin-textarea" placeholder="Day summary" value={day.summary} onChange={(e) => updateDay(dayIndex, "summary", e.target.value)} rows={3} />
                    <textarea className="admin-textarea" placeholder="Day notes" value={day.notes} onChange={(e) => updateDay(dayIndex, "notes", e.target.value)} rows={2} />

                    <div className="trip-admin-subsection">
                      <div className="trip-admin-section__head">
                        <h4>Activities</h4>
                        <button type="button" className="admin-btn admin-btn--muted" onClick={() => addDayActivity(dayIndex)}>Add Activity</button>
                      </div>
                      {(day.activities || []).map((activity, activityIndex) => (
                        <div key={`activity-${activityIndex}`} className="trip-admin-activity">
                          <div className="admin-form__grid">
                            <select
                              className="admin-input"
                              value={activity.listingId}
                              onChange={(e) => updateDayActivity(dayIndex, activityIndex, "listingId", e.target.value)}
                            >
                              <option value="">Linked activity listing</option>
                              {activityListings.map((listing) => (
                                <option key={listing._id} value={listing._id}>{listing.title}</option>
                              ))}
                            </select>
                            <input
                              className="admin-input"
                              placeholder="Activity title"
                              value={activity.title}
                              onChange={(e) => updateDayActivity(dayIndex, activityIndex, "title", e.target.value)}
                            />
                          </div>
                          <div className="trip-admin-activity__row">
                            <textarea
                              className="admin-textarea"
                              placeholder="Activity notes"
                              value={activity.notes}
                              onChange={(e) => updateDayActivity(dayIndex, activityIndex, "notes", e.target.value)}
                              rows={2}
                            />
                            <button type="button" className="admin-btn admin-btn--danger" onClick={() => removeDayActivity(dayIndex, activityIndex)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="trip-admin-section" id="trip-admin-policies">
          <button type="button" className="trip-admin-toggle" onClick={() => toggleSection("policies")}>
            <div>
              <h2>Policies and FAQs</h2>
              <p>Payment rules, cancellation terms, and common questions.</p>
            </div>
            <span>{openSections.policies ? "Hide" : "Show"}</span>
          </button>
          {openSections.policies && (
            <div className="trip-admin-section__body">
              <textarea className="admin-textarea" name="paymentPolicy" placeholder="Payment policy" value={form.paymentPolicy} onChange={onChange} rows={3} />
              <textarea className="admin-textarea" name="cancellationPolicy" placeholder="Cancellation policy" value={form.cancellationPolicy} onChange={onChange} rows={3} />
              <div className="trip-admin-section__head">
                <h3>FAQs</h3>
                <button type="button" className="admin-btn admin-btn--muted" onClick={addFaq}>Add FAQ</button>
              </div>
              <div className="trip-admin-faqs">
                {form.faqs.map((faq, index) => (
                  <div key={`faq-${index}`} className="trip-admin-faq">
                    <input className="admin-input" placeholder="Question" value={faq.question} onChange={(e) => updateFaq(index, "question", e.target.value)} />
                    <textarea className="admin-textarea" placeholder="Answer" value={faq.answer} onChange={(e) => updateFaq(index, "answer", e.target.value)} rows={2} />
                    {form.faqs.length > 1 && (
                      <button type="button" className="admin-btn admin-btn--danger" onClick={() => removeFaq(index)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="trip-admin-section" id="trip-admin-addons">
          <button type="button" className="trip-admin-toggle" onClick={() => toggleSection("addons")}>
            <div>
              <h2>Checkout add-ons</h2>
              <p>{(form.addOnListings || []).length} linked extras and package visibility settings.</p>
            </div>
            <span>{openSections.addons ? "Hide" : "Show"}</span>
          </button>
          {openSections.addons && (
            <div className="trip-admin-section__body">
              <div className="admin-form__grid">
                {addOnCandidates.map((listing) => (
                  <label key={listing._id} className="admin-addon">
                    <input
                      type="checkbox"
                      checked={(form.addOnListings || []).includes(listing._id)}
                      onChange={() => onToggleAddOn(listing._id)}
                    />
                    <span>{listing.title}</span>
                  </label>
                ))}
              </div>
              <div className="trip-admin-flags">
                <label className="admin-page__subtitle">
                  <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={onChange} /> Featured
                </label>
                <label className="admin-page__subtitle">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} /> Active
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="trip-admin-form-actions">
          <button type="submit" disabled={saving} className="admin-btn admin-btn--primary">
            {saving ? "Saving..." : editingId ? "Update Package" : "Create Package"}
          </button>
          {editingId && (
            <button type="button" className="admin-btn admin-btn--muted" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="admin-loading">Loading packages...</p>
      ) : (
        <div className="admin-card admin-table-wrap">
          <div className="admin-filter-panel">
            <div className="admin-filter-panel__head">
              <div>
                <p className="admin-filter-panel__eyebrow">Browse packages</p>
                <h3>Filter the package table</h3>
              </div>
              <div className="admin-filter-panel__meta">
                <span>{hasAppliedFilters ? `${filteredPackages.length} shown` : "0 shown"}</span>
                <span>{packages.length} total</span>
              </div>
            </div>

            <div className="admin-table-filters">
              <label className="admin-filter-field">
                <span>Location</span>
                <select className="admin-input" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
                  <option value="all">All locations</option>
                  {locationOptions.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-filter-field">
                <span>Trip type</span>
                <select className="admin-input" value={tripTypeFilter} onChange={(e) => setTripTypeFilter(e.target.value)}>
                  <option value="all">All trip types</option>
                  {tripTypeOptions.map((tripType) => (
                    <option key={tripType} value={tripType}>
                      {tripType}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-filter-field">
                <span>Status</span>
                <select className="admin-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="featured">Featured</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label className="admin-filter-field">
                <span>Start from</span>
                <input className="admin-input" type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} />
              </label>

              <label className="admin-filter-field">
                <span>End to</span>
                <input className="admin-input" type="date" value={endDateFilter} min={startDateFilter || undefined} onChange={(e) => setEndDateFilter(e.target.value)} />
              </label>
            </div>

            <div className="admin-filter-panel__actions">
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={applyFilters}
              >
                Apply filters
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--muted"
                onClick={resetBrowseFilters}
                disabled={
                  locationFilter === "all" &&
                  tripTypeFilter === "all" &&
                  statusFilter === "all" &&
                  !startDateFilter &&
                  !endDateFilter
                }
              >
                Reset filters
              </button>
            </div>
          </div>

          {!hasAppliedFilters ? (
            <AdminEmptyState
              title="Package catalog ready to browse"
              copy="Apply filters to inspect published, featured, or inactive packages before editing them."
            />
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Location</th>
                  <th>Dates</th>
                  <th>Price</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPackages.map((pkg) => (
                  <tr key={pkg._id}>
                    <td>{pkg.title}</td>
                    <td>{pkg.location || "-"}</td>
                    <td>{formatDate(pkg.startDate)} - {formatDate(pkg.endDate)}</td>
                    <td>{pkg.currency || "NPR"} {pkg.discountPrice || pkg.basePrice}</td>
                    <td>{Array.isArray(pkg.itineraryDays) && pkg.itineraryDays.length ? pkg.itineraryDays.length : getTripDays(pkg.startDate, pkg.endDate)}</td>
                    <td>{pkg.isActive ? (pkg.isFeatured ? "Featured" : "Active") : "Inactive"}</td>
                    <td>
                      <div className="trip-admin-table-actions">
                        <button type="button" className="admin-btn admin-btn--primary" onClick={() => onEdit(pkg)}>Edit</button>
                        <button type="button" className="admin-btn admin-btn--danger" onClick={() => onDelete(pkg._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPackages.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      <AdminEmptyState
                        title="No packages matched"
                        copy="Try changing location, trip type, or status filters, or create a new package above."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      <style>{`
        .trip-admin-section {
          display: grid;
          gap: 14px;
          padding-top: 16px;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
        }
        .trip-admin-overview {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(248, 250, 252, 0.88);
          border: 1px solid rgba(148, 163, 184, 0.16);
        }
        .trip-admin-overview__meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .trip-admin-overview__meta span {
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.14);
          color: #475569;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .trip-admin-toggle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          width: 100%;
          padding: 14px 0;
          border: 0;
          border-radius: 16px;
          background: transparent;
          text-align: left;
          cursor: pointer;
        }
        .trip-admin-toggle > div {
          min-width: 0;
        }
        .trip-admin-toggle p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 0.9rem;
        }
        .trip-admin-toggle span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 66px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(241, 245, 249, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.18);
          color: #0f172a;
          font-size: 0.82rem;
          font-weight: 700;
          flex: 0 0 auto;
          transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
        }
        .trip-admin-toggle:hover span {
          transform: translateY(-1px);
          border-color: rgba(14, 165, 233, 0.35);
          background: #e0f2fe;
        }
        .trip-admin-section__body {
          display: grid;
          gap: 12px;
        }
        .trip-admin-form-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 8px;
          padding: 18px 0 0;
          border-top: 1px solid rgba(148, 163, 184, 0.22);
        }
        .trip-admin-form-actions .admin-btn {
          min-width: 150px;
        }
        .trip-admin-table-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          min-width: 260px;
        }
        .trip-admin-table-actions .admin-btn {
          padding: 8px 10px;
          border-radius: 12px;
          font-size: 0.76rem;
          white-space: nowrap;
        }
        .admin-filter-panel {
          margin-bottom: 16px;
          padding: 18px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(248,250,252,0.92));
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
        }
        .admin-filter-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .admin-filter-panel__eyebrow {
          margin: 0 0 4px;
          color: #f97316;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .admin-filter-panel__head h3 {
          margin: 0;
          color: #0f172a;
          font-size: 1.15rem;
        }
        .admin-filter-panel__meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .admin-filter-panel__meta span {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.86);
          border: 1px solid rgba(148, 163, 184, 0.18);
          color: #475569;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .admin-table-filters {
          display: grid;
          grid-template-columns: repeat(5, minmax(160px, 1fr));
          gap: 12px;
        }
        .admin-filter-field {
          display: grid;
          gap: 8px;
        }
        .admin-filter-field span {
          color: #475569;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .admin-filter-panel__actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 14px;
        }
        .trip-admin-section:first-of-type {
          padding-top: 0;
          border-top: 0;
        }
        .trip-admin-section h2,
        .trip-admin-section h3,
        .trip-admin-section h4 {
          margin: 0;
        }
        .trip-admin-section__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .trip-admin-days,
        .trip-admin-faqs {
          display: grid;
          gap: 12px;
        }
        .trip-admin-day,
        .trip-admin-faq,
        .trip-admin-activity {
          display: grid;
          gap: 10px;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(248, 250, 252, 0.7);
        }
        .trip-admin-day__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .trip-admin-subsection {
          display: grid;
          gap: 10px;
        }
        .trip-admin-activity__row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: start;
        }
        .trip-admin-flags {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
        }
        @media (max-width: 720px) {
          .trip-admin-overview {
            align-items: stretch;
          }
          .trip-admin-toggle {
            align-items: flex-start;
          }
          .trip-admin-form-actions,
          .trip-admin-table-actions {
            justify-content: stretch;
          }
          .trip-admin-form-actions .admin-btn,
          .trip-admin-table-actions .admin-btn {
            flex: 1 1 140px;
          }
          .admin-filter-panel {
            padding: 16px;
          }
          .admin-table-filters {
            grid-template-columns: 1fr;
          }
          .admin-filter-panel__actions {
            justify-content: stretch;
          }
          .trip-admin-activity__row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getTripDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diff = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
}

function isDateRangeMatch(startDate, endDate, filterStart, filterEnd) {
  if (!filterStart && !filterEnd) return true;
  const start = new Date(startDate);
  const end = new Date(endDate || startDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

  if (filterStart) {
    const selectedStart = new Date(filterStart);
    selectedStart.setHours(0, 0, 0, 0);
    if (end < selectedStart) return false;
  }

  if (filterEnd) {
    const selectedEnd = new Date(filterEnd);
    selectedEnd.setHours(23, 59, 59, 999);
    if (start > selectedEnd) return false;
  }

  return true;
}
