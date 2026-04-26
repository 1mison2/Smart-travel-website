const normalizeList = (items) =>
  Array.from(
    new Set(
      (Array.isArray(items) ? items : String(items || "").split(","))
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );

export const getMatchScore = (match) =>
  Math.max(0, Math.min(100, Number(match?.compatibility ?? match?.matchScore ?? 0)));

export const formatTravelWindow = (plan) => {
  const start = plan?.startDate ? new Date(plan.startDate) : null;
  const end = plan?.endDate ? new Date(plan.endDate) : null;
  if (!start || Number.isNaN(start.getTime())) return "Dates flexible";
  if (!end || Number.isNaN(end.getTime())) {
    return start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
};

export const getBudgetBand = (budget) => {
  const value = Number(budget || 0);
  if (!value) return "Budget not set";
  if (value < 10000) return "Budget-light";
  if (value < 25000) return "Balanced spend";
  if (value < 50000) return "Comfort-focused";
  return "Premium pace";
};

export const getProfileCompleteness = (user, plan) => {
  const checks = [
    Boolean(user?.profilePicture),
    Boolean(user?.bio),
    Boolean(user?.location),
    normalizeList(user?.interests || user?.preferences?.interests).length > 0,
    Boolean(user?.travelStyle || user?.preferences?.travelStyle),
    normalizeList(user?.languages).length > 0,
    Boolean(plan?.description),
    Boolean(plan?.budget),
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
};

export const getTrustBadges = (user, plan) => {
  const badges = [];
  if (user?.isEmailVerified) badges.push("Email verified");
  if (user?.phone) badges.push("Phone added");
  if (normalizeList(user?.languages).length > 0) badges.push(`${normalizeList(user.languages).length} languages`);
  if (plan?.budget) badges.push(getBudgetBand(plan.budget));
  if (user?.travelStyle || user?.preferences?.travelStyle || plan?.travelStyle) {
    badges.push(plan?.travelStyle || user?.travelStyle || user?.preferences?.travelStyle);
  }
  return badges.slice(0, 4);
};

export const getSharedSignals = (match) => {
  const reasons = Array.isArray(match?.reasons) ? match.reasons : [];
  const sharedInterests = normalizeList(match?.sharedInterests);
  const signals = [...reasons];
  if (sharedInterests.length) {
    signals.push(`Shared vibe: ${sharedInterests.slice(0, 2).join(", ")}`);
  }
  return Array.from(new Set(signals)).slice(0, 4);
};

export const getCautionNote = (sourcePlan, candidatePlan, match) => {
  const budgetGap = Math.abs(Number(sourcePlan?.budget || 0) - Number(candidatePlan?.budget || 0));
  const sourceStyle = String(sourcePlan?.travelStyle || "").trim().toLowerCase();
  const candidateStyle = String(candidatePlan?.travelStyle || "").trim().toLowerCase();

  if ((match?.overlappingDays || 0) <= 1) return "Only a small date overlap. Confirm timing early.";
  if (budgetGap > 15000) return "Budget expectations look a bit apart. Align spend before booking.";
  if (sourceStyle && candidateStyle && sourceStyle !== candidateStyle) return "Travel styles differ. Set expectations around pace and comfort.";
  return "Looks promising. Start with timing, budget, and stay preference.";
};

export const getMatchTone = (score) => {
  if (score >= 85) return { label: "Excellent fit", accent: "emerald" };
  if (score >= 70) return { label: "Strong fit", accent: "sky" };
  if (score >= 55) return { label: "Good potential", accent: "amber" };
  return { label: "Needs alignment", accent: "slate" };
};

export const buildIntroMessage = (sourcePlan, match) => {
  const sourceDestination = sourcePlan?.destination || "the same destination";
  const overlap = match?.overlappingDays ? `I noticed we overlap for ${match.overlappingDays} day${match.overlappingDays === 1 ? "" : "s"}` : "our plans looked similar";
  const sharedInterest = normalizeList(match?.sharedInterests)[0];
  const interestNote = sharedInterest ? ` and we both seem into ${sharedInterest}` : "";
  return `Hi, I'm planning ${sourceDestination} too. ${overlap}${interestNote}. Want to compare trip style and see if we're a good buddy match?`;
};
