import React, { useEffect, useState } from "react";
import api from "../../utils/api";

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
  const [form, setForm] = useState(emptyForm);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadListings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/admin/listings?includeInactive=true");
      setListings(Array.isArray(data?.listings) ? data.listings : []);
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

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toPayload = () => {
    const amenities = form.amenities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const photos = form.photos
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
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
      const formData = toFormData(payload);
      if (editingId) {
        const { data } = await api.put(`/api/admin/listings/${editingId}`, formData);
        setListings((prev) => prev.map((item) => (item._id === editingId ? data.listing : item)));
      } else {
        const { data } = await api.post("/api/admin/listings", formData);
        setListings((prev) => [data.listing, ...prev]);
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
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/api/admin/listings/${id}`);
      setListings((prev) => prev.filter((item) => item._id !== id));
      if (editingId === id) {
        setEditingId("");
        setForm(emptyForm);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete listing");
    }
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
        <div className="admin-actions">
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
              {listings.map((listing) => (
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
                      <button type="button" onClick={() => onDelete(listing._id)} className="admin-btn admin-btn--danger">
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
