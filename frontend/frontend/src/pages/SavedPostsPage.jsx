import React, { useEffect, useState } from "react";
import { Bookmark, NotebookPen } from "lucide-react";
import PostCard from "../components/PostCard";
import TravelSocialShell from "../components/TravelSocialShell";
import api from "../utils/api";

export default function SavedPostsPage() {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");

  const loadSavedPosts = async () => {
    try {
      const { data } = await api.get("/api/posts/saved");
      setPosts(Array.isArray(data?.posts) ? data.posts : []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load saved posts");
    }
  };

  useEffect(() => {
    loadSavedPosts();
  }, []);

  const likePost = async (postId) => {
    await api.post("/api/posts/like", { postId });
    await loadSavedPosts();
  };

  const savePost = async (postId) => {
    await api.post("/api/posts/save", { postId });
    await loadSavedPosts();
  };

  return (
    <TravelSocialShell
      theme="community"
      badge="Saved Posts"
      icon={Bookmark}
      title="Keep the best travel ideas in one place for later."
      description="Your bookmarks act like a personal inspiration board for places, reviews, and stories worth revisiting."
      stats={[
        { label: "Saved", value: posts.length },
        { label: "Feed sync", value: "Live" },
        { label: "Collection", value: "Personal" },
      ]}
      actions={[
        { label: "Back to feed", to: "/community", variant: "ghost" },
        { label: "Create a post", to: "/community/create" },
      ]}
    >
      <section className="rounded-[34px] border border-white/70 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Your Collection</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Bookmarked travel inspiration</h2>
          </div>
          <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
            <NotebookPen size={20} />
          </span>
        </div>
        {error && <p className="mb-4 text-sm font-medium text-rose-700">{error}</p>}
        <div className="grid gap-5">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onLike={likePost} onSave={savePost} />
          ))}
        </div>
      </section>
    </TravelSocialShell>
  );
}
