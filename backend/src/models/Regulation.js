// Collection "regulations": pustaka regulasi (SRS Tabel 21).
const mongoose = require("mongoose");
const { REGULATION_TYPES, REGULATION_STATUSES } = require("../constants/enums");

const regulationSchema = new mongoose.Schema(
  {
    number: { type: String, required: [true, "Nomor regulasi wajib diisi"], unique: true, trim: true }, // "PP 20/2026"
    title: { type: String, required: [true, "Judul wajib diisi"], trim: true },
    type: { type: String, enum: REGULATION_TYPES, required: [true, "Jenis regulasi wajib dipilih"] },
    effectiveDate: { type: Date },
    status: { type: String, enum: REGULATION_STATUSES, default: "berlaku" },
    summaryPlain: { type: String, maxlength: [1000, "Ringkasan maksimal 1.000 karakter"] },
    affectedTaxTypes: [{ type: String, trim: true }], // jenis pajak terdampak, misalnya "PPh Final"
    region: { type: String, trim: true }, // diisi untuk perda
    sourceUrl: { type: String, trim: true },
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Regulation", default: null },
    tags: [{ type: String, trim: true, lowercase: true }],
  },
  { timestamps: true }
);

// Text index untuk pencarian, dan index untuk filter/urut (SRS Tabel 26)
regulationSchema.index({ title: "text", summaryPlain: "text", tags: "text", number: "text" }, { default_language: "none" });
regulationSchema.index({ status: 1, effectiveDate: -1 });

module.exports = mongoose.model("Regulation", regulationSchema);
