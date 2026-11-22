// Notifikasi pengguna (SRS FR-014).
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const httpError = require("../utils/httpError");
const { sendSuccess, getPagination, buildPagination } = require("../utils/response");
const { ensureDeadlineNotifications } = require("../services/notificationService");

// GET /api/v1/notifications?unread=true&page=&limit=
async function listNotifications(req, res) {
  await ensureDeadlineNotifications(req.user); // buat pengingat H-3 / hari H / terlewat bila perlu
  const { page, limit, skip } = getPagination(req.query, 20);
  const filter = { userId: req.user._id };
  if (req.query.unread === "true") filter.isRead = false;
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);
  sendSuccess(res, { message: "Notifikasi", data: { items, unread }, pagination: buildPagination(page, limit, total) });
}

// PATCH /api/v1/notifications/:id/read
async function markRead(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, "Notifikasi tidak ditemukan");
  const notification = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
  if (!notification) throw httpError(404, "Notifikasi tidak ditemukan");
  notification.isRead = true;
  await notification.save();
  sendSuccess(res, { message: "Notifikasi ditandai dibaca", data: notification });
}

// PATCH /api/v1/notifications/read-all
async function markAllRead(req, res) {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  sendSuccess(res, { message: "Semua notifikasi ditandai dibaca" });
}

module.exports = { listNotifications, markRead, markAllRead };
