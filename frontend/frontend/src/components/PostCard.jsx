import React from "react";
import { Link } from "react-router-dom";
import { Bookmark, Heart, MessageCircle, MoveRight, Sparkles } from "lucide-react";

export default function PostCard({ post, onLike, onSave }) {
  return (
    <article className="story-card">
      <div className="story-card__media">
        {post.images?.[0] ? (
          <img src={post.images[0]} alt={post.title || post.destination} className="story-card__image" />
        ) : (
          <div className="story-card__fallback">
            <span className="story-card__fallback-badge">
              <Sparkles size={14} />
              Featured Story
            </span>
            <h3>{post.title || post.destination || "Travel story"}</h3>
          </div>
        )}
        <div className="story-card__overlay" />
        <div className="story-card__topline">
          <span className="story-card__destination">{post.destination || "Travel Story"}</span>
          <span className="story-card__status">{post.status || "approved"}</span>
        </div>
      </div>

      <div className="story-card__body">
        <div className="story-card__copy">
          <h3>{post.title || "Untitled post"}</h3>
          <p>{post.content}</p>
        </div>

        <div className="story-card__tags">
          {(post.tags || []).slice(0, 5).map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>

        <div className="story-card__footer">
          <div className="story-card__meta">
            <strong>{post.userId?.name || "Traveler"}</strong>
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            <span className="story-card__comment-meta">
              <MessageCircle size={14} />
              {post.commentsCount || 0}
            </span>
          </div>

          <div className="story-card__actions">
            <button
              type="button"
              onClick={() => onLike?.(post._id)}
              className={`story-card__action ${post.isLiked ? "story-card__action--liked" : ""}`}
            >
              <Heart size={14} fill={post.isLiked ? "currentColor" : "none"} />
              {post.likesCount || 0}
            </button>
            <button
              type="button"
              onClick={() => onSave?.(post._id)}
              className={`story-card__action ${post.isSaved ? "story-card__action--saved" : ""}`}
            >
              <Bookmark size={14} fill={post.isSaved ? "currentColor" : "none"} />
              {post.isSaved ? "Saved" : "Save"}
            </button>
            <Link to={`/community/posts/${post._id}`} className="story-card__read">
              Read more
              <MoveRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .story-card {
          overflow: hidden;
          border-radius: 32px;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }

        .story-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 54px rgba(14, 165, 233, 0.12);
        }

        .story-card__media {
          position: relative;
          height: 270px;
          overflow: hidden;
          background: linear-gradient(135deg, #082f49, #0f172a 60%, #14532d);
        }

        .story-card__image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .story-card:hover .story-card__image {
          transform: scale(1.04);
        }

        .story-card__fallback {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          width: 100%;
          height: 100%;
          padding: 24px;
          color: #ffffff;
          background:
            radial-gradient(circle at top left, rgba(14, 165, 233, 0.36), transparent 34%),
            linear-gradient(135deg, #082f49, #0f172a 62%, #14532d);
        }

        .story-card__fallback h3 {
          margin: 14px 0 0;
          max-width: 18rem;
          font-size: 1.8rem;
          line-height: 1.15;
          color: #ffffff;
        }

        .story-card__fallback-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.92);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          backdrop-filter: blur(12px);
        }

        .story-card__overlay {
          position: absolute;
          inset: auto 0 0;
          height: 120px;
          background: linear-gradient(180deg, transparent, rgba(2, 6, 23, 0.7));
          pointer-events: none;
        }

        .story-card__topline {
          position: absolute;
          top: 18px;
          left: 18px;
          right: 18px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .story-card__destination,
        .story-card__status {
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .story-card__destination {
          background: rgba(255, 255, 255, 0.92);
          color: #0369a1;
        }

        .story-card__status {
          background: rgba(240, 253, 244, 0.96);
          color: #15803d;
        }

        .story-card__body {
          padding: 24px;
          display: grid;
          gap: 18px;
        }

        .story-card__copy h3 {
          margin: 0;
          font-size: 1.5rem;
          line-height: 1.15;
          color: #0f172a;
        }

        .story-card__copy p {
          margin: 12px 0 0;
          color: #475569;
          line-height: 1.75;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .story-card__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .story-card__tags span {
          padding: 8px 12px;
          border-radius: 999px;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.8rem;
          font-weight: 700;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .story-card__footer {
          display: grid;
          gap: 14px;
          padding: 16px;
          border-radius: 24px;
          background: linear-gradient(180deg, #f8fafc, #ffffff);
          border: 1px solid rgba(148, 163, 184, 0.18);
        }

        .story-card__meta {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          align-items: center;
          color: #64748b;
          font-size: 0.92rem;
        }

        .story-card__meta strong {
          color: #0f172a;
        }

        .story-card__comment-meta {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .story-card__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .story-card__action,
        .story-card__read {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 14px;
          border-radius: 999px;
          font-size: 0.9rem;
          font-weight: 800;
          border: none;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .story-card__action {
          background: #eff6ff;
          color: #0369a1;
        }

        .story-card__action--liked {
          background: #fff1f2;
          color: #be123c;
        }

        .story-card__action--saved {
          background: #ecfdf5;
          color: #047857;
        }

        .story-card__read {
          background: linear-gradient(135deg, #0f172a, #0f766e);
          color: #ffffff;
        }

        .story-card__action:hover,
        .story-card__read:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 640px) {
          .story-card__media {
            height: 220px;
          }

          .story-card__body {
            padding: 20px;
          }

          .story-card__copy h3 {
            font-size: 1.3rem;
          }
        }
      `}</style>
    </article>
  );
}
