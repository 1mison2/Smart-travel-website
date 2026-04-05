import React, { useEffect, useRef, useState } from "react";
import { BookOpenText, Compass, MessageSquareText, ScrollText, Star, Users } from "lucide-react";
import BuddyFinderSection from "../components/community/BuddyFinderSection";
import TravelerNetworkSection from "../components/community/TravelerNetworkSection";
import TripPostsSection from "../components/community/TripPostsSection";
import BlogFeedSection from "../components/community/BlogFeedSection";
import DestinationReviewsSection from "../components/community/DestinationReviewsSection";
import ChatSystemSection from "../components/community/ChatSystemSection";
import TravelBuddyNav from "../components/TravelBuddyNav";

const tabs = [
  { key: "travelers", label: "Traveler Network", icon: Users, description: "Profiles and follows" },
  { key: "buddies", label: "Find Travel Buddies", icon: Compass, description: "Matches and requests" },
  { key: "trips", label: "Trip Posts", icon: ScrollText, description: "Open travel plans" },
  { key: "blogs", label: "Travel Blogs", icon: BookOpenText, description: "Stories and tips" },
  { key: "reviews", label: "Destination Reviews", icon: Star, description: "Recent feedback" },
  { key: "chat", label: "Messages / Chat", icon: MessageSquareText, description: "Accepted chats" },
];

