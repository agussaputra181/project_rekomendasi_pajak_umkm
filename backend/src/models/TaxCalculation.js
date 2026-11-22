// Collection "tax_calculations": riwayat perhitungan (SRS Tabel 19).
// input & result disimpan lengkap (snapshot) agar hasil lama tidak berubah walau aturan diperbarui.
const mongoose = require("mongoose");
const { CALCULATION_TYPES } = require("../constants/enums");

const taxCalculationSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    taxType: { type: String, enum: CALCULATION_TYPES, required: true },
    period: { year: Number, month: Number }, // month kosong untuk perhitungan tahunan
    input: { type: Object },
    result: { type: Object }, // { dpp, deduction, rate, taxDue, credit, payable, steps[] }
    taxRuleId: { type: mongoose.Schema.Types.ObjectId, ref: "TaxRule" },
  },
  { timestamps: true }
);

taxCalculationSchema.index({ businessId: 1, taxType: 1, "period.year": 1 });

// Argumen ketiga = nama collection persis seperti di SRS
module.exports = mongoose.model("TaxCalculation", taxCalculationSchema, "tax_calculations");
