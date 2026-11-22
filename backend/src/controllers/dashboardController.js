// Dashboard UMKM (SRS FR-018) dan dashboard monitoring pendamping/admin (FR-019).
const findOwnedBusiness = require("../utils/findOwnedBusiness");
const { sendSuccess } = require("../utils/response");
const { umkmDashboard, monitoringDashboard } = require("../services/dashboardService");

// GET /api/v1/dashboard/umkm/:businessId?year=
async function getUmkmDashboard(req, res) {
  const business = await findOwnedBusiness(req.params.businessId, req.user);
  const year = Number(req.query.year) || new Date().getFullYear();
  sendSuccess(res, { message: "Ringkasan usaha", data: await umkmDashboard(business, year) });
}

// GET /api/v1/dashboard/monitoring?year=
async function getMonitoringDashboard(req, res) {
  const year = Number(req.query.year) || new Date().getFullYear();
  sendSuccess(res, { message: "Ringkasan monitoring", data: await monitoringDashboard(req.user, year) });
}

module.exports = { getUmkmDashboard, getMonitoringDashboard };