export default function CommunityHubPage() {
  const [activeTab, setActiveTab] = useState("travelers");
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  const notify = (payload) => {
    setToast(payload);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  };

  return (
    <div className="community-hub-page">
      <div className="community-hub-page__mesh" />

      <div className="community-hub-page__container">
        <TravelBuddyNav />

        <section className="community-hub-page__hero">
          <div className="community-hub-page__hero-main">
            <h1>Travel Buddy Finder and Travel Community Hub</h1>
            <p>Find travelers, share trips, and chat in one place.</p>
          </div>
        </section>

        <section className="community-hub-page__workspace">
          <aside className="community-hub-page__sidebar">
            <div className="community-hub-page__tab-list">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`community-hub-page__tab ${activeTab === tab.key ? "community-hub-page__tab--active" : ""}`}
                >
                  <span className="community-hub-page__tab-icon">
                    <tab.icon size={18} />
                  </span>
                  <span className="community-hub-page__tab-copy">
                    <strong>{tab.label}</strong>
                    <small>{tab.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="community-hub-page__content">
            {activeTab === "travelers" ? <TravelerNetworkSection onNotify={notify} /> : null}
            {activeTab === "buddies" ? <BuddyFinderSection onNotify={notify} /> : null}
            {activeTab === "trips" ? <TripPostsSection onNotify={notify} /> : null}
            {activeTab === "blogs" ? <BlogFeedSection onNotify={notify} /> : null}
            {activeTab === "reviews" ? <DestinationReviewsSection onNotify={notify} /> : null}
            {activeTab === "chat" ? <ChatSystemSection onNotify={notify} /> : null}
          </div>
        </section>
      </div>

      {toast ? (
        <div className={`community-hub-page__toast community-hub-page__toast--${toast.type || "info"}`}>
          {toast.message}
        </div>
      ) : null}

      <style>{`
        .community-hub-page {
          position: relative;
          min-height: 100vh;
          padding: 24px 16px 36px;
          background:
            radial-gradient(circle at top left, rgba(14,165,233,0.16), transparent 26%),
            radial-gradient(circle at top right, rgba(34,197,94,0.1), transparent 24%),
            linear-gradient(180deg, #edf6ff 0%, #f8fafc 16%, #f8fafc 100%);
          overflow: hidden;
        }

        .community-hub-page__mesh {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.18), transparent 46%);
          pointer-events: none;
        }

        .community-hub-page__container {
          position: relative;
          z-index: 1;
          max-width: 1380px;
          margin: 0 auto;
        }

        .community-hub-page__hero {
          display: grid;
          grid-template-columns: 1fr;
          gap: 22px;
          margin-top: 20px;
          padding: 28px;
          border-radius: 34px;
          border: 1px solid rgba(255,255,255,0.6);
          background:
            linear-gradient(135deg, rgba(8,47,73,0.98), rgba(14,165,233,0.92) 68%, rgba(34,197,94,0.88)),
            #0f172a;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.16);
          color: #fff;
        }

        .community-hub-page__hero h1 {
          margin: 0;
          max-width: 18ch;
          font-size: clamp(2.4rem, 4vw, 4.6rem);
          line-height: 0.98;
          color: #fff;
        }

        .community-hub-page__hero p {
          margin: 16px 0 0;
          max-width: 48rem;
          color: rgba(240,249,255,0.92);
          font-size: 1rem;
          line-height: 1.8;
        }

        .community-hub-page__workspace {
          display: grid;
          grid-template-columns: 310px minmax(0, 1fr);
          gap: 22px;
          margin-top: 22px;
        }

        .community-hub-page__sidebar {
          position: sticky;
          top: 20px;
          align-self: start;
          padding: 22px;
          border-radius: 30px;
          border: 1px solid rgba(226,232,240,0.9);
          background: rgba(255,255,255,0.9);
          box-shadow: 0 20px 55px rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(18px);
        }

        .community-hub-page__tab-list {
          display: grid;
          gap: 10px;
        }

        .community-hub-page__tab {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          width: 100%;
          padding: 15px;
          border: 1px solid transparent;
          border-radius: 22px;
          background: transparent;
          text-align: left;
          cursor: pointer;
          transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
        }

        .community-hub-page__tab:hover {
          transform: translateY(-1px);
          border-color: rgba(186,230,253,1);
          background: rgba(248,250,252,0.95);
        }

        .community-hub-page__tab--active {
          background: linear-gradient(135deg, rgba(240,249,255,1), rgba(236,253,245,0.88));
          border-color: rgba(125,211,252,0.8);
          box-shadow: 0 18px 36px rgba(14,165,233,0.10);
        }

        .community-hub-page__tab-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          border-radius: 16px;
          background: #e2e8f0;
          color: #0f172a;
        }

        .community-hub-page__tab--active .community-hub-page__tab-icon {
          background: linear-gradient(135deg, #0ea5e9, #14b8a6);
          color: #fff;
        }

        .community-hub-page__tab-copy {
          display: grid;
          gap: 4px;
        }

        .community-hub-page__tab-copy strong {
          color: #0f172a;
          font-size: 0.98rem;
        }

        .community-hub-page__tab-copy small {
          color: #64748b;
          font-size: 0.86rem;
          line-height: 1.55;
        }

        .community-hub-page__content {
          min-width: 0;
        }

        .community-hub-page__toast {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 60;
          padding: 14px 18px;
          border-radius: 18px;
          color: #fff;
          font-weight: 700;
          box-shadow: 0 18px 40px rgba(15,23,42,0.2);
        }

        .community-hub-page__toast--error {
          background: #ef4444;
        }

        .community-hub-page__toast--success {
          background: #10b981;
        }

        .community-hub-page__toast--info {
          background: #0f172a;
        }

        @media (max-width: 1100px) {
          .community-hub-page__hero,
          .community-hub-page__workspace {
            grid-template-columns: 1fr;
          }

          .community-hub-page__sidebar {
            position: static;
          }
        }

        @media (max-width: 720px) {
          .community-hub-page {
            padding-inline: 12px;
          }

          .community-hub-page__hero {
            padding: 22px;
            border-radius: 26px;
          }

          .community-hub-page__hero h1 {
            font-size: 2.35rem;
          }

          .community-hub-page__sidebar {
            padding: 18px;
            border-radius: 24px;
          }

          .community-hub-page__tab {
            padding: 14px;
            border-radius: 18px;
          }

        }
      `}</style>
    </div>
  );
}
