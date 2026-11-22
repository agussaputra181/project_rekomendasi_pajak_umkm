// Ringkasan statistik dengan aggregation pipeline MongoDB (SRS FR-018, FR-019).
const Business = require("../models/Business");
const User = require("../models/User");
const Revenue = require("../models/Revenue");
const Recommendation = require("../models/Recommendation");
const { calcPphFinal } = require("./taxCalculator");
const { buildDeadlines, nextDeadline } = require("./calendarService");
const { getBusinessContext, getParams } = require("./businessDataService");
const { getLatestRecommendation, obligationsOf } = require("./recommendationService");
const { isEligibleForFinal } = require("./ruleEngine");

const MAIN_SCHEMES = { PPH_FINAL: "PPh Final 0,5%", PPH_BADAN: "PPh Badan tarif umum", PPH_OP: "PPh orang pribadi skema umum" };

async function umkmDashboard(business, year = new Date().getFullYear()) {
  const { ctx, revenue, params, holidays } = await getBusinessContext(business, year);
  const recommendation = await getLatestRecommendation(business);

  // Grafik omzet & estimasi PPh Final per bulan
  const finalEligible = isEligibleForFinal(ctx);
  let cumulative = 0;
  const months = [];
  for (let month = 1; month <= 12; month++) {
    const amount = revenue.monthly[month];
    const row = revenue.rows.find((r) => r._id === month);
    let estimatedTax = null;
    if (amount !== undefined && finalEligible) {
      estimatedTax = calcPphFinal({ monthRevenue: amount, cumulativeBefore: cumulative, isOP: ctx.entityType === "OP", pph22Collected: row ? row.pph22 : 0 }, params.final).payable;
    }
    months.push({ month, amount: amount ?? null, estimatedTax });
    cumulative += amount || 0;
  }

  // Status skema pajak utama
  const mainItem = recommendation.items.find((i) => i.applicable && MAIN_SCHEMES[i.taxType]);
  const notYetDue = recommendation.items.find((i) => i.code === "R-02");
  const scheme = mainItem
    ? { taxType: mainItem.taxType, label: MAIN_SCHEMES[mainItem.taxType], note: notYetDue ? "Belum terutang sampai omzet melewati batas bebas" : null }
    : { taxType: null, label: "Belum dapat ditentukan", note: "Lengkapi profil usaha" };

  // Progres menuju batas
  const thresholds = [];
  if (ctx.entityType === "OP") {
    thresholds.push({ key: "opExemption", label: "Batas omzet bebas orang pribadi", value: ctx.cumulativeRevenue, limit: ctx.opExemption, percent: ctx.cumulativeRevenue / ctx.opExemption });
  }
  thresholds.push({ key: "ceiling", label: "Batas PPh Final / PKP", value: ctx.combinedRevenue, limit: ctx.ceiling, percent: ctx.combinedRevenue / ctx.ceiling });

  // Jatuh tempo terdekat
  const events = buildDeadlines(business, { year, monthlyRevenue: revenue.monthly, obligations: obligationsOf(recommendation.items), params, holidays });
  const next = nextDeadline(events);

  // Progres checklist saran
  const actions = recommendation.items.flatMap((i) => i.actions);
  const done = actions.filter((a) => a.done).length;

  const estimateItem = recommendation.items.find((i) => i.taxType === "PPH_FINAL" && i.applicable);
  return {
    business: { _id: business._id, businessName: business.businessName, entityType: business.entityType },
    year,
    scheme,
    revenue: { cumulative: ctx.cumulativeRevenue, combined: ctx.combinedRevenue, monthsRecorded: Object.keys(revenue.monthly).length, months },
    thresholds,
    estimatedTax: {
      latestMonth: months.filter((m) => m.amount !== null).slice(-1)[0] || null,
      pphFinal: estimateItem ? estimateItem.estimatedAmount : null,
      pph21: (recommendation.items.find((i) => i.taxType === "PPH21") || {}).estimatedAmount ?? null,
    },
    nextDeadline: next,
    upcomingDeadlines: events.filter((e) => e === next || (next && e.dueDate >= next.dueDate)).slice(0, 5), // mulai dari yang terdekat
    checklist: { done, total: actions.length, percent: actions.length ? done / actions.length : 0 },
    recommendationId: recommendation._id,
  };
}

