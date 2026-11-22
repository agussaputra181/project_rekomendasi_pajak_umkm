// Aturan tarif berversi (SRS FR-017): buat versi baru (draf), ubah draf, nonaktifkan,
// dan aktivasi yang didahului uji regresi (422 bila gagal, TC-API-15).
const mongoose = require("mongoose");
const TaxRule = require("../models/TaxRule");
const httpError = require("../utils/httpError");
const pick = require("../utils/pick");
const { sendSuccess } = require("../utils/response");
const { runRegression } = require("../services/regressionService");
const { notifyRuleUpdate } = require("../services/notificationService");

const FIELDS = ["parameters", "base", "mechanism", "dueRule", "effectiveFrom", "regulationId", "note"];

// Parameter boleh dikirim sebagai objek JSON atau teks JSON
function readParameters(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw httpError(400, "Parameter harus berupa JSON yang valid", [{ field: "parameters", message: "Format JSON salah" }]);
  }
}

async function findRule(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Aturan tarif tidak ditemukan");
  const rule = await TaxRule.findById(id);
  if (!rule) throw httpError(404, "Aturan tarif tidak ditemukan");
  return rule;
}

// GET /api/v1/tax-rules?taxType=PPH_FINAL_UMKM
async function listTaxRules(req, res) {
  const filter = req.query.taxType ? { taxType: String(req.query.taxType) } : {};
  const rules = await TaxRule.find(filter).populate("regulationId", "number title").sort({ taxType: 1, version: -1 });
  sendSuccess(res, { message: "Daftar aturan tarif", data: rules });
}

// POST /api/v1/tax-rules  -> versi baru (belum aktif)
async function createTaxRule(req, res) {
  const { taxType } = req.body;
  const last = await TaxRule.findOne({ taxType }).sort({ version: -1 });
  const data = pick(req.body, FIELDS);
  if (data.parameters !== undefined) data.parameters = readParameters(data.parameters);
  const rule = await TaxRule.create({
    ...data,
    parameters: data.parameters ?? (last ? last.parameters : undefined),
    taxType,
    version: last ? last.version + 1 : 1,
    isActive: false,
  });
  sendSuccess(res, { statusCode: 201, message: `Versi ${rule.version} dibuat sebagai draf`, data: rule });
}

// PUT /api/v1/tax-rules/:id  -> ubah draf, atau { isActive: false } untuk menonaktifkan versi aktif
async function updateTaxRule(req, res) {
  const rule = await findRule(req.params.id);
  if (rule.isActive) {
    if (req.body.isActive === false) {
      rule.isActive = false;
      rule.effectiveTo = new Date();
      await rule.save();
      return sendSuccess(res, { message: "Versi dinonaktifkan. Sistem memakai nilai bawaan sampai ada versi aktif lain.", data: rule });
    }
    throw httpError(400, "Versi aktif tidak bisa diubah. Buat versi baru, lalu aktifkan.");
  }
  const data = pick(req.body, FIELDS);
  if (data.parameters !== undefined) data.parameters = readParameters(data.parameters);
  rule.set(data);
  await rule.save();
  sendSuccess(res, { message: "Draf aturan diperbarui", data: rule });
}

// POST /api/v1/tax-rules/:id/test  -> uji regresi tanpa mengaktifkan
async function testTaxRule(req, res) {
  const rule = await findRule(req.params.id);
  sendSuccess(res, { message: "Hasil uji regresi", data: runRegression(rule.taxType, rule.parameters) });
}

// POST /api/v1/tax-rules/:id/activate
async function activateTaxRule(req, res) {
  const rule = await findRule(req.params.id);
  const regression = runRegression(rule.taxType, rule.parameters);
  if (!regression.passed) {
    const failed = regression.results.filter((r) => !r.passed);
    throw httpError(422, "Uji regresi gagal, versi tidak diaktifkan", failed.map((r) => ({ field: r.id, message: `Harapan ${r.expected}, hasil ${r.actual}` })));
  }
  await TaxRule.updateMany({ taxType: rule.taxType, isActive: true, _id: { $ne: rule._id } }, { isActive: false, effectiveTo: rule.effectiveFrom });
  rule.isActive = true;
  rule.effectiveTo = null;
  await rule.save();
  await notifyRuleUpdate(rule.taxType, rule.version);
  sendSuccess(res, { message: `Versi ${rule.version} aktif`, data: { rule, regression } });
}

module.exports = { listTaxRules, createTaxRule, updateTaxRule, testTaxRule, activateTaxRule };
