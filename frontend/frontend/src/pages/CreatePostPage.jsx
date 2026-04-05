import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, NotebookPen, PenSquare } from "lucide-react";
import TravelSocialShell from "../components/TravelSocialShell";
import api from "../utils/api";

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", content: "", destination: "", tags: "" });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("content", form.content);
      payload.append("destination", form.destination);
      payload.append("tags", form.tags);
      Array.from(files).forEach((file) => payload.append("images", file));
      await api.post("/api/posts/create", payload);
      navigate("/community");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create post");
    }
  };

  return (
    <TravelSocialShell
      theme="community"
      badge="Create Post"
      icon={NotebookPen}
      title="Publish a travel story people will actually stop to read."
      stats={[
        { label: "Story type", value: "Blog" },
        { label: "Images", value: files.length },
        { label: "Status", value: "Draft" },
      ]}
      actions={[
        { label: "Community feed", to: "/community", variant: "ghost" },
        { label: "Saved posts", to: "/community/saved" },
      ]}
    >
      <div className="grid gap-6">
        <section className="rounded-[34px] border border-white/70 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
              <PenSquare size={20} />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Story editor</h2>
              <p className="text-sm text-slate-500">Write a blog, review, or travel reflection.</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            <input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" placeholder="Tags: food, trekking, budget" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            <textarea className="min-h-60 rounded-[26px] border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" placeholder="Write your blog, review, or story..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            <label className="flex cursor-pointer items-center gap-3 rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-white">
              <ImagePlus size={18} />
              <span>Add post images</span>
              <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files || [])} className="hidden" />
            </label>
            <button className="rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-5 py-3.5 font-semibold text-white shadow-lg shadow-emerald-100">Publish post</button>
          </form>
          {error && <p className="mt-4 text-sm font-medium text-rose-700">{error}</p>}
        </section>
      </div>
    </TravelSocialShell>
  );
}
