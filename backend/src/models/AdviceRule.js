// Collection "advice_rules": aturan rekomendasi R-01 s.d. R-15 yang bisa diubah Admin (SRS Tabel 23).
const mongoose = require("mongoose");
const { CONDITION_OPERATORS } = require("../constants/enums");

const conditionSchema = new mongoose.Schema(
  {
    field: { type: String, required: true }, // data konteks, misalnya "entityType"
    operator: { type: String, enum: CONDITION_OPERATORS, required: true },
    value: { type: mongoose.Schema.Types.Mixed }, // angka, teks, boolean, daftar, atau "$namaKonteks"
  },
  { _id: false }
);

const adviceRuleSchema = new mongoose.Schema(
  {
    code: { type: String, required: [true, "Kode wajib diisi"], unique: true, trim: true, uppercase: true },
    name: { type: String, required: [true, "Nama aturan wajib diisi"], trim: true },
    conditions: { type: [conditionSchema], default: [] }, // semua kondisi digabung dengan AND
    taxType: { type: String, required: [true, "Jenis pajak wajib diisi"], trim: true },
    applicable: { type: Boolean, default: true },
    priority: { type: Number, default: 10 },
    explanation: { type: String, required: [true, "Penjelasan wajib diisi"] },
    actionSteps: [{ type: String, trim: true }],
    regulationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Regulation" }],
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

adviceRuleSchema.index({ isActive: 1, priority: 1 });

module.exports = mongoose.model("AdviceRule", adviceRuleSchema, "advice_rules");
