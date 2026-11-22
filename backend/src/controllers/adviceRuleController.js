// Aturan saran (advice_rules) yang dapat diubah Admin tanpa mengubah kode (SRS FR-017).
const mongoose = require("mongoose");
const AdviceRule = require("../models/AdviceRule");
const httpError = require("../utils/httpError");
const pick = require("../utils/pick");
const { sendSuccess } = require("../utils/response");
const { CONTEXT_FIELDS } = require("../services/ruleEngine");
const { CONDITION_OPERATORS } = require("../constants/enums");

const FIELDS = ["code", "name", "conditions", "taxType", "applicable", "priority", "explanation", "actionSteps", "regulationIds", "isActive"];
const ALLOWED_FIELDS = CONTEXT_FIELDS.map((f) => f.field);

// Kondisi hanya boleh memakai field konteks yang dikenal rule engine
function validateConditions(conditions) {
  if (conditions === undefined) return;
  if (!Array.isArray(conditions)) throw httpError(400, "Kondisi harus berupa daftar");
  const errors = [];
  conditions.forEach((c, i) => {
    if (!ALLOWED_FIELDS.includes(c.field)) errors.push({ field: `conditions.${i}.field`, message: `Field "${c.field}" tidak dikenal` });
    if (!CONDITION_OPERATORS.includes(c.operator)) errors.push({ field: `conditions.${i}.operator`, message: `Operator "${c.operator}" tidak dikenal` });
  });
  if (errors.length) throw httpError(400, "Kondisi aturan belum valid", errors);
}

async function findAdviceRule(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Aturan saran tidak ditemukan");
  const rule = await AdviceRule.findById(id);
  if (!rule) throw httpError(404, "Aturan saran tidak ditemukan");
  return rule;
}

// GET /api/v1/advice-rules  -> daftar aturan + katalog field & operator untuk form Admin
async function listAdviceRules(req, res) {
  const rules = await AdviceRule.find().populate("regulationIds", "number title").sort({ code: 1 });
  sendSuccess(res, { message: "Daftar aturan saran", data: { rules, catalog: { fields: CONTEXT_FIELDS, operators: CONDITION_OPERATORS } } });
}

// POST /api/v1/advice-rules
async function createAdviceRule(req, res) {
  validateConditions(req.body.conditions);
  const rule = await AdviceRule.create({ ...pick(req.body, FIELDS), version: 1 });
  sendSuccess(res, { statusCode: 201, message: "Aturan saran ditambahkan", data: rule });
}

// PUT /api/v1/advice-rules/:id  -> versi naik setiap perubahan
async function updateAdviceRule(req, res) {
  const rule = await findAdviceRule(req.params.id);
  validateConditions(req.body.conditions);
  rule.set(pick(req.body, FIELDS));
  rule.version = (rule.version || 1) + 1;
  await rule.save();
  sendSuccess(res, { message: "Aturan saran diperbarui", data: rule });
}

// DELETE /api/v1/advice-rules/:id  -> menonaktifkan (tidak menghapus, agar riwayat tetap terbaca)
async function deactivateAdviceRule(req, res) {
  const rule = await findAdviceRule(req.params.id);
  rule.isActive = false;
  await rule.save();
  sendSuccess(res, { message: "Aturan saran dinonaktifkan", data: rule });
}

module.exports = { listAdviceRules, createAdviceRule, updateAdviceRule, deactivateAdviceRule };
