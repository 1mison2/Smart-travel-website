import React, { useEffect, useMemo, useState } from "react";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import { useAdminUi } from "../../components/admin/adminUiContextValue";
import useUnsavedChangesPrompt from "../../hooks/useUnsavedChangesPrompt";
import api, { resolveImageUrl } from "../../utils/api";

const emptyForm = {
  type: "hotel",
  title: "",
  description: "",
  city: "",
  district: "",
  province: "",
  address: "",
  pricePerUnit: "",
  capacity: "",
  amenities: "",
  photos: "",
  rating: "",
  reviews: "",
};

export default function AdminListings() {
  const [listings, setListings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [listingTotal, setListingTotal] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    type: "all",
    city: "all",
    startDate: "",
    endDate: "",
  });
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
  const { showToast } = useAdminUi();

  const locationLookup = useMemo(() => {
    const byId = new Map();
    const byName = new Map();

    (Array.isArray(locations) ? locations : []).forEach((location) => {
      if (location?._id) {
        byId.set(String(location._id), location);
      }

      const normalizedName = normalizeText(location?.name);
      if (normalizedName && !byName.has(normalizedName)) {
        byName.set(normalizedName, location);
      }
    });

    return { byId, byName };
  }, [locations]);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const matchesSearch = listingMatchesSearch(listing, appliedFilters.search, locationLookup);
      const matchesType = appliedFilters.type === "all" || listing.type === appliedFilters.type;
      const matchesCity =
        appliedFilters.city === "all" || listingMatchesDestinationHub(listing, appliedFilters.city, locationLookup);
      const matchesDate = isWithinDateRange(listing.createdAt, appliedFilters.startDate, appliedFilters.endDate);
      return matchesSearch && matchesType && matchesCity && matchesDate;
    });
  }, [listings, appliedFilters, locationLookup]);
  const cityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          listings
            .map((listing) => getListingDestinationHubName(listing, locationLookup))
            .filter(Boolean)
        )
      ).sort(),
    [listings, locationLookup]
  );

  const photoUrls = useMemo(() => {
    const items = String(form.photos || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => resolveImageUrl(item))
      .filter(Boolean);
    return Array.from(new Set(items));
  }, [form.photos]);

  const setPhotosCsv = (urls) => {
    const unique = Array.from(new Set((Array.isArray(urls) ? urls : []).map((u) => String(u || "").trim()).filter(Boolean)));
    setForm((prev) => ({ ...prev, photos: unique.join(", ") }));
  };

  const removePhoto = (url) => {
    setPhotosCsv(photoUrls.filter((item) => item !== url));
  };

  const makeCover = (url) => {
    const next = [url, ...photoUrls.filter((item) => item !== url)];
    setPhotosCsv(next);
  };

  const loadListings = async () => {
    try {
      setLoading(true);
      const [{ data: listingData }, { data: locationData }] = await Promise.all([
        api.get("/api/admin/listings?includeInactive=true&limit=5000"),
        api.get("/api/locations"),
      ]);
      setListings(Array.isArray(listingData?.listings) ? listingData.listings : []);
      setListingTotal(Number(listingData?.total || 0));
      setLocations(Array.isArray(locationData) ? locationData : []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const isDirty =
    Boolean(editingId) ||
    Boolean(form.title || form.description || form.city || form.district || form.province || form.address || form.photos || form.amenities || form.reviews) ||
    Boolean(form.pricePerUnit || form.capacity || form.rating || photoFiles.length);

  useUnsavedChangesPrompt(isDirty);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toPayload = () => {
    const amenities = form.amenities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const photos = Array.from(
      new Set(
        form.photos
          .split(",")
          .map((item) => resolveImageUrl(item.trim()))
          .filter(Boolean)
      )
    );
    const reviews = form.reviews
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [author, ratingText, ...commentParts] = line.split("|").map((part) => part.trim());
        return {
          author,
          rating: Number(ratingText),
          comment: commentParts.join("|"),
        };
      })
      .filter((item) => item.author && item.comment && item.rating >= 1 && item.rating <= 5);

    return {
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim(),
      location: {
        name: form.city.trim(),
        district: form.district.trim(),
        province: form.province.trim(),
        address: form.address.trim(),
      },
      pricePerUnit: Number(form.pricePerUnit),
      capacity: Number(form.capacity || 1),
      amenities,
      photos,
      rating: Number(form.rating || 0),
      reviews,
      isActive: true,
    };
  };

  const toFormData = (payload) => {
    const fd = new FormData();
    fd.append("type", payload.type);
    fd.append("title", payload.title);
    fd.append("description", payload.description);
    fd.append("location", JSON.stringify(payload.location));
    fd.append("pricePerUnit", String(payload.pricePerUnit));
    fd.append("capacity", String(payload.capacity));
    fd.append("amenities", payload.amenities.join(","));
    fd.append("photos", payload.photos.join(","));
    fd.append("rating", String(payload.rating));
    fd.append("reviews", JSON.stringify(payload.reviews));
    fd.append("isActive", String(payload.isActive));
    photoFiles.forEach((file) => fd.append("photos", file));
    return fd;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      const payload = toPayload();
      if (!payload.title || !payload.location.name || Number.isNaN(payload.pricePerUnit)) {
        setError("Type, title, city and price are required.");
        return;
      }
      if (payload.pricePerUnit < 0) {
        setError("Price cannot be negative.");
        return;
      }
      if (payload.capacity < 1) {
        setError("Capacity must be at least 1.");
        return;
      }
      if (payload.rating < 0 || payload.rating > 5) {
        setError("Rating must be between 0 and 5.");
        return;
      }
      const formData = toFormData(payload);
      if (editingId) {
        const { data } = await api.put(`/api/admin/listings/${editingId}`, formData);
        setListings((prev) => prev.map((item) => (item._id === editingId ? data.listing : item)));
        showToast({ title: "Listing updated", message: `${payload.title} was updated successfully.` });
      } else {
        const { data } = await api.post("/api/admin/listings", formData);
        setListings((prev) => [data.listing, ...prev]);
        showToast({ title: "Listing created", message: `${payload.title} is ready for bookings.` });
      }

      setForm(emptyForm);
      setPhotoFiles([]);
      setEditingId("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save listing");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (listing) => {
    setEditingId(listing._id);
    setPhotoFiles([]);
    setForm({
      type: listing.type || "hotel",
      title: listing.title || "",
      description: listing.description || "",
      city: listing.location?.name || "",
      district: listing.location?.district || "",
      province: listing.location?.province || "",
      address: listing.location?.address || "",
      pricePerUnit: listing.pricePerUnit ?? "",
      capacity: listing.capacity ?? 1,
      amenities: Array.isArray(listing.amenities) ? listing.amenities.join(", ") : "",
      photos: Array.isArray(listing.photos) ? listing.photos.join(", ") : "",
      rating: listing.rating ?? 0,
      reviews: Array.isArray(listing.reviews)
        ? listing.reviews.map((r) => `${r.author} | ${r.rating} | ${r.comment}`).join("\n")
        : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (id, title) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title || "this listing"}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/api/admin/listings/${id}`);
      setListings((prev) => prev.filter((item) => item._id !== id));
      if (editingId === id) {
        setEditingId("");
        setForm(emptyForm);
      }
      showToast({ title: "Listing deleted", message: `${title || "The listing"} was removed.` });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete listing");
    }
  };

  const resetBrowseFilters = () => {
    setSearchFilter("");
    setCityFilter("all");
    setTypeFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setAppliedFilters({
      search: "",
      type: "all",
      city: "all",
      startDate: "",
      endDate: "",
    });
    setHasAppliedFilters(false);
  };

  const applyFilters = () => {
    setAppliedFilters({
      search: searchFilter,
      type: typeFilter,
      city: cityFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
    });
    setHasAppliedFilters(true);
  };

  return (
    <section className="admin-page">
      <h1 className="admin-page__title">Hotels, Activities, Cafes & Restaurants</h1>
      <p className="admin-page__subtitle">
        Add bookable inventory for Pokhara/Kathmandu/Chitwan so users can book and pay.
      </p>
      {error && <p className="admin-alert admin-alert--error">{error}</p>}

      <form onSubmit={onSubmit} className="admin-card admin-card--padded admin-form">
        <div className="admin-form__grid">
          <select className="admin-input" name="type" value={form.type} onChange={onChange} required>
            <option value="hotel">Hotel</option>
            <option value="activity">Activity</option>
            <option value="cafe">Cafe</option>
            <option value="restaurant">Restaurant</option>
          </select>
          <input className="admin-input" name="title" value={form.title} onChange={onChange} placeholder="Title" required />
          <input className="admin-input" name="city" value={form.city} onChange={onChange} placeholder="City (e.g. Pokhara)" required />
          <input className="admin-input" name="district" value={form.district} onChange={onChange} placeholder="District" />
          <input className="admin-input" name="province" value={form.province} onChange={onChange} placeholder="Province" />
          <input className="admin-input" name="address" value={form.address} onChange={onChange} placeholder="Address" />
          <input className="admin-input" name="pricePerUnit" type="number" min="0" value={form.pricePerUnit} onChange={onChange} placeholder="Price per booking (night/session/table)" required />
          <input className="admin-input" name="capacity" type="number" min="1" value={form.capacity} onChange={onChange} placeholder="Capacity" />
          <input className="admin-input" name="rating" type="number" min="0" max="5" step="0.1" value={form.rating} onChange={onChange} placeholder="Rating (0-5)" />
          <input className="admin-input" name="amenities" value={form.amenities} onChange={onChange} placeholder="Amenities (comma separated)" />
        </div>
        <textarea className="admin-textarea" name="description" value={form.description} onChange={onChange} placeholder="Description" rows={3} />
        <input className="admin-input" name="photos" value={form.photos} onChange={onChange} placeholder="Photo URLs (comma separated)" />
        <input
          className="admin-input"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
        />
        {!!photoUrls.length && (
          <div className="admin-photo-block">
            <div className="admin-photo-head">
              <p className="admin-page__subtitle">Click a photo to set it as cover. Use Remove to delete it from this listing.</p>
              <p className="admin-page__subtitle">{photoUrls.length} photo(s)</p>
            </div>
            <div className="admin-photo-grid" role="list">
              {photoUrls.map((url, idx) => (
                <div key={`${url}-${idx}`} className="admin-photo-item" role="listitem">
                  <button
                    type="button"
                    className={`admin-photo-thumb ${idx === 0 ? "is-cover" : ""}`}
                    onClick={() => makeCover(url)}
                    title="Set as cover"
                  >
                    <img src={url} alt={`listing-photo-${idx + 1}`} loading="lazy" />
                    {idx === 0 && <span className="admin-photo-badge">Cover</span>}
                  </button>
                  <div className="admin-photo-actions">
                    <button type="button" className="admin-btn admin-btn--muted admin-btn--xs" onClick={() => makeCover(url)}>
                      Make cover
                    </button>
                    <button type="button" className="admin-btn admin-btn--danger admin-btn--xs" onClick={() => removePhoto(url)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {photoFiles.length > 0 && (
          <p className="admin-page__subtitle">{photoFiles.length} image file(s) selected for upload.</p>
        )}
        <textarea
          className="admin-textarea"
          name="reviews"
          value={form.reviews}
          onChange={onChange}
          placeholder="Reviews (one per line: Name | Rating(1-5) | Comment)"
          rows={4}
        />
        <div className="admin-form-actions">
          <button type="submit" disabled={saving} className="admin-btn admin-btn--primary">
            {saving ? "Saving..." : editingId ? "Update Listing" : "Add Listing"}
          </button>
          {editingId && (
            <button
              type="button"
              className="admin-btn admin-btn--muted"
              onClick={() => {
                setEditingId("");
                setForm(emptyForm);
                setPhotoFiles([]);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="admin-loading">Loading listings...</p>
      ) : (
        <div className="admin-card admin-table-wrap">
          <div className="admin-filter-panel">
            <div className="admin-filter-panel__head">
              <div>
                <p className="admin-filter-panel__eyebrow">Browse listings</p>
                <h3>Filter the inventory table</h3>
              </div>
              <div className="admin-filter-panel__meta">
                <span>{hasAppliedFilters ? `${filteredListings.length} shown` : "0 shown"}</span>
                <span>{listingTotal || listings.length} total</span>
              </div>
            </div>

            <div className="admin-table-filters">
              <label className="admin-filter-field">
                <span>Search</span>
                <input
                  className="admin-input"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Title, place, address, amenity"
                />
              </label>

              <label className="admin-filter-field">
                <span>Destination hub</span>
                <select className="admin-input" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                  <option value="all">All destination hubs</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-filter-field">
                <span>Listing type</span>
                <select className="admin-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="all">All types</option>
                  <option value="hotel">Hotel</option>
                  <option value="activity">Activity</option>
                  <option value="cafe">Cafe</option>
                  <option value="restaurant">Restaurant</option>
                </select>
              </label>

              <label className="admin-filter-field">
                <span>Created from</span>
                <input className="admin-input" type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} />
              </label>

              <label className="admin-filter-field">
                <span>Created to</span>
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
                disabled={!searchFilter && cityFilter === "all" && typeFilter === "all" && !startDateFilter && !endDateFilter}
              >
                Reset filters
              </button>
            </div>
          </div>

          {!hasAppliedFilters ? (
            <AdminEmptyState
              title="Listing inventory is ready to browse"
              copy="Apply filters to narrow the hotel, cafe, activity, or restaurant list before editing records."
            />
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>City</th>
                  <th>Price</th>
                  <th>Capacity</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.map((listing) => (
                  <tr key={listing._id}>
                    <td>{listing.type}</td>
                    <td>{listing.title}</td>
                    <td>{listing.location?.name || "-"}</td>
                    <td>NPR {listing.pricePerUnit}</td>
                    <td>{listing.capacity || 1}</td>
                    <td>{listing.rating || 0}</td>
                    <td>
                      <div className="admin-actions">
                        <button type="button" onClick={() => onEdit(listing)} className="admin-btn admin-btn--primary">
                          Edit
                        </button>
                        <button type="button" onClick={() => onDelete(listing._id, listing.title)} className="admin-btn admin-btn--danger">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredListings.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      <AdminEmptyState
                        title="No listings matched"
                        copy="Try widening the destination hub or type filters, or create a new listing above."
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
          grid-template-columns: repeat(5, minmax(180px, 1fr));
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
        @media (max-width: 720px) {
          .admin-filter-panel {
            padding: 16px;
          }
          .admin-table-filters {
            grid-template-columns: 1fr;
          }
          .admin-filter-panel__actions {
            justify-content: stretch;
          }
        }
      `}</style>
    </section>
  );
}

function isWithinDateRange(value, filterStart, filterEnd) {
  if (!filterStart && !filterEnd) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (filterStart) {
    const start = new Date(filterStart);
    start.setHours(0, 0, 0, 0);
    if (date < start) return false;
  }

  if (filterEnd) {
    const end = new Date(filterEnd);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }

  return true;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getListingDestinationHubName(listing, locationLookup) {
  const locationName = normalizeText(listing?.location?.name);
  if (!locationName) return "";

  const matchedLocation = locationLookup?.byName?.get(locationName);
  if (!matchedLocation) {
    return String(listing?.location?.name || "").trim();
  }

  let current = matchedLocation;
  const visited = new Set();

  while (current?.parentLocationId) {
    const parentId =
      typeof current.parentLocationId === "object" ? current.parentLocationId?._id : current.parentLocationId;
    const normalizedParentId = String(parentId || "");

    if (!normalizedParentId || visited.has(normalizedParentId)) break;
    visited.add(normalizedParentId);

    const nextLocation =
      typeof current.parentLocationId === "object" && current.parentLocationId?.name
        ? current.parentLocationId
        : locationLookup?.byId?.get(normalizedParentId);

    if (!nextLocation) break;
    current = nextLocation;
  }

  return String(current?.name || matchedLocation?.name || listing?.location?.name || "").trim();
}

function listingMatchesDestinationHub(listing, hubName, locationLookup) {
  const normalizedHubName = normalizeText(hubName);
  if (!normalizedHubName) return true;

  return normalizeText(getListingDestinationHubName(listing, locationLookup)) === normalizedHubName;
}

function listingMatchesSearch(listing, searchText, locationLookup) {
  const normalizedSearch = normalizeText(searchText);
  if (!normalizedSearch) return true;

  const haystack = [
    listing?.title,
    listing?.type,
    listing?.location?.name,
    listing?.location?.address,
    listing?.location?.district,
    listing?.location?.province,
    getListingDestinationHubName(listing, locationLookup),
    ...(Array.isArray(listing?.amenities) ? listing.amenities : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedSearch);
}
