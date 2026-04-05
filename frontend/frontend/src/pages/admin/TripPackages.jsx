import React, { useEffect, useMemo, useState } from "react";
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

export default function AdminTripPackages() {
  const [form, setForm] = useState(emptyForm);
  const [packages, setPackages] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");

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

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

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
  };

  const onEdit = (pkg) => {
    setEditingId(pkg._id);
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
      if (editingId) {
        await api.put(`/api/admin/trip-packages/${editingId}`, payload);
      } else {
        await api.post("/api/admin/trip-packages", payload);
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
        <div className="trip-admin-section">
          <h2>Core details</h2>
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
            <input className="admin-input" name="videoUrl" placeholder="Video URL" value={form.videoUrl} onChange={onChange} />
          </div>
          <textarea className="admin-textarea" name="shortDescription" placeholder="Short description" value={form.shortDescription} onChange={onChange} rows={2} />
          <textarea className="admin-textarea" name="description" placeholder="Full description" value={form.description} onChange={onChange} rows={4} />
        </div>

        <div className="trip-admin-section">
          <h2>Pricing and media</h2>
          <div className="admin-form__grid">
            <input className="admin-input" name="basePrice" type="number" min="0" placeholder="Base Price" value={form.basePrice} onChange={onChange} required />
            <input className="admin-input" name="discountPrice" type="number" min="0" placeholder="Discount Price" value={form.discountPrice} onChange={onChange} />
            <input className="admin-input" name="currency" placeholder="Currency" value={form.currency} onChange={onChange} />
            <input className="admin-input" name="capacity" type="number" min="1" placeholder="Capacity" value={form.capacity} onChange={onChange} />
            <input className="admin-input" name="minGuests" type="number" min="1" placeholder="Minimum guests" value={form.minGuests} onChange={onChange} />
            <input className="admin-input" name="maxGuests" type="number" min="1" placeholder="Maximum guests" value={form.maxGuests} onChange={onChange} />
            <input className="admin-input" name="coverImage" placeholder="Cover Image URL" value={form.coverImage} onChange={onChange} />
            <input className="admin-input" name="galleryImages" placeholder="Gallery image URLs (comma separated)" value={form.galleryImages} onChange={onChange} />
          </div>
        </div>

        <div className="trip-admin-section">
          <h2>Package content</h2>
          <textarea className="admin-textarea" name="highlights" placeholder="Highlights (comma separated)" value={form.highlights} onChange={onChange} rows={2} />
          <textarea className="admin-textarea" name="included" placeholder="Included items (comma separated)" value={form.included} onChange={onChange} rows={3} />
          <textarea className="admin-textarea" name="excluded" placeholder="Excluded items (comma separated)" value={form.excluded} onChange={onChange} rows={3} />
        </div>

        <div className="trip-admin-section">
          <div className="trip-admin-section__head">
            <h2>Day-wise itinerary</h2>
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
                  <input className="admin-input" placeholder="Day image URL" value={day.image} onChange={(e) => updateDay(dayIndex, "image", e.target.value)} />
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

        <div className="trip-admin-section">
          <h2>Policies and FAQs</h2>
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

        <div className="trip-admin-section">
          <h2>Checkout add-ons</h2>
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

        <div className="admin-actions">
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
              {packages.map((pkg) => (
                <tr key={pkg._id}>
                  <td>{pkg.title}</td>
                  <td>{pkg.location || "-"}</td>
                  <td>{formatDate(pkg.startDate)} - {formatDate(pkg.endDate)}</td>
                  <td>{pkg.currency || "NPR"} {pkg.discountPrice || pkg.basePrice}</td>
                  <td>{Array.isArray(pkg.itineraryDays) && pkg.itineraryDays.length ? pkg.itineraryDays.length : getTripDays(pkg.startDate, pkg.endDate)}</td>
                  <td>{pkg.isActive ? (pkg.isFeatured ? "Featured" : "Active") : "Inactive"}</td>
                  <td className="admin-actions">
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => onEdit(pkg)}>Edit</button>
                    <button type="button" className="admin-btn admin-btn--danger" onClick={() => onDelete(pkg._id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {packages.length === 0 && (
                <tr>
                  <td colSpan="7">No trip packages yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .trip-admin-section {
          display: grid;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
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
