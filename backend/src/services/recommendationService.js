// Menjalankan rule engine untuk satu usaha lalu menyimpan hasilnya ke collection recommendations.
const AdviceRule = require("../models/AdviceRule");
const Recommendation = require("../models/Recommendation");
const Revenue = require("../models/Revenue");
const { DEFAULT_ADVICE_RULES } = require("../constants/defaultAdviceRules");
const { runRules } = require("./ruleEngine");
const { calcPphFinal, calcPph21 } = require("./taxCalculator");
const { buildDeadlines, nextDeadline } = require("./calendarService");
const { getBusinessContext, getActiveEmployees } = require("./businessDataService");
const { toNumber } = require("../utils/money");

async function loadAdviceRules() {
  const rules = await AdviceRule.find({ isActive: true });
  // Database belum di-seed: pakai nilai awal agar aplikasi tetap jalan
  return rules.length ? rules : DEFAULT_ADVICE_RULES.map((r) => ({ ...r, isActive: true, version: 0, regulationIds: [] }));
}

// Kode pajak yang berlaku (applicable) -> dipakai kalender
function obligationsOf(items) {
  return new Set(items.filter((i) => i.applicable).map((i) => i.taxType));
}

// Perkiraan nominal: PPh Final bulan terakhir yang tercatat, atau PPh 21 bulan ini
async function estimateAmount(taxType, { business, ctx, params, year }) {
  if (taxType === "PPH_FINAL") {
    const last = await Revenue.findOne({ businessId: business._id, year }).sort({ month: -1 });
    if (!last) return null;
    const earlier = await Revenue.find({ businessId: business._id, year, month: { $lt: last.month } });
    const cumulativeBefore = earlier.reduce((sum, r) => sum + toNumber(r.amount), 0);
    return calcPphFinal(
      { monthRevenue: toNumber(last.amount), cumulativeBefore, isOP: ctx.entityType === "OP", pph22Collected: toNumber(last.pph22Collected) },
      params.final
    ).payable;
  }
  if (taxType === "PPH21") {
    const employees = (await getActiveEmployees(business._id)).map((e) => e.toObject());
    if (!employees.length) return null;
    return calcPph21({ employees, month: new Date().getMonth() + 1 }, { ter: params.ter, pasal17: params.pasal17, ptkp: params.ptkp }).payable;
  }
  return null;
}

async function generateRecommendation(business, { year = new Date().getFullYear() } = {}) {
  const data = await getBusinessContext(business, year);
  const { ctx, params, holidays, revenue } = data;
  const adviceRules = await loadAdviceRules();
  const matched = runRules(adviceRules, ctx);

  const draftItems = matched.map(({ rule, reason }) => ({ rule, reason }));
  const obligations = obligationsOf(draftItems.map(({ rule }) => ({ applicable: rule.applicable, taxType: rule.taxType })));
  const events = buildDeadlines(business, { year, monthlyRevenue: revenue.monthly, obligations, params, holidays });

  // Status checklist lama dipertahankan bila teks langkahnya sama
  const previous = await Recommendation.findOne({ businessId: business._id, isLatest: true });
  const doneMap = new Map();
  if (previous) {
    for (const item of previous.items) for (const a of item.actions) if (a.done) doneMap.set(`${item.code}|${a.text}`, a.doneAt);
  }

  const items = [];
  for (const { rule, reason } of draftItems) {
    const next = rule.applicable ? nextDeadline(events, { taxType: rule.taxType }) : null; // jatuh tempo hanya untuk pajak yang berlaku
    items.push({
      adviceRuleId: rule._id || null,
      code: rule.code,
      name: rule.name,
      taxType: rule.taxType,
      applicable: rule.applicable,
      priority: rule.priority,
      reason,
      estimatedAmount: rule.applicable ? await estimateAmount(rule.taxType, { business, ctx, params, year }) : null,
      nextDueDate: next ? next.dueDate : null,
      regulationIds: rule.regulationIds || [],
      actions: (rule.actionSteps || []).map((text) => {
        const doneAt = doneMap.get(`${rule.code}|${text}`);
        return { text, done: Boolean(doneAt), doneAt: doneAt || null };
      }),
    });
  }

  const adviceVersion = Math.max(0, ...adviceRules.map((r) => r.version || 0));
  await Recommendation.updateMany({ businessId: business._id, isLatest: true }, { isLatest: false });
  return Recommendation.create({
    businessId: business._id,
    ruleVersion: `PPH_FINAL_UMKM v${params.rules.PPH_FINAL_UMKM.version}; advice_rules v${adviceVersion}`,
    profileSnapshot: {
      businessName: business.businessName,
      entityType: ctx.entityType,
      sector: ctx.sector,
      salesChannels: ctx.salesChannels,
      cumulativeRevenue: ctx.cumulativeRevenue,
      annualRevenue: ctx.annualRevenue,
      combinedRevenue: ctx.combinedRevenue,
      year,
    },
    items,
    isLatest: true,
  });
}

// Rekomendasi terbaru; dibuat otomatis bila belum ada
async function getLatestRecommendation(business) {
  const latest = await Recommendation.findOne({ businessId: business._id, isLatest: true }).populate("items.regulationIds", "number title status");
  if (latest) return latest;
  const created = await generateRecommendation(business);
  return Recommendation.findById(created._id).populate("items.regulationIds", "number title status");
}

module.exports = { generateRecommendation, getLatestRecommendation, obligationsOf };
