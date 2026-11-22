// Collection "articles": konten edukasi bahasa awam (SRS Tabel 24).
const mongoose = require("mongoose");
const { ARTICLE_CATEGORIES } = require("../constants/enums");

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Judul wajib diisi"], trim: true, maxlength: 200 },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    category: { type: String, enum: ARTICLE_CATEGORIES, default: "panduan" },
    content: { type: String, required: [true, "Isi artikel wajib diisi"] }, // sudah disanitasi middleware
    regulationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Regulation" }],
    tags: [{ type: String, trim: true, lowercase: true }],
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

articleSchema.index({ title: "text", content: "text", tags: "text" }, { default_language: "none" });

// Slug dibuat otomatis dari judul bila kosong
articleSchema.pre("validate", function () {
  if (!this.slug && this.title) this.slug = slugify(this.title);
});

module.exports = mongoose.model("Article", articleSchema);
module.exports.slugify = slugify;
