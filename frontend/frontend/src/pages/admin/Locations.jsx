import React, { useEffect, useState } from "react";
import api from "../../utils/api";

const emptyForm = {
  name: "",
  province: "",
  district: "",
  description: "",
  category: "",
  averageCost: "",
  image: "",
  latitude: "",
  longitude: "",
};

export default function AdminLocations() {
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/admin/locations");
      setLocations(data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load locations");
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
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      const payload = {
        ...form,
        averageCost: Number(form.averageCost),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      };

      if (editingId) {
        const { data } = await api.put(`/api/admin/locations/${editingId}`, payload);
        setLocations((prev) => prev.map((item) => (item._id === editingId ? data : item)));
      } else {
        const { data } = await api.post("/api/admin/locations", payload);
        setLocations((prev) => [data, ...prev]);
      }

      setForm(emptyForm);
      setEditingId("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save location");
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
      description: location.description || "",
      category: location.category || "",
      averageCost: location.averageCost || 0,
      image: location.image || "",
      latitude: location.latitude || 0,
      longitude: location.longitude || 0,
    });
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/api/admin/locations/${id}`);
      setLocations((prev) => prev.filter((item) => item._id !== id));
      if (editingId === id) {
        setEditingId("");
        setForm(emptyForm);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete location");
    }
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
          <input className="admin-input" name="category" placeholder="Category" value={form.category} onChange={onChange} required />
          <input className="admin-input" name="averageCost" type="number" min="0" placeholder="Average Cost" value={form.averageCost} onChange={onChange} required />
          <input className="admin-input" name="latitude" type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={onChange} required />
          <input className="admin-input" name="longitude" type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={onChange} required />
        </div>
        <textarea className="admin-textarea" name="description" placeholder="Description" value={form.description} onChange={onChange} rows={3} required />
        <div>
          <label className="admin-page__subtitle">Upload Image</label>
          <input className="admin-file" type="file" accept="image/*" onChange={onImageChange} />
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
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Province</th>
                <th>District</th>
                <th>Category</th>
                <th>Avg. Cost</th>
                <th>Coordinates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr key={location._id}>
                  <td>{location.name}</td>
                  <td>{location.province || "-"}</td>
                  <td>{location.district || "-"}</td>
                  <td>{location.category}</td>
                  <td>${location.averageCost}</td>
                  <td>{location.latitude}, {location.longitude}</td>
                  <td>
                    <div className="admin-actions">
                    <button type="button" onClick={() => onEdit(location)} className="admin-btn admin-btn--primary">
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(location._id)} className="admin-btn admin-btn--danger">
                      Delete
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