// Daftar usaha yang boleh dilihat: admin semua, pendamping hanya binaannya
async function scopeBusinessIds(user) {
  if (user.role === "admin") return (await Business.find().select("_id")).map((b) => b._id);
  const binaan = await User.find({ pendampingId: user._id }).select("_id");
  return (await Business.find({ userId: { $in: binaan.map((u) => u._id) } }).select("_id")).map((b) => b._id);
}

async function monitoringDashboard(user, year = new Date().getFullYear()) {
  const ids = await scopeBusinessIds(user);
  const currentMonth = new Date().getMonth() + 1;

  const [byEntityType, byObligation, actionAgg, revenueAgg, businesses, latestRecs] = await Promise.all([
    Business.aggregate([{ $match: { _id: { $in: ids } } }, { $group: { _id: "$entityType", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Recommendation.aggregate([
      { $match: { businessId: { $in: ids }, isLatest: true } },
      { $unwind: "$items" },
      { $match: { "items.applicable": true } },
      { $group: { _id: "$items.taxType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Recommendation.aggregate([
      { $match: { businessId: { $in: ids }, isLatest: true } },
      { $unwind: "$items" },
      { $unwind: "$items.actions" },
      { $group: { _id: "$businessId", total: { $sum: 1 }, done: { $sum: { $cond: ["$items.actions.done", 1, 0] } } } },
    ]),
    Revenue.aggregate([
      { $match: { businessId: { $in: ids }, year } },
      { $group: { _id: "$businessId", total: { $sum: { $toDouble: "$amount" } }, lastMonth: { $max: "$month" } } },
    ]),
    Business.find({ _id: { $in: ids } }).populate("userId", "name email"),
    Recommendation.find({ businessId: { $in: ids }, isLatest: true }).select("businessId items.code"),
  ]);

  const actionMap = new Map(actionAgg.map((a) => [String(a._id), a]));
  const revenueMap = new Map(revenueAgg.map((r) => [String(r._id), r]));
  const codesMap = new Map(latestRecs.map((r) => [String(r.businessId), r.items.map((i) => i.code)]));
  const params = await getParams();
  const { opExemption, ceiling } = params.final;

  const rows = businesses.map((b) => {
    const rev = revenueMap.get(String(b._id)) || { total: 0, lastMonth: 0 };
    const act = actionMap.get(String(b._id)) || { total: 0, done: 0 };
    const limit = b.entityType === "OP" && rev.total <= opExemption ? opExemption : ceiling;
    const percent = rev.total / limit;
    const flags = [];
    if (percent >= 0.8 && percent <= 1) flags.push("mendekati_batas");
    if (percent > 1) flags.push("melewati_batas");
    if (currentMonth > 1 && (rev.lastMonth || 0) < currentMonth - 1) flags.push("belum_catat_omzet");
    return {
      businessId: b._id,
      businessName: b.businessName,
      entityType: b.entityType,
      owner: b.userId ? { name: b.userId.name, email: b.userId.email } : null,
      revenueTotal: rev.total,
      lastRecordedMonth: rev.lastMonth || null,
      limit,
      percentOfLimit: percent,
      actions: { done: act.done, total: act.total, percent: act.total ? act.done / act.total : 0 },
      ruleCodes: codesMap.get(String(b._id)) || [],
      flags,
    };
  });

  const totalActions = actionAgg.reduce((s, a) => s + a.total, 0);
  const doneActions = actionAgg.reduce((s, a) => s + a.done, 0);
  return {
    year,
    totals: { businesses: ids.length, atRisk: rows.filter((r) => r.flags.length).length },
    byEntityType: byEntityType.map((r) => ({ entityType: r._id, count: r.count })),
    byObligation: byObligation.map((r) => ({ taxType: r._id, count: r.count })),
    actionProgress: { done: doneActions, total: totalActions, percent: totalActions ? doneActions / totalActions : 0 },
    rows,
    risky: rows.filter((r) => r.flags.length),
  };
}

module.exports = { umkmDashboard, monitoringDashboard, scopeBusinessIds };
