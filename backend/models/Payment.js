const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["khalti"], required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NPR", trim: true },
    gatewayRef: { type: String, trim: true, index: true },
    status: {
      type: String,
      enum: ["initiated", "success", "failed", "refunded"],
      default: "initiated",
      index: true,
    },
    rawRequest: { type: mongoose.Schema.Types.Mixed, default: {} },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);
