// Membaca parameter pajak versi AKTIF dari collection tax_rules.
// Jika database masih kosong (belum di-seed), memakai nilai awal dari constants agar aplikasi tetap jalan.
const TaxRule = require("../models/TaxRule");
const { DEFAULT_TAX_RULES } = require("../constants/defaultTaxRules");

async function getActiveRule(taxType, date = new Date()) {
  const rule = await TaxRule.findOne({ taxType, isActive: true, effectiveFrom: { $lte: date } }).sort({ effectiveFrom: -1 });
  if (rule) {
    const data = rule.toObject(); // objek biasa agar mudah digabung (spread)
    return { _id: data._id, taxType, parameters: data.parameters, dueRule: data.dueRule || {}, version: data.version };
  }
  const fallback = DEFAULT_TAX_RULES.find((r) => r.taxType === taxType);
  return { _id: null, taxType, parameters: fallback.parameters, dueRule: fallback.dueRule || {}, version: 0 };
}

// Mengambil beberapa aturan sekaligus: getActiveRules(["PPH_FINAL_UMKM", "PPN"])
async function getActiveRules(taxTypes, date = new Date()) {
  const entries = await Promise.all(taxTypes.map(async (t) => [t, await getActiveRule(t, date)]));
  return Object.fromEntries(entries);
}

// Daftar hari libur sebagai Set berisi "YYYY-MM-DD"
async function getHolidays() {
  const rule = await getActiveRule("HARI_LIBUR");
  return new Set(rule.parameters.dates || []);
}

module.exports = { getActiveRule, getActiveRules, getHolidays };
