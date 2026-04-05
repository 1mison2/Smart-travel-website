import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, HeartHandshake, MapPin, MessageCircleMore, Search, Star, UserPlus, Users } from "lucide-react";
import api from "../../utils/api";
import SectionSkeleton from "./SectionSkeleton";

export default function TravelerNetworkSection({ onNotify }) {
  const [query, setQuery] = useState("");
  const [travelers, setTravelers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [profile, setProfile] = useState(null);
  const [myPlans, setMyPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [sendingPlanId, setSendingPlanId] = useState("");

  const loadTravelers = async (search = "") => {
    try {
      setLoading(true);
      const [travelersRes, myPlansRes] = await Promise.all([
        api.get("/api/user/travelers", { params: search ? { q: search } : {} }),
        api.get("/api/travel-plans", { params: { mine: true } }),
      ]);
      const nextTravelers = travelersRes.data?.travelers || [];
      setTravelers(nextTravelers);
      setMyPlans(Array.isArray(myPlansRes.data?.travelPlans) ? myPlansRes.data.travelPlans : []);
      setSelectedId((current) => current || nextTravelers[0]?._id || "");
    } catch (_err) {
      onNotify?.({ type: "error", message: "Failed to load traveler network." });
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (travelerId) => {
    if (!travelerId) {
      setProfile(null);
      return;
    }
    try {
      setProfileLoading(true);
      const { data } = await api.get(`/api/user/travelers/${travelerId}`);
      setProfile(data);
      setFollowing(Boolean(data?.traveler?.isFollowing));
    } catch (_err) {
      onNotify?.({ type: "error", message: "Failed to load traveler profile." });
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadTravelers();
  }, []);

  useEffect(() => {
    loadProfile(selectedId);
  }, [selectedId]);

  const searchTravelers = async (event) => {
    event.preventDefault();
    await loadTravelers(query.trim());
  };

  const toggleFollow = async () => {
    if (!profile?.traveler?._id) return;
    try {
      const { data } = await api.post(`/api/user/travelers/${profile.traveler._id}/follow`);
      const nextFollowing = Boolean(data?.isFollowing);
      setFollowing(nextFollowing);
      setTravelers((current) =>
        current.map((traveler) =>
          traveler._id === profile.traveler._id
            ? {
                ...traveler,
                isFollowing: nextFollowing,
                followersCount: data?.followersCount ?? traveler.followersCount,
              }
            : traveler
        )
      );
      setProfile((current) =>
        current
          ? {
              ...current,
              traveler: {
                ...current.traveler,
                isFollowing: nextFollowing,
                followersCount: data?.followersCount ?? current.traveler.followersCount,
              },
            }
          : current
      );
      onNotify?.({ type: "success", message: data?.message || "Follow state updated." });
    } catch (err) {
      onNotify?.({ type: "error", message: err?.response?.data?.message || "Unable to update follow state." });
    }
  };

  const sendBuddyRequest = async (plan) => {
    try {
      setSendingPlanId(plan._id);
      const senderPlanId =
        myPlans.find((item) => item.destination?.toLowerCase() === plan.destination?.toLowerCase())?._id || myPlans[0]?._id || null;

      await api.post("/api/buddy/request", {
        receiverId: profile?.traveler?._id,
        travelPlanId: plan._id,
        senderPlanId,
      });
      onNotify?.({ type: "success", message: `Buddy request sent to ${profile?.traveler?.name || "traveler"}.` });
    } catch (err) {
      onNotify?.({ type: "error", message: err?.response?.data?.message || "Unable to send buddy request." });
    } finally {
      setSendingPlanId("");
    }
  };

  if (loading) return <SectionSkeleton cards={3} />;

  return (
    <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a,#1d4ed8_58%,#14b8a6)] px-5 py-5 text-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-sky-100">Traveler Network</p>
          <h3 className="mt-3 text-2xl font-bold leading-tight">Browse real travelers, not just usernames</h3>
          <p className="mt-2 text-sm leading-7 text-sky-50/85">Follow, inspect their travel style, review their stories, and jump into buddy planning from one workspace.</p>
        </div>

        <div className="p-4">
          <form onSubmit={searchTravelers} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search travelers by name, bio, or location"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none"
              />
            </div>
            <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
              Search
            </button>
          </form>

          <div className="mt-4 grid gap-3">
            {travelers.map((traveler) => (
              <button
                key={traveler._id}
                type="button"
                onClick={() => setSelectedId(traveler._id)}
                className={`rounded-[24px] border p-4 text-left transition ${
                  selectedId === traveler._id ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-slate-50 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{traveler.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{traveler.location || traveler.travelStyle || "Traveler profile"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${traveler.isFollowing ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {traveler.isFollowing ? "Following" : "Discover"}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{traveler.bio || "Traveler building their profile. Open to meaningful trips, stories, and shared itineraries."}</p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{traveler.followersCount || 0} followers</span>
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{traveler.postsCount || 0} posts</span>
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{traveler.travelPlansCount || 0} trips</span>
                </div>
              </button>
            ))}

            {travelers.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No travelers matched your search yet.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        {profileLoading || !profile ? (
          <SectionSkeleton cards={2} />
        ) : (
          <div>
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc,#e0f2fe_55%,#dcfce7)] px-6 py-6">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-3xl">
                  <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-slate-500">Traveler Profile</p>
                  <h3 className="mt-3 text-3xl font-bold text-slate-900">{profile.traveler?.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{profile.traveler?.bio || "This traveler has not written a bio yet, but their trips and stories below still give a strong sense of fit."}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(profile.traveler?.interests || []).slice(0, 6).map((interest) => (
                      <span key={interest} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {interest}
                      </span>
                    ))}
                    {profile.traveler?.travelStyle ? (
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                        {profile.traveler.travelStyle}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Social Reach</p>
                    <strong className="mt-2 block text-2xl text-slate-900">{profile.traveler?.followersCount || 0}</strong>
                    <p className="text-sm text-slate-500">Followers watching their trips and stories</p>
                  </div>
                  <div className="rounded-[24px] bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Travel Activity</p>
                    <strong className="mt-2 block text-2xl text-slate-900">{(profile.travelPlans || []).length}</strong>
                    <p className="text-sm text-slate-500">Published plans ready for matching</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={toggleFollow}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${
                    following ? "bg-slate-900 text-white" : "bg-emerald-500 text-white"
                  }`}
                >
                  <UserPlus size={16} />
                  {following ? "Following" : "Follow Traveler"}
                </button>
                {profile.chatRoom?._id ? (
                  <Link to={`/buddy/chat/${profile.chatRoom._id}`} className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white">
                    <MessageCircleMore size={16} />
                    Open Chat
                  </Link>
                ) : null}
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
                  <MapPin size={16} />
                  {profile.traveler?.location || "Location not added"}
                </span>
              </div>
            </div>

            <div className="grid gap-6 p-6">
              <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Trip Plans</p>
                    <h4 className="mt-2 text-xl font-bold text-slate-900">Travel plans you can act on right now</h4>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                    <p className="text-sm text-slate-500">Your own plans linked</p>
                    <strong className="text-lg text-slate-900">{myPlans.length}</strong>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {(profile.travelPlans || []).map((plan) => (
                    <article key={plan._id} className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h5 className="text-lg font-semibold text-slate-900">{plan.title || plan.destination}</h5>
                          <p className="mt-1 text-sm text-slate-500">{plan.destination}</p>
                        </div>
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                          NPR {Number(plan.budget || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{plan.description || "Shared trip looking for compatible travelers."}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(plan.interests || []).slice(0, 4).map((interest) => (
                          <span key={interest} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {interest}
                          </span>
                        ))}
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-3">
                        <div className="text-sm text-slate-500">
                          {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                        </div>
                        <button
                          type="button"
                          onClick={() => sendBuddyRequest(plan)}
                          disabled={sendingPlanId === plan._id || myPlans.length === 0}
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          <HeartHandshake size={15} />
                          {sendingPlanId === plan._id ? "Sending..." : myPlans.length === 0 ? "Create your trip first" : "Send Buddy Request"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
                <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
                      <Compass size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Posts & Blogs</p>
                      <h4 className="text-xl font-bold text-slate-900">Recent stories from this traveler</h4>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {(profile.posts || []).slice(0, 6).map((post) => (
                      <article key={post._id} className="rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-200">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${post.type === "trip_post" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
                            {post.type === "trip_post" ? "Trip Post" : "Blog"}
                          </span>
                          <span className="text-xs text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h5 className="mt-3 text-lg font-semibold text-slate-900">{post.title || post.destination || "Traveler story"}</h5>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{post.content}</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{post.likesCount || 0} likes</span>
                          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{post.commentsCount || 0} comments</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-amber-50 p-3 text-amber-500">
                      <Star size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Reviews</p>
                      <h4 className="text-xl font-bold text-slate-900">Destination notes from their trips</h4>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {(profile.reviews || []).map((review) => (
                      <article key={review._id} className="rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-200">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h5 className="text-lg font-semibold text-slate-900">{review.destination}</h5>
                            <p className="text-sm text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            {review.rating}/5
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{review.reviewText}</p>
                      </article>
                    ))}

                    {(profile.reviews || []).length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        No public reviews from this traveler yet.
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
