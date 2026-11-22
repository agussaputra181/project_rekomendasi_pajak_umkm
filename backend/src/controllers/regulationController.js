// Pustaka regulasi: pencarian teks, filter, urut, pagination (SRS FR-015) + CRUD Admin (FR-017).
const mongoose = require("mongoose");
const Regulation = require("../models/Regulation");
const TaxRule = require("../models/TaxRule");
const AdviceRule = require("../models/AdviceRule");
const Article = require("../models/Article");
const httpError = require("../utils/httpError");
const pick = require("../utils/pick");
const { sendSuccess, getPagination, buildPagination } = require("../utils/response");

const FIELDS = ["number", "title", "type", "effectiveDate", "status", "summaryPlain", "affectedTaxTypes", "region", "sourceUrl", "replacedBy", "tags"];
const SORTS = { effectiveDate: { effectiveDate: 1 }, "-effectiveDate": { effectiveDate: -1 }, title: { title: 1 }, "-title": { title: -1 } };

async function findRegulation(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Regulasi tidak ditemukan");
  const regulation = await Regulation.findById(id).populate("replacedBy", "number title");
  if (!regulation) throw httpError(404, "Regulasi tidak ditemukan");
  return regulation;
}

// GET /api/v1/regulations?q=&taxType=&status=&type=&sort=-effectiveDate&page=1&limit=10
async function listRegulations(req, res) {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) filter.$text = { $search: q };
  if (req.query.taxType) filter.affectedTaxTypes = String(req.query.taxType);
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.type) filter.type = String(req.query.type);
  if (req.query.region) filter.region = String(req.query.region);

  // Urutan: pilihan pengguna; jika mencari teks tanpa sort, urutkan menurut relevansi
  const sortKey = String(req.query.sort || "");
  let sort = SORTS[sortKey];
  let projection = {};
  if (!sort && q) {
    projection = { score: { $meta: "textScore" } };
    sort = { score: { $meta: "textScore" } };
  }
  sort = sort || { effectiveDate: -1 };

  const [items, total] = await Promise.all([
    Regulation.find(filter, projection).sort(sort).skip(skip).limit(limit).populate("replacedBy", "number title"),
    Regulation.countDocuments(filter),
  ]);
  sendSuccess(res, { message: "Daftar regulasi", data: items, pagination: buildPagination(page, limit, total) });
}

// GET /api/v1/regulations/:id
async function getRegulation(req, res) {
  sendSuccess(res, { message: "Detail regulasi", data: await findRegulation(req.params.id) });
}

// POST /api/v1/regulations
async function createRegulation(req, res) {
  const regulation = await Regulation.create(pick(req.body, FIELDS));
  sendSuccess(res, { statusCode: 201, message: "Regulasi ditambahkan", data: regulation });
}

// PUT /api/v1/regulations/:id
async function updateRegulation(req, res) {
  const regulation = await findRegulation(req.params.id);
  const data = pick(req.body, FIELDS);
  if (data.replacedBy === "") data.replacedBy = null;
  regulation.set(data);
  await regulation.save();
  sendSuccess(res, { message: "Regulasi diperbarui", data: regulation });
}

// DELETE /api/v1/regulations/:id  -> 409 jika masih dirujuk aturan atau artikel
async function deleteRegulation(req, res) {
  const regulation = await findRegulation(req.params.id);
  const id = regulation._id;
  const [taxRules, adviceRules, articles, replaced] = await Promise.all([
    TaxRule.countDocuments({ regulationId: id }),
    AdviceRule.countDocuments({ regulationIds: id }),
    Article.countDocuments({ regulationIds: id }),
    Regulation.countDocuments({ replacedBy: id }),
  ]);
  if (taxRules + adviceRules + articles + replaced > 0) {
    throw httpError(409, "Regulasi masih dirujuk aturan tarif, aturan saran, artikel, atau regulasi lain. Ubah statusnya menjadi dicabut.", [
      { field: "references", message: `${taxRules} aturan tarif, ${adviceRules} aturan saran, ${articles} artikel, ${replaced} regulasi` },
    ]);
  }
  await regulation.deleteOne();
  sendSuccess(res, { message: "Regulasi dihapus" });
}

module.exports = { listRegulations, getRegulation, createRegulation, updateRegulation, deleteRegulation };
