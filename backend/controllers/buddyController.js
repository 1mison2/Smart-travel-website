const mongoose = require("mongoose");
const BuddyRequest = require("../models/BuddyRequest");
const ChatRoom = require("../models/ChatRoom");
const TravelPlan = require("../models/TravelPlan");
const User = require("../models/User");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const overlapDays = (startA, endA, startB, endB) => {
  const start = Math.max(new Date(startA).getTime(), new Date(startB).getTime());
  const end = Math.min(new Date(endA).getTime(), new Date(endB).getTime());
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
};

const normalizeList = (items) =>
  Array.from(new Set((items || []).map((item) => String(item || "").trim().toLowerCase()).filter(Boolean)));

const matchScoreForPlans = (sourcePlan, candidatePlan) => {
  let score = 0;
  const reasons = [];
  if (String(sourcePlan.destination).trim().toLowerCase() === String(candidatePlan.destination).trim().toLowerCase()) {
    score += 45;
    reasons.push("same destination");
  }

  const overlappingDays = overlapDays(sourcePlan.startDate, sourcePlan.endDate, candidatePlan.startDate, candidatePlan.endDate);
  if (overlappingDays > 0) {
    score += Math.min(25, overlappingDays * 5);
    reasons.push(`${overlappingDays} day date overlap`);
  }

  const sourceInterests = normalizeList(sourcePlan.interests);
  const candidateInterests = normalizeList(candidatePlan.interests);
  const sharedInterests = sourceInterests.filter((item) => candidateInterests.includes(item));
  if (sharedInterests.length) {
    score += Math.min(20, sharedInterests.length * 5);
    reasons.push(`${sharedInterests.length} shared interests`);
  }

  const budgetGap = Math.abs(Number(sourcePlan.budget || 0) - Number(candidatePlan.budget || 0));
  if (budgetGap <= 5000) {
    score += 10;
    reasons.push("similar budget");
  } else if (budgetGap <= 15000) {
    score += 5;
    reasons.push("close budget");
  }

  if (sourcePlan.travelStyle && candidatePlan.travelStyle && sourcePlan.travelStyle === candidatePlan.travelStyle) {
    score += 5;
    reasons.push("same travel style");
  }

  return { score, overlappingDays, sharedInterests, reasons };
};

exports.searchTravelBuddies = async (req, res) => {
  try {
    const {
      destination = "",
      startDate,
      endDate,
      interests = "",
      budget,
      minBudget,
      maxBudget,
      travelStyle = "",
    } = req.query;

    const normalizedDestination = String(destination || "").trim();
    const normalizedInterests = normalizeList(Array.isArray(interests) ? interests : String(interests || "").split(","));
    const query = { userId: { $ne: req.user._id } };

    if (normalizedDestination) {
      query.destination = { $regex: normalizedDestination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }
    if (startDate) query.endDate = { ...(query.endDate || {}), $gte: new Date(startDate) };
    if (endDate) query.startDate = { ...(query.startDate || {}), $lte: new Date(endDate) };
    if (minBudget || maxBudget) {
      query.budget = {};
      if (minBudget) query.budget.$gte = Number(minBudget);
      if (maxBudget) query.budget.$lte = Number(maxBudget);
    }
    if (normalizedInterests.length) query.interests = { $in: normalizedInterests };

    const candidates = await TravelPlan.find(query)
      .sort({ createdAt: -1 })
      .limit(40)
      .populate("userId", "name email profilePicture bio interests travelStyle preferences");

    const sourcePlan = {
      destination: normalizedDestination,
      startDate: startDate || null,
      endDate: endDate || null,
      budget: Number(budget || maxBudget || minBudget || 0),
      interests: normalizedInterests,
      travelStyle: String(travelStyle || "").trim(),
    };

    const matches = candidates
      .map((candidatePlan) => {
        const result = matchScoreForPlans(sourcePlan, candidatePlan);
        return {
          compatibility: Math.min(100, result.score),
          reasons: result.reasons,
          sharedInterests: result.sharedInterests,
          overlappingDays: result.overlappingDays,
          travelPlan: candidatePlan,
          traveler: candidatePlan.userId,
        };
      })
      .filter((item) => item.compatibility > 0)
      .sort((a, b) => b.compatibility - a.compatibility);

    return res.json({ filters: sourcePlan, matches });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to search travel buddies" });
  }
};

exports.getMatchesForTravelPlan = async (req, res) => {
  try {
    const { travelPlanId } = req.params;
    if (!isValidObjectId(travelPlanId)) return res.status(400).json({ message: "Invalid travel plan id" });

    const sourcePlan = await TravelPlan.findById(travelPlanId).populate("userId", "name email profilePicture bio interests travelStyle");
    if (!sourcePlan) return res.status(404).json({ message: "Travel plan not found" });
    if (sourcePlan.userId._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only match from your own travel plan" });
    }

    const candidates = await TravelPlan.find({
      _id: { $ne: sourcePlan._id },
      userId: { $ne: req.user._id },
      endDate: { $gte: sourcePlan.startDate },
      startDate: { $lte: sourcePlan.endDate },
    })
      .populate("userId", "name email profilePicture bio interests travelStyle")
      .limit(60);

    const matches = candidates
      .map((candidatePlan) => {
        const result = matchScoreForPlans(sourcePlan, candidatePlan);
        return {
          matchScore: result.score,
          reasons: result.reasons,
          sharedInterests: result.sharedInterests,
          overlappingDays: result.overlappingDays,
          travelPlan: candidatePlan,
          traveler: candidatePlan.userId,
        };
      })
      .filter((item) => item.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 12);

    return res.json({ sourcePlan, matches });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to generate buddy matches" });
  }
};

exports.createBuddyRequest = async (req, res) => {
  try {
    const { receiverId, travelPlanId, senderPlanId } = req.body || {};
    if (!receiverId || !travelPlanId) {
      return res.status(400).json({ message: "receiverId and travelPlanId are required" });
    }
    if (!isValidObjectId(receiverId) || !isValidObjectId(travelPlanId) || (senderPlanId && !isValidObjectId(senderPlanId))) {
      return res.status(400).json({ message: "Invalid request payload" });
    }
    if (receiverId === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot send a buddy request to yourself" });
    }

    const [receiver, receiverPlan] = await Promise.all([
      User.findById(receiverId).select("_id name email"),
      TravelPlan.findById(travelPlanId).select("_id userId"),
    ]);
    if (!receiver || !receiverPlan) return res.status(404).json({ message: "Receiver or travel plan not found" });
    if (receiverPlan.userId.toString() !== receiverId) {
      return res.status(400).json({ message: "The selected travel plan does not belong to the receiver" });
    }

    let linkedSenderPlan = null;
    if (senderPlanId) {
      linkedSenderPlan = await TravelPlan.findById(senderPlanId).select("_id userId");
      if (!linkedSenderPlan || linkedSenderPlan.userId.toString() !== req.user._id.toString()) {
        return res.status(400).json({ message: "Sender travel plan is invalid" });
      }
    }

    const buddyRequest = await BuddyRequest.create({
      senderId: req.user._id,
      receiverId,
      travelPlanId,
      senderPlanId: linkedSenderPlan?._id || null,
      receiverPlanId: receiverPlan._id,
      status: "pending",
    });

    const populated = await BuddyRequest.findById(buddyRequest._id)
      .populate("senderId", "name email profilePicture")
      .populate("receiverId", "name email profilePicture")
      .populate("travelPlanId");

    return res.status(201).json({ message: "Buddy request sent", buddyRequest: populated });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "An active buddy request already exists for this plan" });
    }
    console.error(err);
    return res.status(500).json({ message: "Failed to send buddy request" });
  }
};

