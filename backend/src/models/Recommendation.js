// Collection "recommendations": hasil rule engine + checklist saran (SRS Tabel 18).
// items dan actions di-embed karena selalu ditampilkan bersama (jumlahnya sedikit).
const mongoose = require("mongoose");
const { schemaOptions, toNumber } = require("../utils/money");

const actionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  done: { type: Boolean, default: false },
  doneAt: { type: Date, default: null },
});

const itemSchema = new mongoose.Schema(
  {
    adviceRuleId: { type: mongoose.Schema.Types.ObjectId, ref: "AdviceRule" },
    code: String, // salinan kode aturan, misalnya "R-01"
    name: String,
    taxType: String,
    applicable: Boolean, // true = pajak berlaku; false = penjelasan mengapa tidak berlaku
    priority: Number,
    reason: String, // penjelasan bahasa awam yang sudah diisi angka
    estimatedAmount: {
      type: mongoose.Schema.Types.Decimal128,
      default: null,
      get: (v) => (v === null || v === undefined ? null : toNumber(v)),
    },
    nextDueDate: { type: Date, default: null },
    regulationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Regulation" }],
    actions: [actionSchema],
  },
  { toJSON: { getters: true }, toObject: { getters: true }, id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    generatedAt: { type: Date, default: Date.now },
    ruleVersion: { type: String }, // contoh: "PPH_FINAL_UMKM v1; advice v1"
    profileSnapshot: { type: Object }, // ringkasan profil & omzet saat dibuat
    items: [itemSchema],
    isLatest: { type: Boolean, default: true },
  },
  schemaOptions
);

recommendationSchema.index({ businessId: 1, isLatest: 1 });

module.exports = mongoose.model("Recommendation", recommendationSchema);
