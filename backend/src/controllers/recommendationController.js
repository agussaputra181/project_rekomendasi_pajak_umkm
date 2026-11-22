// Rekomendasi pajak & checklist saran (SRS FR-006, FR-007).
const mongoose = require("mongoose");
const Recommendation = require("../models/Recommendation");
const httpError = require("../utils/httpError");
const findOwnedBusiness = require("../utils/findOwnedBusiness");
const { sendSuccess } = require("../utils/response");
const { generateRecommendation, getLatestRecommendation } = require("../services/recommendationService");

// POST /api/v1/businesses/:id/recommendations/generate
async function generate(req, res) {
  const business = await findOwnedBusiness(req.params.id, req.user, { write: true });
  const created = await generateRecommendation(business);
  const recommendation = await Recommendation.findById(created._id).populate("items.regulationIds", "number title status");
  sendSuccess(res, { statusCode: 201, message: "Rekomendasi dibuat ulang", data: recommendation });
}

// GET /api/v1/businesses/:id/recommendations/latest  (pemilik/pendamping/admin)
async function getLatest(req, res) {
  const business = await findOwnedBusiness(req.params.id, req.user);
  const recommendation = await getLatestRecommendation(business);
  sendSuccess(res, { message: "Rekomendasi terbaru", data: recommendation });
}

// PATCH /api/v1/recommendations/:id/actions/:actionId   body: { done: true }
async function toggleAction(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, "Rekomendasi tidak ditemukan");
  const recommendation = await Recommendation.findById(req.params.id);
  if (!recommendation) throw httpError(404, "Rekomendasi tidak ditemukan");
  await findOwnedBusiness(recommendation.businessId, req.user, { write: true });

  // Cari langkah saran di semua item (actions adalah sub-dokumen di dalam items)
  let action = null;
  for (const item of recommendation.items) {
    action = item.actions.id(req.params.actionId) || action;
  }
  if (!action) throw httpError(404, "Langkah saran tidak ditemukan");
  const done = req.body.done === undefined ? !action.done : Boolean(req.body.done);
  action.done = done;
  action.doneAt = done ? new Date() : null;
  await recommendation.save();
  await recommendation.populate("items.regulationIds", "number title status");
  sendSuccess(res, { message: done ? "Langkah ditandai selesai" : "Tanda selesai dibatalkan", data: recommendation });
}

module.exports = { generate, getLatest, toggleAction };
