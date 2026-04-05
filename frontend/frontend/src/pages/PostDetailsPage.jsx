import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MessageCircle, Newspaper } from "lucide-react";
import TravelSocialShell from "../components/TravelSocialShell";
import api from "../utils/api";

export default function PostDetailsPage() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        api.get(`/api/posts/${postId}`),
        api.get(`/api/comments/${postId}`),
      ]);
      setPost(postRes.data?.post || null);
      setComments(Array.isArray(commentsRes.data?.comments) ? commentsRes.data.comments : []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load post");
    }
  };

  useEffect(() => {
    load();
  }, [postId]);

  const submitComment = async (event) => {
    event.preventDefault();
    await api.post("/api/comments/create", { postId, comment });
    setComment("");
    await load();
  };

  if (!post) {
    return (
      <TravelSocialShell
        theme="community"
        badge="Post Details"
        icon={Newspaper}
        title="Loading the selected story."
        description="Opening the full article and discussion."
      >
        <p className="rounded-[28px] border border-white/70 bg-white/90 p-6 text-slate-600 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">{error || "Loading post..."}</p>
      </TravelSocialShell>
    );
  }

  return (
    <TravelSocialShell
      theme="community"
      badge={post.destination || "Travel Story"}
      icon={Newspaper}
      title={post.title || "Travel post"}
      description={`By ${post.userId?.name || "Traveler"} on ${new Date(post.createdAt).toLocaleString()}`}
      stats={[
        { label: "Comments", value: comments.length },
        { label: "Images", value: (post.images || []).length },
        { label: "Type", value: "Story" },
      ]}
      actions={[
        { label: "Back to feed", to: "/community", variant: "ghost" },
        { label: "Saved posts", to: "/community/saved" },
      ]}
    >
      <div className="grid gap-6">
        <article className="rounded-[34px] border border-white/70 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-4 md:grid-cols-2">
            {(post.images || []).map((image) => (
              <img key={image} src={image} alt={post.title} className="h-72 w-full rounded-[28px] object-cover shadow-sm" />
            ))}
          </div>
          <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-slate-700">{post.content}</p>
        </article>

        <section className="rounded-[34px] border border-white/70 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
              <MessageCircle size={20} />
            </span>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Comments</h2>
              <p className="text-sm text-slate-500">Add to the conversation.</p>
            </div>
          </div>
          <form onSubmit={submitComment} className="mt-5 flex gap-3">
            <input className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" placeholder="Share your thoughts..." value={comment} onChange={(e) => setComment(e.target.value)} />
            <button className="rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-5 py-3.5 font-semibold text-white">Comment</button>
          </form>
          <div className="mt-6 space-y-4">
            {comments.map((item) => (
              <article key={item._id} className="rounded-[26px] bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="font-semibold text-slate-900">{item.userId?.name || "Traveler"}</p>
                <p className="mt-2 leading-7 text-slate-600">{item.comment}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </TravelSocialShell>
  );
}
