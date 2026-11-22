// Kalkulator pajak (SRS FR-009 s.d. FR-013) + riwayat (FR-020).
// Setiap perhitungan disimpan ke tax_calculations bersama versi aturan yang dipakai.
const Revenue = require("../models/Revenue");
const TaxCalculation = require("../models/TaxCalculation");
const httpError = require("../utils/httpError");
const findOwnedBusiness = require("../utils/findOwnedBusiness");
const { toNumber } = require("../utils/money");
const { sendSuccess, getPagination, buildPagination } = require("../utils/response");
const calc = require("../services/taxCalculator");
const { getBusinessContext, getActiveEmployees } = require("../services/businessDataService");
const { isEligibleForFinal } = require("../services/ruleEngine");

// Membaca angka dari body; kosong atau negatif -> 400
function readNumber(body, field, { required = true, defaultValue = 0 } = {}) {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === "") {
    if (required) throw httpError(400, "Data belum lengkap", [{ field, message: "Wajib diisi" }]);
    return defaultValue;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw httpError(400, "Data belum valid", [{ field, message: "Harus berupa angka 0 atau lebih" }]);
  return value;
}

function readPeriod(body, { monthRequired = true } = {}) {
  const year = Number(body.year) || new Date().getFullYear();
  const month = body.month === undefined || body.month === "" ? null : Number(body.month);
  if (monthRequired && !(month >= 1 && month <= 12)) throw httpError(400, "Bulan belum valid", [{ field: "month", message: "Pilih bulan 1-12" }]);
  return { year, month };
}

async function save(business, taxType, period, input, result, rule) {
  const versions = { ...(input.ruleVersions || {}) };
  return TaxCalculation.create({ businessId: business._id, taxType, period, input: { ...input, ruleVersions: versions }, result, taxRuleId: rule._id || undefined });
}

// POST /api/v1/calculations/pph-final   body: { businessId, year, month }
async function pphFinal(req, res) {
  const business = await findOwnedBusiness(req.body.businessId, req.user, { write: true });
  const period = readPeriod(req.body);
  const { ctx, params } = await getBusinessContext(business, period.year);
  if (!isEligibleForFinal(ctx)) {
    throw httpError(422, "Usaha ini tidak memenuhi syarat PPh Final 0,5%. Gunakan kalkulator skema umum (PPh Badan atau perbandingan skema).");
  }
  const current = await Revenue.findOne({ businessId: business._id, year: period.year, month: period.month });
  if (!current) throw httpError(404, "Omzet bulan ini belum dicatat. Catat dulu di menu Omzet.");
  const earlier = await Revenue.find({ businessId: business._id, year: period.year, month: { $lt: period.month } });
  const cumulativeBefore = earlier.reduce((sum, r) => sum + toNumber(r.amount), 0);
  const input = {
    monthRevenue: toNumber(current.amount),
    cumulativeBefore,
    isOP: business.entityType === "OP",
    pph22Collected: toNumber(current.pph22Collected),
    entityType: business.entityType,
    ruleVersions: { PPH_FINAL_UMKM: params.rules.PPH_FINAL_UMKM.version },
  };
  const result = calc.calcPphFinal(input, params.final);
  const saved = await save(business, "PPH_FINAL", period, input, result, params.rules.PPH_FINAL_UMKM);
  sendSuccess(res, { message: "Perhitungan PPh Final selesai", data: saved });
}

// POST /api/v1/calculations/pph-badan   body: { businessId, year, annualRevenue?, pkp, credits? }
async function pphBadan(req, res) {
  const business = await findOwnedBusiness(req.body.businessId, req.user, { write: true });
  if (business.entityType === "OP") throw httpError(422, "Orang pribadi tidak dikenai PPh Badan. Gunakan perbandingan skema.");
  const period = readPeriod(req.body, { monthRequired: false });
  const { ctx, params } = await getBusinessContext(business, period.year);
  const input = {
    annualRevenue: readNumber(req.body, "annualRevenue", { required: false, defaultValue: ctx.annualRevenue }),
    pkp: readNumber(req.body, "pkp"),
    credits: readNumber(req.body, "credits", { required: false }),
    ruleVersions: { PPH_BADAN: params.rules.PPH_BADAN.version },
  };
  const result = calc.calcPphBadan(input, params.badan);
  const saved = await save(business, "PPH_BADAN", { year: period.year }, input, result, params.rules.PPH_BADAN);
  sendSuccess(res, { message: "Perhitungan PPh Badan selesai", data: saved });
}

