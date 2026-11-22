// src/controllers/articleController.js
// Konten edukasi: glosarium, panduan, FAQ (SRS FR-016) + kelola oleh Admin (FR-017).
const mongoose = require("mongoose");
const Article = require("../models/Article");
const httpError = require("../utils/httpError");
const pick = require("../utils/pick");
const { sendSuccess, getPagination, buildPagination } = require("../utils/response");

const FIELDS = ["title", "slug", "category", "content", "regulationIds", "tags", "isPublished"];
const isAdmin = (req) => req.user && req.user.role === "admin";

// GET /api/v1/articles?q=&category=&page=&limit=   (Admin dengan ?all=true melihat draf juga)
async function listArticles(req, res) {
  const { page, limit, skip } = getPagination(req.query, 12);
  const filter = {};
  if (!(isAdmin(req) && req.query.all === "true")) filter.isPublished = true;
  if (req.query.category) filter.category = String(req.query.category);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) filter.$text = { $search: q };
  const sort = q ? { score: { $meta: "textScore" } } : { category: 1, title: 1 };
  const projection = q ? { score: { $meta: "textScore" } } : {};
  const [items, total] = await Promise.all([
    Article.find(filter, projection).sort(sort).skip(skip).limit(limit).populate("regulationIds", "number title status"),
    Article.countDocuments(filter),
  ]);
  sendSuccess(res, { message: "Daftar artikel", data: items, pagination: buildPagination(page, limit, total) });
}

// GET /api/v1/articles/:slug
async function getArticle(req, res) {
  const filter = { slug: String(req.params.slug) };
  if (!isAdmin(req)) filter.isPublished = true;
  const article = await Article.findOne(filter).populate("regulationIds", "number title status sourceUrl");
  if (!article) throw httpError(404, "Artikel tidak ditemukan");
  sendSuccess(res, { message: "Detail artikel", data: article });
}

// POST /api/v1/articles
async function createArticle(req, res) {
  const article = await Article.create({ ...pick(req.body, FIELDS), authorId: req.user._id });
  sendSuccess(res, { statusCode: 201, message: "Artikel ditambahkan", data: article });
}

async function findArticle(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Artikel tidak ditemukan");
  const article = await Article.findById(id);
  if (!article) throw httpError(404, "Artikel tidak ditemukan");
  return article;
}

// PUT /api/v1/articles/:id
async function updateArticle(req, res) {
  const article = await findArticle(req.params.id);
  article.set(pick(req.body, FIELDS));
  await article.save();
  sendSuccess(res, { message: "Artikel diperbarui", data: article });
}

// DELETE /api/v1/articles/:id
async function deleteArticle(req, res) {
  const article = await findArticle(req.params.id);
  await article.deleteOne();
  sendSuccess(res, { message: "Artikel dihapus" });
}

module.exports = { listArticles, getArticle, createArticle, updateArticle, deleteArticle };
