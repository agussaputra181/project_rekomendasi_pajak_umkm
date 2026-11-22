// Pencatatan omzet bulanan (SRS FR-004) + peringatan batas (FR-008).
const mongoose = require("mongoose");
const Revenue = require("../models/Revenue");
const httpError = require("../utils/httpError");
const findOwnedBusiness = require("../utils/findOwnedBusiness");
const pick = require("../utils/pick");
const { sendSuccess } = require("../utils/response");
const { generateRecommendation } = require("../services/recommendationService");
const { getBusinessContext } = require("../services/businessDataService");
const { notifyThresholds } = require("../services/notificationService");

// Setelah omzet berubah: perbarui rekomendasi, buat notifikasi batas, kembalikan ringkasan
async function afterChange(business, year) {
  const recommendation = await generateRecommendation(business, { year });
  const { ctx } = await getBusinessContext(business, year);
  await notifyThresholds(business, ctx);
  const warnings = recommendation.items.filter((i) => i.code === "R-15" || i.code === "R-05" || i.code === "R-11").map((i) => i.reason);
  return { cumulative: ctx.cumulativeRevenue, combined: ctx.combinedRevenue, warnings };
}

async function findRevenue(id, user) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Data omzet tidak ditemukan");
  const revenue = await Revenue.findById(id);
  if (!revenue) throw httpError(404, "Data omzet tidak ditemukan");
  const business = await findOwnedBusiness(revenue.businessId, user, { write: true });
  return { revenue, business };
}

// GET /api/v1/businesses/:id/revenues?year=2026
async function listRevenues(req, res) {
  const business = await findOwnedBusiness(req.params.id, req.user);
  const year = Number(req.query.year) || new Date().getFullYear();
  const revenues = await Revenue.find({ businessId: business._id, year }).sort({ month: 1 });
  const { ctx } = await getBusinessContext(business, year);
  sendSuccess(res, {
    message: "Daftar omzet",
    data: { year, revenues, cumulative: ctx.cumulativeRevenue, combined: ctx.combinedRevenue, limits: { opExemption: ctx.opExemption, ceiling: ctx.ceiling } },
  });
}

// POST /api/v1/businesses/:id/revenues
async function createRevenue(req, res) {
  const business = await findOwnedBusiness(req.params.id, req.user, { write: true });
  const revenue = await Revenue.create({ ...pick(req.body, ["year", "month", "amount", "channels", "pph22Collected", "note"]), businessId: business._id });
  const summary = await afterChange(business, revenue.year);
  sendSuccess(res, { statusCode: 201, message: "Omzet tersimpan", data: { revenue, ...summary } });
}

// PUT /api/v1/revenues/:id  (tahun & bulan tidak diubah)
async function updateRevenue(req, res) {
  const { revenue, business } = await findRevenue(req.params.id, req.user);
  revenue.set(pick(req.body, ["amount", "channels", "pph22Collected", "note"]));
  await revenue.save();
  const summary = await afterChange(business, revenue.year);
  sendSuccess(res, { message: "Omzet diperbarui", data: { revenue, ...summary } });
}

// DELETE /api/v1/revenues/:id
async function deleteRevenue(req, res) {
  const { revenue, business } = await findRevenue(req.params.id, req.user);
  await revenue.deleteOne();
  await afterChange(business, revenue.year);
  sendSuccess(res, { message: "Omzet dihapus" });
}

module.exports = { listRevenues, createRevenue, updateRevenue, deleteRevenue };
