// Collection "notifications": pengingat jatuh tempo & peringatan batas (SRS Tabel 20).
const mongoose = require("mongoose");
const { NOTIFICATION_TYPES } = require("../constants/enums");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business" },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    message: { type: String },
    dueDate: { type: Date },
    isRead: { type: Boolean, default: false },
    key: { type: String }, // penanda unik agar pemberitahuan yang sama tidak dibuat dua kali
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, dueDate: 1 });
notificationSchema.index({ userId: 1, key: 1 }, { unique: true, partialFilterExpression: { key: { $type: "string" } } });

module.exports = mongoose.model("Notification", notificationSchema);
