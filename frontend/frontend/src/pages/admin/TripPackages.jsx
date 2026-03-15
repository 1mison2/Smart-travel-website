import React, { useEffect, useState } from "react";
import api from "../../utils/api";

const emptyForm = {
  title: "",
  description: "",
  location: "",
  startDate: "",
  endDate: "",
  basePrice: "",
  currency: "NPR",
  capacity: 1,
  coverImage: "",
  included: "",
  addOnListings: [],
  isActive: true,
};

export default function AdminTripPackages() {
  const [form, setForm] = useState(emptyForm);
  const [packages, setPackages] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");

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

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const onToggleAddOn = (id) => {
    setForm((prev) => {
      const current = prev.addOnListings || [];
      const exists = current.includes(id);
      const next = exists ? current.filter((item) => item !== id) : [...current, id];
      return { ...prev, addOnListings: next };
    });
  };

  const onEdit = (pkg) => {
    setEditingId(pkg._id);
    setForm({
      title: pkg.title || "",
      description: pkg.description || "",
      location: pkg.location || "",
      startDate: pkg.startDate ? pkg.startDate.slice(0, 10) : "",
      endDate: pkg.endDate ? pkg.endDate.slice(0, 10) : "",
      basePrice: pkg.basePrice || "",
      currency: pkg.currency || "NPR",
      capacity: pkg.capacity || 1,
      coverImage: pkg.coverImage || "",
      included: Array.isArray(pkg.included) ? pkg.included.join(", ") : "",
      addOnListings: Array.isArray(pkg.addOnListings)
        ? pkg.addOnListings.map((item) => (item._id ? item._id : item))
        : [],
      isActive: typeof pkg.isActive === "boolean" ? pkg.isActive : true,
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        basePrice: Number(form.basePrice || 0),
        capacity: Number(form.capacity || 1),
      };
      if (editingId) {
        await api.put(`/api/admin/trip-packages/${editingId}`, payload);
      } else {
        await api.post("/api/admin/trip-packages", payload);
      }
      setForm(emptyForm);
      setEditingId("");
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
      <p className="admin-page__subtitle">Create packages with optional add-ons for single checkout.</p>
      {error && <p className="admin-alert admin-alert--error">{error}</p>}

      <form onSubmit={onSubmit} className="admin-card admin-card--padded admin-form">
        <div className="admin-form__grid">
          <input className="admin-input" name="title" placeholder="Package Title" value={form.title} onChange={onChange} required />
          <input className="admin-input" name="location" placeholder="Location (e.g. Pokhara)" value={form.location} onChange={onChange} />
          <input className="admin-input" name="startDate" type="date" value={form.startDate} onChange={onChange} required />
          <input className="admin-input" name="endDate" type="date" value={form.endDate} onChange={onChange} required />
          <input className="admin-input" name="basePrice" type="number" min="0" placeholder="Base Price" value={form.basePrice} onChange={onChange} required />
          <input className="admin-input" name="currency" placeholder="Currency" value={form.currency} onChange={onChange} />
          <input className="admin-input" name="capacity" type="number" min="1" placeholder="Capacity" value={form.capacity} onChange={onChange} />
          <input className="admin-input" name="coverImage" placeholder="Cover Image URL" value={form.coverImage} onChange={onChange} />
        </div>
        <textarea className="admin-textarea" name="description" placeholder="Description" value={form.description} onChange={onChange} rows={3} />
        <textarea className="admin-textarea" name="included" placeholder="Included (comma separated)" value={form.included} onChange={onChange} rows={2} />
        <label className="admin-page__subtitle" style={{ marginTop: "4px" }}>Add-on Listings</label>
        <div className="admin-form__grid">
          {listings.map((listing) => (
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
        <label className="admin-page__subtitle" style={{ marginTop: "6px" }}>
          <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} /> Active
        </label>
        <div className="admin-actions">
          <button type="submit" disabled={saving} className="admin-btn admin-btn--primary">
            {saving ? "Saving..." : editingId ? "Update Package" : "Create Package"}
          </button>
          {editingId && (
            <button type="button" className="admin-btn admin-btn--muted" onClick={() => { setEditingId(""); setForm(emptyForm); }}>
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
                <th>Dates</th>
                <th>Base Price</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg._id}>
                  <td>{pkg.title}</td>
                  <td>{formatDate(pkg.startDate)} - {formatDate(pkg.endDate)}</td>
                  <td>{pkg.currency || "NPR"} {pkg.basePrice}</td>
                  <td>{pkg.capacity || 1}</td>
                  <td>{pkg.isActive ? "Active" : "Inactive"}</td>
                  <td className="admin-actions">
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => onEdit(pkg)}>Edit</button>
                    <button type="button" className="admin-btn admin-btn--danger" onClick={() => onDelete(pkg._id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {packages.length === 0 && (
                <tr>
                  <td colSpan="6">No trip packages yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