const updateBuddyRequestStatus = async ({ req, res, nextStatus }) => {
  try {
    const { requestId } = req.body || {};
    if (!requestId || !isValidObjectId(requestId)) return res.status(400).json({ message: "Valid requestId is required" });
    const buddyRequest = await BuddyRequest.findById(requestId);
    if (!buddyRequest) return res.status(404).json({ message: "Buddy request not found" });
    if (buddyRequest.receiverId.toString() !== req.user._id.toString() && buddyRequest.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You cannot update this buddy request" });
    }
    if (buddyRequest.status !== "pending") {
      return res.status(409).json({ message: "This buddy request has already been processed" });
    }

    buddyRequest.status = nextStatus;
    await buddyRequest.save();

    let chatRoom = null;
    if (nextStatus === "accepted") {
      chatRoom = await ChatRoom.findOne({ buddyRequestId: buddyRequest._id });
      if (!chatRoom) {
        chatRoom = await ChatRoom.create({
          participants: [buddyRequest.senderId, buddyRequest.receiverId],
          travelPlanId: buddyRequest.travelPlanId,
          buddyRequestId: buddyRequest._id,
        });
      }
    }

    const populated = await BuddyRequest.findById(buddyRequest._id)
      .populate("senderId", "name email profilePicture")
      .populate("receiverId", "name email profilePicture")
      .populate("travelPlanId");

    return res.json({ message: `Buddy request ${nextStatus}`, buddyRequest: populated, chatRoom });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to update buddy request" });
  }
};

exports.acceptBuddyRequest = (req, res) => updateBuddyRequestStatus({ req, res, nextStatus: "accepted" });
exports.rejectBuddyRequest = (req, res) => updateBuddyRequestStatus({ req, res, nextStatus: "rejected" });

exports.cancelBuddyRequest = async (req, res) => {
  try {
    const { requestId } = req.body || {};
    if (!requestId || !isValidObjectId(requestId)) return res.status(400).json({ message: "Valid requestId is required" });
    const buddyRequest = await BuddyRequest.findById(requestId);
    if (!buddyRequest) return res.status(404).json({ message: "Buddy request not found" });
    if (buddyRequest.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the sender can cancel this request" });
    }
    if (buddyRequest.status !== "pending") {
      return res.status(409).json({ message: "Only pending requests can be cancelled" });
    }
    buddyRequest.status = "cancelled";
    await buddyRequest.save();
    return res.json({ message: "Buddy request cancelled", buddyRequest });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to cancel buddy request" });
  }
};

exports.getBuddyRequests = async (req, res) => {
  try {
    const buddyRequests = await BuddyRequest.find({
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "name email profilePicture")
      .populate("receiverId", "name email profilePicture")
      .populate("travelPlanId")
      .populate("senderPlanId")
      .populate("receiverPlanId");

    const chatRooms = await ChatRoom.find({ participants: req.user._id })
      .populate("participants", "name email profilePicture")
      .populate("travelPlanId", "destination startDate endDate")
      .populate("buddyRequestId");
    return res.json({ buddyRequests, chatRooms });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch buddy requests" });
  }
};
