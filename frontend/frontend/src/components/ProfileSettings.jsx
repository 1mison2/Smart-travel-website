import React, { useEffect, useState } from "react";
import { User, Mail, Lock, Camera, MapPin, Calendar, Globe, CreditCard, Bell, Shield, Palette } from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    birthDate: "",
    languages: [],
    travelPreferences: {
      budget: "moderate",
      travelStyle: "adventure",
      accommodation: "mid-range",
      interests: ["trekking", "photography", "local food", "temples", "mountains"],
    },
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    tripReminders: true,
    priceAlerts: false,
    newsletter: true,
  });

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [preferencesError, setPreferencesError] = useState("");
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  const [notificationsMessage, setNotificationsMessage] = useState("");
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationsSaving, setNotificationsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile((prev) => ({
      ...prev,
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      location: user.location || "",
      bio: user.bio || "",
      birthDate: user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : "",
      languages: Array.isArray(user.languages) ? user.languages : [],
      travelPreferences: {
        budget: user.preferences?.budget || prev.travelPreferences.budget,
        travelStyle: user.preferences?.travelStyle || prev.travelPreferences.travelStyle,
        accommodation: user.preferences?.accommodation || prev.travelPreferences.accommodation,
        interests: Array.isArray(user.preferences?.interests)
          ? user.preferences.interests
          : prev.travelPreferences.interests,
      },
    }));
    setNotifications((prev) => ({
      emailNotifications: user.notifications?.emailNotifications ?? prev.emailNotifications,
      pushNotifications: user.notifications?.pushNotifications ?? prev.pushNotifications,
      tripReminders: user.notifications?.tripReminders ?? prev.tripReminders,
      priceAlerts: user.notifications?.priceAlerts ?? prev.priceAlerts,
      newsletter: user.notifications?.newsletter ?? prev.newsletter,
    }));
  }, [user]);

  const tabs = [
    { id: "profile", label: "Profile Info", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "preferences", label: "Preferences", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "payment", label: "Payment Methods", icon: CreditCard },
  ];

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      setProfileError("");
      setProfileMessage("");
      const payload = {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        bio: profile.bio,
        birthDate: profile.birthDate || null,
        languages: profile.languages,
      };
      const { data } = await api.put("/api/user/profile", payload);
      if (data?.user) updateUser(data.user);
      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      setProfileError(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError("Current and new password are required.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    try {
      setPasswordSaving(true);
      setPasswordError("");
      setPasswordMessage("");
      const payload = {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      };
      const { data } = await api.put("/api/user/password", payload);
      setPasswordMessage(data?.message || "Password updated.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordError(err?.response?.data?.message || "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    try {
      setPreferencesSaving(true);
      setPreferencesError("");
      setPreferencesMessage("");
      const payload = {
        preferences: {
          budget: profile.travelPreferences.budget,
          travelStyle: profile.travelPreferences.travelStyle,
          accommodation: profile.travelPreferences.accommodation,
          interests: profile.travelPreferences.interests,
        },
      };
      const { data } = await api.put("/api/user/profile", payload);
      if (data?.user) updateUser(data.user);
      setPreferencesMessage("Preferences saved.");
    } catch (err) {
      setPreferencesError(err?.response?.data?.message || "Failed to save preferences");
    } finally {
      setPreferencesSaving(false);
    }
  };

  const handleNotificationsUpdate = async () => {
    try {
      setNotificationsSaving(true);
      setNotificationsError("");
      setNotificationsMessage("");
      const payload = { notifications };
      const { data } = await api.put("/api/user/profile", payload);
      if (data?.user) updateUser(data.user);
      setNotificationsMessage("Notification settings saved.");
    } catch (err) {
      setNotificationsError(err?.response?.data?.message || "Failed to save notification settings");
    } finally {
      setNotificationsSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile & Settings</h2>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "profile" && (
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          {profileMessage && <p className="text-sm text-green-700">{profileMessage}</p>}
          {profileError && <p className="text-sm text-red-700">{profileError}</p>}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {profile.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <button type="button" className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Profile Picture</h3>
              <p className="text-sm text-gray-600">Upload a new avatar. JPG or PNG. Max 2MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Birth Date</label>
              <input
                type="date"
                value={profile.birthDate}
                onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
              <input
                type="text"
                value={profile.languages.join(", ")}
                onChange={(e) =>
                  setProfile({ ...profile, languages: e.target.value.split(",").map((l) => l.trim()).filter(Boolean) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="English, Nepali"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tell us about yourself..."
            />
          </div>

          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            {profileSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}

      {activeTab === "security" && (
        <form onSubmit={handlePasswordUpdate} className="space-y-6">
          {passwordMessage && <p className="text-sm text-green-700">{passwordMessage}</p>}
          {passwordError && <p className="text-sm text-red-700">{passwordError}</p>}
          <div>
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            {passwordSaving ? "Updating..." : "Update Password"}
          </button>
        </form>
      )}

      {activeTab === "preferences" && (
        <div className="space-y-6">
          {preferencesMessage && <p className="text-sm text-green-700">{preferencesMessage}</p>}
          {preferencesError && <p className="text-sm text-red-700">{preferencesError}</p>}
          <h3 className="text-lg font-semibold">Travel Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range</label>
              <select
                value={profile.travelPreferences.budget}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    travelPreferences: { ...profile.travelPreferences, budget: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="budget">Budget ($0-50/day)</option>
                <option value="moderate">Moderate ($50-150/day)</option>
                <option value="comfort">Comfort ($150-300/day)</option>
                <option value="luxury">Luxury ($300+/day)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Travel Style</label>
              <select
                value={profile.travelPreferences.travelStyle}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    travelPreferences: { ...profile.travelPreferences, travelStyle: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="adventure">Adventure</option>
                <option value="relaxation">Relaxation</option>
                <option value="cultural">Cultural</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Accommodation</label>
              <select
                value={profile.travelPreferences.accommodation}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    travelPreferences: { ...profile.travelPreferences, accommodation: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="budget">Budget</option>
                <option value="mid-range">Mid-range</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["Hiking", "Photography", "Local Food", "Museums", "Nightlife", "Shopping", "Beaches", "Wildlife"].map(
                (interest) => (
                  <label key={interest} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded text-blue-600"
                      checked={profile.travelPreferences.interests.includes(interest.toLowerCase())}
                      onChange={(e) => {
                        const value = interest.toLowerCase();
                        const next = e.target.checked
                          ? [...profile.travelPreferences.interests, value]
                          : profile.travelPreferences.interests.filter((item) => item !== value);
                        setProfile({ ...profile, travelPreferences: { ...profile.travelPreferences, interests: next } });
                      }}
                    />
                    <span className="text-sm">{interest}</span>
                  </label>
                )
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handlePreferencesUpdate}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {preferencesSaving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-6">
          {notificationsMessage && <p className="text-sm text-green-700">{notificationsMessage}</p>}
          {notificationsError && <p className="text-sm text-red-700">{notificationsError}</p>}
          <h3 className="text-lg font-semibold">Notification Settings</h3>
          <div className="space-y-4">
            {Object.entries(notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</h4>
                  <p className="text-sm text-gray-600">
                    {key === "emailNotifications" && "Receive email updates about your trips and account"}
                    {key === "pushNotifications" && "Get push notifications on your device"}
                    {key === "tripReminders" && "Reminders before your trips"}
                    {key === "priceAlerts" && "Alerts when prices drop for saved destinations"}
                    {key === "newsletter" && "Weekly travel tips and destination recommendations"}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleNotificationsUpdate}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {notificationsSaving ? "Saving..." : "Save Notification Settings"}
          </button>
        </div>
      )}

      {activeTab === "payment" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Payment Methods</h3>
            <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Add Payment Method
            </button>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                    VISA
                  </div>
                  <div>
                    <div className="font-medium">**** **** **** 4242</div>
                    <div className="text-sm text-gray-600">Expires 12/25</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Default</span>
                  <button type="button" className="text-gray-400 hover:text-gray-600">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-bold">
                    MC
                  </div>
                  <div>
                    <div className="font-medium">**** **** **** 5555</div>
                    <div className="text-sm text-gray-600">Expires 09/24</div>
                  </div>
                </div>
                <button type="button" className="text-gray-400 hover:text-gray-600">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