// POST /api/v1/calculations/pph21   body: { businessId, year, month }
async function pph21(req, res) {
  const business = await findOwnedBusiness(req.body.businessId, req.user, { write: true });
  const period = readPeriod(req.body);
  const employees = (await getActiveEmployees(business._id)).map((e) => e.toObject());
  if (!employees.length) throw httpError(400, "Belum ada karyawan aktif. Tambahkan di menu Karyawan.");
  const { params } = await getBusinessContext(business, period.year);
  const input = {
    month: period.month,
    employees: employees.map((e) => ({ name: e.name, ptkpStatus: e.ptkpStatus, employmentType: e.employmentType, monthlyGross: e.monthlyGross, pensionContribution: e.pensionContribution })),
    ruleVersions: { PPH21_TER: params.rules.PPH21_TER.version, PPH21_PASAL17: params.rules.PPH21_PASAL17.version, PTKP: params.rules.PTKP.version },
  };
  const result = calc.calcPph21(input, { ter: params.ter, pasal17: params.pasal17, ptkp: params.ptkp });
  const saved = await save(business, "PPH21", period, input, result, params.rules.PPH21_TER);
  sendSuccess(res, { message: "Perhitungan PPh 21 selesai", data: saved });
}

// POST /api/v1/calculations/compare-scheme   body: { businessId, year, annualRevenue?, netIncome, ptkpStatus? }
async function compareScheme(req, res) {
  const business = await findOwnedBusiness(req.body.businessId, req.user, { write: true });
  const period = readPeriod(req.body, { monthRequired: false });
  const { ctx, params } = await getBusinessContext(business, period.year);
  const input = {
    entityType: business.entityType,
    annualRevenue: readNumber(req.body, "annualRevenue", { required: false, defaultValue: ctx.annualRevenue }),
    netIncome: readNumber(req.body, "netIncome"),
    ptkpStatus: req.body.ptkpStatus || "TK/0",
    eligibleForFinal: isEligibleForFinal(ctx),
    ruleVersions: { PPH_FINAL_UMKM: params.rules.PPH_FINAL_UMKM.version, PPH_BADAN: params.rules.PPH_BADAN.version },
  };
  const result = calc.compareSchemes(input, { final: params.final, badan: params.badan, pasal17: params.pasal17, ptkp: params.ptkp });
  result.eligibleForFinal = input.eligibleForFinal;
  if (!input.eligibleForFinal) result.steps.push("Catatan: usaha ini tidak memenuhi syarat PPh Final, perbandingan hanya simulasi.");
  const saved = await save(business, "COMPARE", { year: period.year }, input, result, params.rules.PPH_FINAL_UMKM);
  sendSuccess(res, { message: "Perbandingan skema selesai", data: saved });
}

// POST /api/v1/calculations/ppn   body: { businessId, year, month, sales, isLuxury?, inputVat? }
async function ppn(req, res) {
  const business = await findOwnedBusiness(req.body.businessId, req.user, { write: true });
  const period = readPeriod(req.body);
  const { params } = await getBusinessContext(business, period.year);
  const input = {
    sales: readNumber(req.body, "sales"),
    isLuxury: Boolean(req.body.isLuxury),
    inputVat: readNumber(req.body, "inputVat", { required: false }),
    isPKP: business.isPKP,
    ruleVersions: { PPN: params.rules.PPN.version },
  };
  const result = calc.calcPpn(input, params.ppn);
  if (!business.isPKP) result.steps.push("Catatan: usaha belum PKP, hasil ini hanya simulasi.");
  const saved = await save(business, "PPN", period, input, result, params.rules.PPN);
  sendSuccess(res, { message: "Perhitungan PPN selesai", data: saved });
}

// GET /api/v1/businesses/:id/calculations?taxType=&year=&page=&limit=
async function history(req, res) {
  const business = await findOwnedBusiness(req.params.id, req.user);
  const { page, limit, skip } = getPagination(req.query);
  const filter = { businessId: business._id };
  if (req.query.taxType) filter.taxType = req.query.taxType;
  if (req.query.year) filter["period.year"] = Number(req.query.year);
  const [items, total] = await Promise.all([
    TaxCalculation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    TaxCalculation.countDocuments(filter),
  ]);
  sendSuccess(res, { message: "Riwayat perhitungan", data: items, pagination: buildPagination(page, limit, total) });
}

module.exports = { pphFinal, pphBadan, pph21, compareScheme, ppn, history };
