import React, { useEffect, useState } from "react";
import { Bookmark, Heart, MessageCircle, Send, Share2 } from "lucide-react";
import api from "../../utils/api";
import SectionSkeleton from "./SectionSkeleton";

const emptyBlogForm = {
  title: "",
  destination: "",
  tags: "",
  content: "",
};

export default function BlogFeedSection({ onNotify }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openComments, setOpenComments] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [form, setForm] = useState(emptyBlogForm);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/posts", { params: { type: "blog" } });
      setBlogs(data?.posts || []);
    } catch (_err) {
      onNotify?.({ type: "error", message: "Failed to load travel blogs." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const createBlog = async (event) => {
    event.preventDefault();
    try {
      setCreating(true);
      await api.post("/api/posts/create", { ...form, type: "blog" });
      setForm(emptyBlogForm);
      onNotify?.({ type: "success", message: "Travel blog published." });
      await loadBlogs();
    } catch (err) {
      onNotify?.({ type: "error", message: err?.response?.data?.message || "Failed to publish blog." });
    } finally {
      setCreating(false);
    }
  };

  const loadComments = async (postId) => {
    try {
      const { data } = await api.get(`/api/comments/${postId}`);
      setCommentsByPost((current) => ({ ...current, [postId]: data?.comments || [] }));
    } catch (_err) {
      onNotify?.({ type: "error", message: "Failed to load comments." });
    }
  };

  const toggleComments = async (postId) => {
    const nextOpen = !openComments[postId];
    setOpenComments((current) => ({ ...current, [postId]: nextOpen }));
    if (nextOpen && !commentsByPost[postId]) await loadComments(postId);
  };

  const submitComment = async (postId) => {
    try {
      await api.post("/api/comments/create", { postId, comment: commentDrafts[postId] || "" });
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      await Promise.all([loadComments(postId), loadBlogs()]);
      onNotify?.({ type: "success", message: "Comment added." });
    } catch (err) {
      onNotify?.({ type: "error", message: err?.response?.data?.message || "Failed to add comment." });
    }
  };

  const likeBlog = async (postId) => {
    try {
      await api.post("/api/posts/like", { postId });
      await loadBlogs();
    } catch (_err) {
      onNotify?.({ type: "error", message: "Failed to update like." });
    }
  };

  const saveBlog = async (postId) => {
    try {
      await api.post("/api/posts/save", { postId });
      await loadBlogs();
      onNotify?.({ type: "success", message: "Blog saved." });
    } catch (_err) {
      onNotify?.({ type: "error", message: "Failed to save blog." });
    }
  };

  const shareBlog = async (postId) => {
    const link = `${window.location.origin}/community/posts/${postId}`;
    try {
      await navigator.clipboard.writeText(link);
      onNotify?.({ type: "success", message: "Blog link copied." });
    } catch (_err) {
      onNotify?.({ type: "info", message: link });
    }
  };

  if (loading) return <SectionSkeleton cards={2} />;

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#14532d,#0f766e_45%,#0ea5e9)] px-6 py-6 text-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-emerald-100">Travel Blogs</p>
          <h3 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">Turn useful travel experience into readable stories</h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-emerald-50/90">
            Publish blogs with destination context, practical detail, and visual personality so other travelers actually learn from them.
          </p>
        </div>

        <form onSubmit={createBlog} className="grid gap-4 p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <input value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder="Blog title" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none lg:col-span-2" />
            <input value={form.destination} onChange={(e) => setForm((c) => ({ ...c, destination: e.target.value }))} placeholder="Destination" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none" />
          </div>
          <input value={form.tags} onChange={(e) => setForm((c) => ({ ...c, tags: e.target.value }))} placeholder="Tags separated by comma" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none" />
          <textarea value={form.content} onChange={(e) => setForm((c) => ({ ...c, content: e.target.value }))} rows={5} placeholder="Write your travel story..." className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Tip: include one practical takeaway, one memorable moment, and one honest note.</p>
            <button type="submit" disabled={creating} className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
              {creating ? "Publishing..." : "Publish Blog"}
            </button>
          </div>
        </form>
      </section>

      <div className="grid gap-5">
        {blogs.map((blog) => (
          <article key={blog._id} className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500">{blog.destination || "Travel blog"}</p>
                  <h4 className="mt-2 text-2xl font-bold text-slate-900">{blog.title || "Untitled story"}</h4>
                  <p className="mt-2 text-sm text-slate-500">By {blog.userId?.name || "Traveler"} • {new Date(blog.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(blog.tags || []).slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">#{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5">
              <p className="text-sm leading-7 text-slate-600">{blog.content}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => likeBlog(blog._id)} className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">
                  <Heart size={16} />
                  {blog.likesCount || 0}
                </button>
                <button type="button" onClick={() => toggleComments(blog._id)} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  <MessageCircle size={16} />
                  {blog.commentsCount || 0} comments
                </button>
                <button type="button" onClick={() => saveBlog(blog._id)} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                  <Bookmark size={16} />
                  {blog.isSaved ? "Saved" : "Save"}
                </button>
                <button type="button" onClick={() => shareBlog(blog._id)} className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                  <Share2 size={16} />
                  Share
                </button>
              </div>

              {openComments[blog._id] ? (
                <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3">
                    {(commentsByPost[blog._id] || []).map((comment) => (
                      <div key={comment._id} className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">{comment.userId?.name || "Traveler"}</p>
                        <p className="mt-1 text-sm text-slate-600">{comment.comment}</p>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input value={commentDrafts[blog._id] || ""} onChange={(e) => setCommentDrafts((current) => ({ ...current, [blog._id]: e.target.value }))} placeholder="Write a comment..." className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none" />
                      <button type="button" onClick={() => submitComment(blog._id)} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                        <Send size={15} />
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        ))}

        {blogs.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No travel blogs yet. Be the first to share a story.
          </div>
        ) : null}
      </div>
    </div>
  );
}
