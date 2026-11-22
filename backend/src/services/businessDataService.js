// Mengumpulkan data yang dibutuhkan rule engine, kalender, dan dashboard untuk satu usaha.
const mongoose = require("mongoose");
const Revenue = require("../models/Revenue");
const Business = require("../models/Business");
const Employee = require("../models/Employee");
const { toNumber } = require("../utils/money");
const { getActiveRules, getHolidays } = require("./ruleService");
const { buildContext } = require("./ruleEngine");

// Omzet satu tahun memakai aggregation pipeline MongoDB: total per bulan
async function getYearRevenue(businessId, year) {
  const rows = await Revenue.aggregate([
    { $match: { businessId: new mongoose.Types.ObjectId(String(businessId)), year } },
    { $group: { _id: "$month", amount: { $sum: { $toDouble: "$amount" } }, pph22: { $sum: { $toDouble: "$pph22Collected" } } } },
    { $sort: { _id: 1 } },
  ]);
  const monthly = {};
  let total = 0;
  for (const row of rows) {
    monthly[row._id] = row.amount;
    total += row.amount;
  }
  return { monthly, total, rows };
}

// Omzet setahun usaha OP/PT Perorangan LAIN milik pengguna yang sama (penggabungan omzet PP 20/2026)
async function getOtherOwnRevenue(business, year) {
  if (!["OP", "PT_PERORANGAN"].includes(business.entityType)) return 0;
  const others = await Business.find({ userId: business.userId, _id: { $ne: business._id }, entityType: { $in: ["OP", "PT_PERORANGAN"] } });
  let sum = 0;
  for (const other of others) {
    const { total } = await getYearRevenue(other._id, year);
    sum += Math.max(total, toNumber(other.estimatedAnnualRevenue));
  }
  return sum;
}

// Semua parameter aktif yang dipakai layanan lain, digabung dengan aturan jatuh temponya
async function getParams() {
  const rules = await getActiveRules(["PPH_FINAL_UMKM", "PPH_BADAN", "PPH21_TER", "PPH21_PASAL17", "PTKP", "PPN"]);
  const merge = (r) => ({ ...r.parameters, ...(r.dueRule || {}) });
  return {
    rules,
    final: merge(rules.PPH_FINAL_UMKM),
    badan: merge(rules.PPH_BADAN),
    pph21: merge(rules.PPH21_TER),
    ter: rules.PPH21_TER.parameters,
    pasal17: merge(rules.PPH21_PASAL17),
    ptkp: rules.PTKP.parameters,
    ppn: merge(rules.PPN),
  };
}

async function getBusinessContext(business, year = new Date().getFullYear()) {
  const [revenue, otherOwnRevenue, params, holidays] = await Promise.all([
    getYearRevenue(business._id, year),
    getOtherOwnRevenue(business, year),
    getParams(),
    getHolidays(),
  ]);
  const ctx = buildContext(business, { revenueTotal: revenue.total, otherOwnRevenue, finalParams: params.final, ppnParams: params.ppn, year });
  return { ctx, revenue, params, holidays, year };
}

async function getActiveEmployees(businessId) {
  return Employee.find({ businessId, isActive: true }).sort({ name: 1 });
}

module.exports = { getYearRevenue, getOtherOwnRevenue, getParams, getBusinessContext, getActiveEmployees };
