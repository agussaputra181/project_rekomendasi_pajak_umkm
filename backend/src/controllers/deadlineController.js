// Kalender jatuh tempo per usaha (SRS FR-014).
const findOwnedBusiness = require("../utils/findOwnedBusiness");
const { sendSuccess } = require("../utils/response");
const { buildDeadlines } = require("../services/calendarService");
const { getBusinessContext } = require("../services/businessDataService");
const { getLatestRecommendation, obligationsOf } = require("../services/recommendationService");

// GET /api/v1/businesses/:id/deadlines?year=2026
async function listDeadlines(req, res) {
  const business = await findOwnedBusiness(req.params.id, req.user);
  const year = Number(req.query.year) || new Date().getFullYear();
  const recommendation = await getLatestRecommendation(business);
  const { revenue, params, holidays } = await getBusinessContext(business, year);
  const events = buildDeadlines(business, { year, monthlyRevenue: revenue.monthly, obligations: obligationsOf(recommendation.items), params, holidays });
  sendSuccess(res, { message: "Kalender jatuh tempo", data: { year, events } });
}

module.exports = { listDeadlines };
