import React, { useEffect, useMemo, useState } from "react";
import api, { resolveImageUrl } from "../../utils/api";

const emptyForm = {
  name: "",
  province: "",
  district: "",
  parentLocationId: "",
  description: "",
  category: "",
  averageCost: "",
  image: null,
  images: [],
  latitude: "",
  longitude: "",
};

const getApiErrorMessage = (err, fallback) => {
  const status = err?.response?.status;
  const dataMessage = err?.response?.data?.message;

  if (dataMessage) return status ? `${dataMessage} (HTTP ${status})` : dataMessage;

  if (status === 413) {
    return "Request payload is too large. Please upload a smaller image.";
  }

  if (status) return `${fallback} (HTTP ${status})`;

  return err?.message || fallback;
};

const getParentId = (location) => {
  if (!location?.parentLocationId) return "";
  if (typeof location.parentLocationId === "string") return location.parentLocationId;
  return location.parentLocationId?._id || "";
};

export default function AdminLocations() {
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentImage, setCurrentImage] = useState("");
  const [currentImages, setCurrentImages] = useState([]);
  const [nameFilter, setNameFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    name: "all",
    category: "all",
    startDate: "",
    endDate: "",
  });
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
  const locationLookup = useMemo(() => {
    const byId = new Map();

    (Array.isArray(locations) ? locations : []).forEach((location) => {
      if (location?._id) {
        byId.set(String(location._id), location);
      }
    });

    return byId;
  }, [locations]);
  const parentCandidates = locations.filter(
    (location) => location._id !== editingId && !getParentId(location)
  );
  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      const matchesName =
        appliedFilters.name === "all" || locationMatchesDestinationHub(location, appliedFilters.name, locationLookup);
      const matchesCategory =
        appliedFilters.category === "all" || String(location.category || "").toLowerCase() === appliedFilters.category.toLowerCase();
      const matchesDate = isWithinDateRange(location.createdAt, appliedFilters.startDate, appliedFilters.endDate);
      return matchesName && matchesCategory && matchesDate;
    });
  }, [locations, appliedFilters, locationLookup]);
  const nameOptions = useMemo(
    () =>
      Array.from(
        new Set(locations.map((location) => getDestinationHubName(location, locationLookup)).filter(Boolean))
      ).sort(),
    [locations, locationLookup]
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(locations.map((location) => String(location.category || "").trim()).filter(Boolean))),
    [locations]
  );

  const loadLocations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/admin/locations");
      setLocations(data);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load locations"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setForm((prev) => ({ ...prev, image: null }));
      return;
    }
    setForm((prev) => ({ ...prev, image: file }));
  };

  const onImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    setForm((prev) => ({ ...prev, images: files }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("province", form.province);
      payload.append("district", form.district);
      payload.append("parentLocationId", form.parentLocationId);
      payload.append("description", form.description);
      payload.append("category", form.category);
      payload.append("averageCost", form.averageCost);
      payload.append("latitude", form.latitude);
      payload.append("longitude", form.longitude);
      if (form.image) payload.append("image", form.image);
      form.images.forEach((file) => payload.append("images", file));

      if (editingId) {
        const { data } = await api.put(`/api/admin/locations/${editingId}`, payload);
        setLocations((prev) => prev.map((item) => (item._id === editingId ? data : item)));
      } else {
        const { data } = await api.post("/api/admin/locations", payload);
        setLocations((prev) => [data, ...prev]);
      }

      setForm(emptyForm);
      setEditingId("");
      setCurrentImage("");
      setCurrentImages([]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save location"));
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (location) => {
    setEditingId(location._id);
    setForm({
      name: location.name || "",
      province: location.province || "",
      district: location.district || "",
      parentLocationId:
        typeof location.parentLocationId === "string"
          ? location.parentLocationId
          : location.parentLocationId?._id || "",
      description: location.description || "",
      category: location.category || "",
      averageCost: location.averageCost || 0,
      image: null,
      images: [],
      latitude: location.latitude || 0,
      longitude: location.longitude || 0,
    });
    setCurrentImage(location.image || "");
    setCurrentImages(Array.isArray(location.images) ? location.images : []);
  };

  const onDelete = async (id, name) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name || "this location"}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/api/admin/locations/${id}`);
      setLocations((prev) => prev.filter((item) => item._id !== id));
      if (editingId === id) {
        setEditingId("");
        setForm(emptyForm);
        setCurrentImage("");
        setCurrentImages([]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete location"));
    }
  };

  const applyFilters = () => {
    setAppliedFilters({
      name: nameFilter,
      category: categoryFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
    });
    setHasAppliedFilters(true);
  };

  const resetBrowseFilters = () => {
    setNameFilter("all");
    setCategoryFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setAppliedFilters({
      name: "all",
      category: "all",
      startDate: "",
      endDate: "",
    });
    setHasAppliedFilters(false);
  };

  return (
    <section className="admin-page">
      <h1 className="admin-page__title">Location Management</h1>
      <p className="admin-page__subtitle">Create and maintain travel destinations with map coordinates and media.</p>
      {error && <p className="admin-alert admin-alert--error">{error}</p>}

      <form onSubmit={onSubmit} className="admin-card admin-card--padded admin-form">
        <div className="admin-form__grid">
          <input className="admin-input" name="name" placeholder="Location Name" value={form.name} onChange={onChange} required />
          <input className="admin-input" name="province" placeholder="Province (e.g. Bagmati)" value={form.province} onChange={onChange} required />
          <input className="admin-input" name="district" placeholder="District (e.g. Lalitpur)" value={form.district} onChange={onChange} required />
          <select className="admin-input" name="parentLocationId" value={form.parentLocationId} onChange={onChange}>
            <option value="">Top-level destination / hub</option>
            {parentCandidates.map((location) => (
              <option key={location._id} value={location._id}>
                {location.name}
              </option>
            ))}
          </select>
          <input className="admin-input" name="category" placeholder="Category" value={form.category} onChange={onChange} required />
          <input className="admin-input" name="averageCost" type="number" min="0" placeholder="Average Cost" value={form.averageCost} onChange={onChange} required />
          <input className="admin-input" name="latitude" type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={onChange} required />
          <input className="admin-input" name="longitude" type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={onChange} required />
        </div>
        <p className="admin-page__subtitle">
          Leave parent empty for a main city or destination. Choose a parent only for a place inside that destination.
        </p>
        <textarea className="admin-textarea" name="description" placeholder="Description" value={form.description} onChange={onChange} rows={3} required />
        <div>
          <label className="admin-page__subtitle">Cover Image</label>
          <input className="admin-file" type="file" accept="image/*" onChange={onImageChange} />
          {currentImage && !form.image && (
            <p className="admin-page__subtitle">
              Current image kept unless you choose a new one.
            </p>
          )}
          <label className="admin-page__subtitle" style={{ marginTop: "8px" }}>Gallery Images (multiple)</label>
          <input className="admin-file" type="file" accept="image/*" multiple onChange={onImagesChange} />
          {form.images.length > 0 && (
            <p className="admin-page__subtitle">{form.images.length} gallery image(s) selected.</p>
          )}
          {currentImages.length > 0 && (
            <p className="admin-page__subtitle">Existing gallery images: {currentImages.length}</p>
          )}
        </div>
        <div className="admin-actions">
          <button type="submit" disabled={saving} className="admin-btn admin-btn--primary">
            {saving ? "Saving..." : editingId ? "Update Location" : "Add Location"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId("");
                setForm(emptyForm);
                setCurrentImage("");
                setCurrentImages([]);
              }}
              className="admin-btn admin-btn--muted"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="admin-loading">Loading locations...</p>
      ) : (
        <div className="admin-card admin-table-wrap">
          <div className="admin-filter-panel">
            <div className="admin-filter-panel__head">
              <div>
                <p className="admin-filter-panel__eyebrow">Browse locations</p>
                <h3>Filter the destination list</h3>
              </div>
              <div className="admin-filter-panel__meta">
                <span>{hasAppliedFilters ? `${filteredLocations.length} shown` : "0 shown"}</span>
                <span>{locations.length} total</span>
              </div>
            </div>

            <div className="admin-table-filters">
              <label className="admin-filter-field">
                <span>Destination hub</span>
                <select className="admin-input" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)}>
                  <option value="all">All destination hubs</option>
                  {nameOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-filter-field">
                <span>Category</span>
                <select className="admin-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
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
                disabled={
                  nameFilter === "all" &&
                  categoryFilter === "all" &&
                  !startDateFilter &&
                  !endDateFilter
                }
              >
                Reset filters
              </button>
            </div>
          </div>

          {!hasAppliedFilters ? (
            <div className="admin-table__muted" style={{ padding: "18px 6px" }}>
              Apply filters to view posted location details.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Province</th>
                  <th>District</th>
                  <th>Parent</th>
                  <th>Category</th>
                  <th>Avg. Cost</th>
                  <th>Coordinates</th>
                  <th>Image</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((location) => (
                  <tr key={location._id}>
                    <td>{location.name}</td>
                    <td>{location.province || "-"}</td>
                    <td>{location.district || "-"}</td>
                    <td>{location.parentLocationId?.name || "-"}</td>
                    <td>{location.category}</td>
                    <td>NPR {location.averageCost}</td>
                    <td>{location.latitude}, {location.longitude}</td>
                    <td>
                      {(location.image || location.images?.[0]) ? (
                        <img
                          src={resolveImageUrl(location.image || location.images?.[0])}
                          alt={location.name}
                          style={{ width: "56px", height: "42px", objectFit: "cover", borderRadius: "6px" }}
                        />
                      ) : "-"}
                    </td>
                    <td>
                      <div className="admin-actions">
                      <button type="button" onClick={() => onEdit(location)} className="admin-btn admin-btn--primary">
                        Edit
                      </button>
                      <button type="button" onClick={() => onDelete(location._id, location.name)} className="admin-btn admin-btn--danger">
                        Delete
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLocations.length === 0 && (
                  <tr>
                    <td colSpan="9">No locations match the applied filters.</td>
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
          grid-template-columns: repeat(4, minmax(180px, 1fr));
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

function getDestinationHubName(location, locationLookup) {
  let current = location;
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
        : locationLookup.get(normalizedParentId);

    if (!nextLocation) break;
    current = nextLocation;
  }

  return String(current?.name || location?.name || "").trim();
}

function locationMatchesDestinationHub(location, hubName, locationLookup) {
  const normalizedHubName = normalizeText(hubName);
  if (!normalizedHubName) return true;

  return normalizeText(getDestinationHubName(location, locationLookup)) === normalizedHubName;
}
