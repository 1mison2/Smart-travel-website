const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["blog", "trip_post"],
      default: "blog",
      index: true,
    },
    title: { type: String, trim: true, maxlength: 180, default: "" },
    content: { type: String, required: true, trim: true, maxlength: 8000 },
    images: [{ type: String, trim: true }],
    destination: { type: String, trim: true, default: "", index: true },
    tags: [{ type: String, trim: true }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
